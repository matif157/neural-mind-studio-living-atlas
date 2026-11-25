import { useEffect, useMemo, useState } from 'react';
import {
  Brain, BrainCircuit, Clock3, Eye, EyeOff, Focus, GitBranch, Grid2X2,
  LockKeyhole, Maximize2, Network, Pause, Play, RotateCcw, Search, ShieldCheck,
  Sparkles, Waypoints,
} from 'lucide-react';
import { NEURON_ANATOMY } from '@shared/taxonomy';
import {
  getNodeDimension, NODE_META, type MindDimensionId, type MindNodeKind,
} from '@shared/domain';
import { useMindStore } from '../store/mindStore';
import { useConversationStore } from '../store/conversationStore';
import {
  buildMind3DLayout, MIND3D_DIMENSION_VIEWS, MIND3D_LAYOUTS, MIND3D_VIEWS,
  type Mind3DLayoutMode, type Mind3DViewId, type Vec3Tuple,
} from '../utils/mind3dLayout';
import { isNodeDisplayable, isNodeMasked, sensitivityOf, type PrivacyView } from '../utils/privacy';
import { edgeVisualState } from '../lib/mind3d';
import Mind3DScene, {
  MIND3D_CAMERA_PRESETS, type Mind3DCameraPreset, type Mind3DMode,
  type SceneEdge, type SceneNode,
} from './three/Mind3DScene';
import EdgeLegend from './EdgeLegend';
import Inspector from './Inspector';

interface Mind3DWorkspaceProps {
  onOpen2D: () => void;
  onOpenCompanion: () => void;
}

interface TimelineCard {
  id: string;
  date: string;
  label: string;
  kind: string;
  masked: boolean;
}

const KIND_ORDER: MindNodeKind[] = [
  'emotion', 'thought', 'pattern', 'memory', 'belief', 'identity', 'need', 'goal', 'value',
  'behavior', 'body', 'situation', 'context', 'social', 'strength', 'coping', 'reflection',
  'exercise', 'knowledge', 'conversation', 'safety',
];

const ZERO: Vec3Tuple = [0, 0, 0];
const EARLIER_RELATIONS = new Set(['occurred before', 'may influence', 'arises from', 'recalls', 'context for', 'evidenced by']);
const GOAL_RELATIONS = new Set(['supports', 'supports goal', 'fulfills', 'leads to']);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

function sharedTag(a: { data: { tags?: string[] } }, b: { data: { tags?: string[] } }): boolean {
  const left = (a.data.tags ?? []).map((tag) => tag.toLowerCase());
  return (b.data.tags ?? []).some((tag) => left.includes(tag.toLowerCase()));
}

export default function Mind3DWorkspace({ onOpen2D, onOpenCompanion }: Mind3DWorkspaceProps) {
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const running = useMindStore((state) => state.simulationRunning);
  const setSimulationRunning = useMindStore((state) => state.setSimulationRunning);
  const setNodes = useMindStore((state) => state.setNodes);
  const setEdges = useMindStore((state) => state.setEdges);
  const setNodeSpatial = useMindStore((state) => state.setNodeSpatial);
  const sensitiveContentVisible = useMindStore((state) => state.sensitiveContentVisible);
  const setSensitiveContentVisible = useMindStore((state) => state.setSensitiveContentVisible);
  const hiddenKinds = useMindStore((state) => state.hiddenKinds);
  const privateMode = useConversationStore((state) => state.sensitivePrivateMode);
  const reducedMotion = usePrefersReducedMotion();

  const [mode, setMode] = useState<Mind3DMode>('mind');
  const [view, setView] = useState<Mind3DViewId>('all');
  const [layoutMode, setLayoutMode] = useState<Mind3DLayoutMode>('constellation');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<MindNodeKind[] | null>(null);
  const [dimensionFilter, setDimensionFilter] = useState<MindDimensionId | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [cameraKey, setCameraKey] = useState(0);
  const [neuronPart, setNeuronPart] = useState<string | null>('soma');
  const [notice, setNotice] = useState('');
  const [cameraPreset, setCameraPreset] = useState<Mind3DCameraPreset>('iso');
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | '7' | '30' | '90'>('all');

  const privacyView = useMemo<PrivacyView>(() => ({
    revealSensitive: sensitiveContentVisible,
    privateMode,
    hiddenKinds,
  }), [sensitiveContentVisible, privateMode, hiddenKinds]);

  const selectedNode = nodes.find((node) => node.selected) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const isMasked = (node: (typeof nodes)[number]) => isNodeMasked(node, privacyView);
  const dimensionOf = (node: (typeof nodes)[number]) => getNodeDimension({ kind: node.data.kind, dimension: node.data.dimension });

  // Restricted/hidden/private-mode records are removed before layout. Masked records keep a
  // placeholder shape, but their wording never enters search, labels or the inspector.
  const visibleNodes = useMemo(() => nodes.filter((node) => {
    if (!isNodeDisplayable(node, privacyView)) return false;
    if (kindFilter && !kindFilter.includes(node.data.kind)) return false;
    if (dimensionFilter && dimensionOf(node) !== dimensionFilter) return false;
    if (!normalizedQuery) return true;
    if (isNodeMasked(node, privacyView)) return false;
    return [node.data.label, node.data.description, node.data.kind, ...node.data.tags]
      .join(' ').toLowerCase().includes(normalizedQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [nodes, privacyView, kindFilter, dimensionFilter, normalizedQuery]);

  const layout = useMemo(() => buildMind3DLayout(visibleNodes, { mode: layoutMode }), [visibleNodes, layoutMode]);
  const activeNodeId = selectedNode && visibleNodes.some((node) => node.id === selectedNode.id) ? selectedNode.id : null;
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const maskedIds = useMemo(() => new Set(visibleNodes.filter(isMasked).map((node) => node.id)), [visibleNodes, privacyView]);
  const privacyEdges = useMemo(() => edges.filter((edge) => visibleIds.has(edge.source)
    && visibleIds.has(edge.target) && !maskedIds.has(edge.source) && !maskedIds.has(edge.target)),
  [edges, visibleIds, maskedIds]);

  const relatedIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeNodeId) {
      ids.add(activeNodeId);
      privacyEdges.forEach((edge) => {
        if (edge.source === activeNodeId) ids.add(edge.target);
        if (edge.target === activeNodeId) ids.add(edge.source);
      });
    }
    return ids;
  }, [activeNodeId, privacyEdges]);

  const selectNode = (target: (typeof nodes)[number]) => {
    if (isMasked(target)) {
      setNotice('This concept is private. Reveal private content to inspect its wording.');
      return;
    }
    setNodes(nodes.map((item) => ({ ...item, selected: item.id === target.id })));
    setEdges(edges.map((edge) => ({ ...edge, selected: false })));
    setNotice('');
  };

  const toggleExpand = (target: (typeof nodes)[number]) => {
    if (isMasked(target)) return;
    setNodes(nodes.map((item) => ({ ...item, selected: item.id === target.id })));
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(target.id)) next.delete(target.id);
      else next.add(target.id);
      return next;
    });
    setNotice(expandedIds.has(target.id)
      ? 'Neighbouring labels collapsed.'
      : 'Neighbouring labels expanded. Double-click again to collapse.');
  };

  const sceneNodes: SceneNode[] = useMemo(() => visibleNodes.map((node) => ({
    node: {
      ...node,
      data: maskedIds.has(node.id)
        ? { ...node.data, label: 'Private concept', description: '', tags: [], intensity: null }
        : node.data,
    },
    position: layout.get(node.id) ?? ZERO,
    masked: maskedIds.has(node.id),
    selected: Boolean(node.selected) && !maskedIds.has(node.id),
    dimmed: Boolean(activeNodeId && !relatedIds.has(node.id)),
    expanded: Boolean(activeNodeId && expandedIds.has(activeNodeId) && relatedIds.has(node.id)),
    animate: !reducedMotion,
    onSelect: selectNode,
    onToggleExpand: toggleExpand,
    onMove: (target, position) => setNodeSpatial(target.id, { x: position[0], y: position[1], z: position[2] }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [visibleNodes, layout, maskedIds, privacyView, activeNodeId, relatedIds, nodes, edges, expandedIds, reducedMotion]);

  const sceneEdges: SceneEdge[] = useMemo(() => privacyEdges.map((edge) => {
    const selected = Boolean(edge.selected);
    const active = Boolean(activeNodeId && (edge.source === activeNodeId || edge.target === activeNodeId));
    return {
      edge,
      source: layout.get(edge.source) ?? ZERO,
      target: layout.get(edge.target) ?? ZERO,
      active,
      selected,
      dimmed: Boolean(activeNodeId && !active && !selected),
      visualState: edgeVisualState(edge),
      running,
      onSelect: (target) => {
        setNodes(nodes.map((node) => ({ ...node, selected: false })));
        setEdges(edges.map((item) => ({ ...item, selected: item.id === target.id })));
      },
    };
  }), [privacyEdges, layout, activeNodeId, running, nodes, setNodes, setEdges]);

  const pathwayTargets = useMemo(() => {
    const active = visibleNodes.find((node) => node.id === activeNodeId);
    if (!active) return { earlier: null as string | null, goal: null as string | null };
    let earlier: string | null = null;
    let goal: string | null = null;
    for (const edge of privacyEdges) {
      const otherId = edge.source === active.id ? edge.target : edge.source;
      if (edge.source !== active.id && edge.target !== active.id) continue;
      const relation = edge.data?.relation ?? '';
      if (!earlier && EARLIER_RELATIONS.has(relation)) earlier = otherId;
      if (!goal && GOAL_RELATIONS.has(relation)) {
        const other = visibleNodes.find((node) => node.id === otherId);
        if (other && (other.data.kind === 'goal' || dimensionOf(other) === 'decisions')) goal = otherId;
      }
    }
    if (!earlier) {
      earlier = visibleNodes.find((node) => node.id !== active.id
        && node.data.temporalStatus === 'historical' && sharedTag(active, node))?.id ?? null;
    }
    if (!goal) {
      goal = visibleNodes.find((node) => node.id !== active.id
        && node.data.kind === 'goal' && sharedTag(active, node))?.id ?? null;
    }
    return { earlier, goal };
  }, [activeNodeId, privacyEdges, visibleNodes]);

  const selectedEdge = privacyEdges.find((edge) => edge.selected) ?? null;
  const restrictedCount = nodes.filter((node) => sensitivityOf(node) === 'restricted').length;
  const maskedCount = maskedIds.size;
  const timelineCards = useMemo<TimelineCard[]>(() => {
    const days = timeFilter === 'all' ? null : Number(timeFilter);
    const cutoff = days ? Date.now() - days * 86_400_000 : null;
    return visibleNodes
      .map((node) => {
        const parsed = node.data.createdAt ? Date.parse(node.data.createdAt) : Number.NaN;
        const date = Number.isFinite(parsed) ? new Date(parsed) : null;
        if (cutoff && (!date || date.getTime() < cutoff)) return null;
        const masked = maskedIds.has(node.id);
        return {
          id: node.id,
          date: date
            ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date).toUpperCase()
            : (node.data.timePeriod ?? 'UNDATED').toUpperCase().slice(0, 12),
          label: masked ? 'Sensitive entry' : node.data.label,
          kind: masked ? 'NODE' : (NODE_META[node.data.kind]?.label ?? 'NODE').toUpperCase(),
          masked,
        };
      })
      .filter((card): card is TimelineCard => Boolean(card))
      .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label))
      .slice(0, 16);
  }, [visibleNodes, maskedIds, timeFilter]);

  const applyCameraPreset = (preset: Mind3DCameraPreset) => {
    setCameraPreset(preset);
    window.dispatchEvent(new CustomEvent('mind3d:camera', { detail: preset }));
  };

  const togglePrivate = () => {
    if (sensitiveContentVisible) {
      setSensitiveContentVisible(false);
      setNotice('Private concept content is hidden again.');
    } else if (window.confirm('Reveal private and sensitive concept content across the 2D and 3D workspaces for this session? Make sure your screen is private.')) {
      setSensitiveContentVisible(true);
      setNotice('Private concept content is visible for this session only.');
    }
  };

  const applyView = (id: Mind3DViewId) => {
    setView(id);
    const config = MIND3D_VIEWS.find((item) => item.id === id);
    setKindFilter(config && config.kinds ? [...config.kinds] : null);
    setDimensionFilter(null);
    setMode('mind');
  };

  const applyDimension = (id: MindDimensionId) => {
    setDimensionFilter((current) => current === id ? null : id);
    setKindFilter(null);
    setView('all');
    setLayoutMode('dimension');
    setMode('mind');
  };

  const toggleKind = (kind: MindNodeKind) => {
    setView('all');
    setDimensionFilter(null);
    setMode('mind');
    setKindFilter((current) => {
      if (!current) return [kind];
      return current.includes(kind) ? (current.length === 1 ? null : current.filter((item) => item !== kind)) : [...current, kind];
    });
  };

  const focusPosition = (position: Vec3Tuple | undefined) => {
    if (position) window.dispatchEvent(new CustomEvent('mind3d:focus', { detail: position }));
  };
  const focusSelected = () => activeNodeId && focusPosition(layout.get(activeNodeId));
  const focusPathway = (id: string | null) => { if (id) focusPosition(layout.get(id)); };

  const onFullscreen = () => {
    const element = document.querySelector('.mind3d-scene-wrap');
    if (element && !document.fullscreenElement) void element.requestFullscreen?.();
    else if (document.fullscreenElement) void document.exitFullscreen?.();
  };

  const neuronInfo = NEURON_ANATOMY.find((item) => item.id === neuronPart) ?? NEURON_ANATOMY[0];

  return (
    <div className={`mind3d-workspace ${regionsOpen ? 'regions-open' : ''} ${detailsOpen ? 'details-open' : ''}`}>
      <aside className="mind3d-sidebar">
        <div className="mind3d-sidebar-kicker">MIND ATLAS / 3D SPACE</div>
        <div className="mind3d-sidebar-title"><BrainCircuit size={17} /> Explore the mind</div>

        <div className="mind3d-mode-switch" role="tablist" aria-label="3D visual system">
          <button role="tab" aria-selected={mode === 'mind'} className={mode === 'mind' ? 'active' : ''} onClick={() => setMode('mind')}><Network size={13} /> Mind</button>
          <button role="tab" aria-selected={mode === 'brain'} className={mode === 'brain' ? 'active' : ''} onClick={() => setMode('brain')}><Brain size={13} /> Brain</button>
          <button role="tab" aria-selected={mode === 'neuron'} className={mode === 'neuron' ? 'active' : ''} onClick={() => setMode('neuron')}><Waypoints size={13} /> Neuron</button>
        </div>

        {mode !== 'neuron' && (
          <>
            <label className="mind3d-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a concept…" aria-label="Search 3D mind atlas" /></label>

            <div className="mind3d-group-label">LAYOUT</div>
            <div className="mind3d-layout-list">
              {MIND3D_LAYOUTS.map((item) => (
                <button key={item.id} className={`mind3d-layout-button ${layoutMode === item.id ? 'is-active' : ''}`} onClick={() => setLayoutMode(item.id)} title={item.description}>
                  {item.id === 'timeline' ? <Clock3 size={13} /> : item.id === 'dimension' ? <Grid2X2 size={13} /> : <Network size={13} />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mind3d-group-label">TEN DIMENSIONS</div>
            <div className="mind3d-dimension-list">
              {MIND3D_DIMENSION_VIEWS.map((dimension) => (
                <button key={dimension.id}
                  className={`mind3d-dimension-button ${dimensionFilter === dimension.id ? 'is-active' : ''}`}
                  style={{ borderLeftColor: dimension.color }}
                  onClick={() => applyDimension(dimension.id)}
                  title={dimension.description}>
                  <i style={{ background: dimension.color }} /><span>{dimension.short}</span>
                </button>
              ))}
            </div>

            <div className="mind3d-group-label">VISUAL LAYERS</div>
            <div className="mind3d-view-list">
              {MIND3D_VIEWS.map((item) => (
                <button key={item.id} className={`mind3d-view-button ${view === item.id && !dimensionFilter ? 'is-active' : ''}`} onClick={() => applyView(item.id)}>
                  <span className="mind3d-view-dot" style={{ background: item.kinds ? NODE_META[item.kinds[0] as MindNodeKind].color : '#a5b4fc' }} />
                  <span>{item.label}</span>
                  {view === item.id && !dimensionFilter && <span className="mind3d-view-active" />}
                </button>
              ))}
            </div>

            <div className="mind3d-group-label">NODE CLASSES</div>
            <div className="mind3d-kind-list">
              {KIND_ORDER.map((kind) => {
                const count = nodes.filter((node) => node.data.kind === kind && sensitivityOf(node) !== 'restricted').length;
                if (!count) return null;
                return (
                  <button key={kind} className={`mind3d-kind-row ${kindFilter && kindFilter.includes(kind) ? 'is-filtered' : ''}`} onClick={() => toggleKind(kind)}>
                    <i style={{ background: NODE_META[kind].color }} /><span>{NODE_META[kind].label}</span><small>{count}</small>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === 'neuron' && (
          <>
            <div className="mind3d-group-label">NEURON STRUCTURES</div>
            <div className="mind3d-kind-list">
              {NEURON_ANATOMY.filter((item) => item.id !== 'communication').map((item) => (
                <button key={item.id} className={`mind3d-kind-row ${neuronPart === item.id ? 'is-filtered' : ''}`} onClick={() => setNeuronPart(item.id)}>
                  <i style={{ background: '#7fd6c4' }} /><span>{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mind3d-sidebar-bottom">
          <div className="mind3d-privacy-card">
            <LockKeyhole size={15} />
            <div><strong>Private concept content</strong><span>Hidden by default. Visual masking is not encryption.</span></div>
          </div>
          <button className="mind3d-side-action" onClick={togglePrivate}>{sensitiveContentVisible ? <EyeOff size={14} /> : <Eye size={14} />}{sensitiveContentVisible ? 'Hide private content' : 'Reveal private content'}</button>
          {privateMode && <p className="mind3d-restricted-note">Private mode is on: all non-standard records are withheld.</p>}
          {restrictedCount > 0 && <p className="mind3d-restricted-note">{restrictedCount} restricted record(s) stay outside every standard view.</p>}
        </div>
      </aside>

      <main className="mind3d-main">
        <div className="mind3d-scene-wrap">
          <Mind3DScene
            key={`${cameraKey}-${mode}`}
            nodes={mode === 'mind' ? sceneNodes : []}
            edges={mode === 'mind' ? sceneEdges : []}
            running={running}
            reducedMotion={reducedMotion}
            mode={mode}
            selectedNeuronPart={neuronPart}
            onSelectNeuronPart={setNeuronPart}
          />
          {mode !== 'mind' && (
            <div className="mind3d-scene-heading">
              <div className="mind3d-eyebrow">NEURAL MIND STUDIO / SPATIAL VIEW</div>
              <h2>{mode === 'brain' ? 'Anatomical reference' : 'Biological neuron anatomy'}</h2>
              <p>{mode === 'brain'
                ? 'A stylized educational brain sculpture, separate from the personal cognitive network.'
                : 'An educational teaching model. It is never a measurement of your own neural activity.'}</p>
            </div>
          )}
          {mode === 'mind' && (
            <>
              <div className="mind3d-frame-controls" role="group" aria-label="Conceptual model camera angles">
                {(Object.keys(MIND3D_CAMERA_PRESETS) as Mind3DCameraPreset[]).map((preset) => (
                  <button key={preset} className={cameraPreset === preset ? 'is-active' : ''} onClick={() => applyCameraPreset(preset)}>{preset.toUpperCase()}</button>
                ))}
                <button aria-label="Reset camera and filters" title="Reset camera and filters" onClick={() => {
                  setCameraKey((value) => value + 1);
                  setQuery('');
                  setKindFilter(null);
                  setDimensionFilter(null);
                  setTimeFilter('all');
                }}><RotateCcw size={12} /></button>
              </div>
              <div className="mind3d-concept-chip" aria-label="Concept graph size">
                <span>{visibleNodes.length}</span> NODES <i>·</i> <span>{sceneEdges.length}</span> LINKS
              </div>
              <div className="mind3d-map-label"><span className="mind3d-live-dot" /> CONCEPTUAL MAP · NOT A BRAIN SCAN</div>
              <div className="mind3d-edge-legend"><EdgeLegend compact /></div>
            </>
          )}
          <div className="mind3d-view-toggle">
            <button className={mode === 'mind' ? 'active' : ''} onClick={() => setMode('mind')}><Sparkles size={13} /> Mind network</button>
            <button className={mode === 'brain' ? 'active' : ''} onClick={() => setMode('brain')}><Brain size={13} /> Brain anatomy</button>
            <button className={mode === 'neuron' ? 'active' : ''} onClick={() => setMode('neuron')}><Waypoints size={13} /> Neuron</button>
          </div>
          {mode === 'mind' && (
            <div className="mind3d-mobile-sheet">
              <div className="mind3d-sheet-tabs">
                <button className={regionsOpen ? 'is-active' : ''} onClick={() => { setRegionsOpen((value) => !value); setDetailsOpen(false); }}>Regions</button>
                <button className={detailsOpen ? 'is-active' : ''} onClick={() => { setDetailsOpen((value) => !value); setRegionsOpen(false); }}>Details</button>
                <button onClick={() => applyCameraPreset('iso')}>Fit</button>
              </div>
              <div className="mind3d-sheet-utilities" role="group" aria-label="Conceptual model utilities">
                <button onClick={() => setSimulationRunning(!running)} title={running ? 'Pause animation' : 'Run animation'} aria-label={running ? 'Pause animation' : 'Run animation'}>
                  {running ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button onClick={() => setCameraKey((value) => value + 1)} title="Reset camera" aria-label="Reset camera"><RotateCcw size={12} /></button>
                <button onClick={onFullscreen} title="Fullscreen" aria-label="Fullscreen"><Maximize2 size={12} /></button>
                {reducedMotion && <span>Reduced motion</span>}
              </div>
              <div className="mind3d-timeline">
                <button className="mind3d-timeline-toggle" onClick={() => setTimeFilter('all')}><Clock3 size={12} /> TIMELINE</button>
                <div className="mind3d-timeline-filters">
                  {(['all', '7', '30', '90'] as const).map((value) => (
                    <button key={value} className={timeFilter === value ? 'is-active' : ''} onClick={() => setTimeFilter(value)}>
                      {value === 'all' ? 'ALL TIME' : `${value} DAYS`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mind3d-timeline-cards">
                {timelineCards.map((card) => (
                  <button key={card.id}
                    className={`mind3d-timeline-card ${card.masked ? 'is-masked' : ''} ${activeNodeId === card.id ? 'is-active' : ''}`}
                    onClick={() => {
                      const node = visibleNodes.find((item) => item.id === card.id);
                      if (node) selectNode(node);
                      focusPosition(layout.get(card.id));
                    }}>
                    <span className="mind3d-card-date">{card.date}</span>
                    <span className="mind3d-card-kind">{card.kind}</span>
                    <span className="mind3d-card-label">{card.label}</span>
                  </button>
                ))}
                {!timelineCards.length && <span className="mind3d-timeline-empty">No concepts in this range.</span>}
              </div>
              <div className="mind3d-controls-hint">DRAG TO ROTATE <b>·</b> SCROLL TO ZOOM <b>·</b> DRAG A NODE TO REPOSITION <b>·</b> CLICK TO INSPECT</div>
              {maskedCount > 0 && !sensitiveContentVisible && <span className="mind3d-private-status"><LockKeyhole size={11} /> {maskedCount} private concept(s) are masked until you reveal them.</span>}
            </div>
          )}
          {notice && <div className="mind3d-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
          {mode === 'mind' && activeNodeId && (
            <div className="mind3d-focus-actions">
              <button onClick={focusSelected}><Focus size={13} /> Focus selected</button>
              <button disabled={!pathwayTargets.earlier} onClick={() => focusPathway(pathwayTargets.earlier)} title="Follow an earlier-experience link from this concept"><Clock3 size={13} /> Present → historical</button>
              <button disabled={!pathwayTargets.goal} onClick={() => focusPathway(pathwayTargets.goal)} title="Follow a strength-to-goal link from this concept"><GitBranch size={13} /> Strength → goal</button>
            </div>
          )}
        </div>
        <div className="mind3d-bottomline">
          <div><ShieldCheck size={13} /> Anatomical, neuronal and conceptual layers are separate.</div>
          <button onClick={onOpen2D}>Open 2D graph editor <span>↗</span></button>
          <button onClick={onOpenCompanion}>Open AI companion <span>↗</span></button>
        </div>
      </main>

      {mode === 'mind' && <Inspector selectedNode={selectedNode && !isMasked(selectedNode) ? selectedNode : null} selectedEdge={selectedEdge} />}

      {mode === 'brain' && (
        <aside className="side-panel inspector-panel mind3d-anatomy-panel">
          <div className="panel-kicker">EDUCATIONAL ANATOMY</div>
          <div className="panel-heading">Brain reference model</div>
          <p className="panel-copy">This custom 3D sculpture is a stylized educational reference, not a medically validated anatomical reconstruction.</p>
          <div className="mind3d-anatomy-item"><i className="anatomy-dot cortex" /><div><strong>Cerebral hemispheres</strong><span>Two large hemispheric forms; surface folds are illustrative.</span></div></div>
          <div className="mind3d-anatomy-item"><i className="anatomy-dot cerebellum" /><div><strong>Cerebellum reference</strong><span>Posterior/inferior reference form in this sculpture.</span></div></div>
          <div className="mind3d-anatomy-item"><i className="anatomy-dot stem" /><div><strong>Brainstem reference</strong><span>Lower connecting form; no symptoms or emotions are mapped to it.</span></div></div>
          <div className="inspector-hint"><ShieldCheck size={14} /> No personal thought or emotion is assigned to an anatomical brain region.</div>
          <button className="primary-button full-button" onClick={() => setMode('mind')}>Return to mind network</button>
        </aside>
      )}

      {mode === 'neuron' && (
        <aside className="side-panel inspector-panel mind3d-anatomy-panel">
          <div className="panel-kicker">NEURONAL ANATOMY</div>
          <div className="panel-heading">{neuronInfo.label}</div>
          <p className="panel-copy">{neuronInfo.description}</p>
          <div className="inspector-hint"><ShieldCheck size={14} /> A conceptual graph node is not a biological neuron, and this animation is not a reading of your brain.</div>
          <button className="primary-button full-button" onClick={() => { setNeuronPart('communication'); }}>
            Read about synaptic communication
          </button>
          {neuronPart === 'communication' && <p className="panel-copy">{NEURON_ANATOMY.find((item) => item.id === 'communication')?.description}</p>}
        </aside>
      )}
    </div>
  );
}
