import { useMemo, useState } from 'react';
import {
  Brain, BrainCircuit, Eye, EyeOff, Focus, LockKeyhole, Maximize2, Network,
  Pause, Play, RotateCcw, Search, ShieldCheck, Sparkles, Waypoints,
} from 'lucide-react';
import { NEURON_ANATOMY } from '@shared/taxonomy';
import { NODE_META, type MindNodeKind } from '@shared/domain';
import { useMindStore } from '../store/mindStore';
import {
  buildMind3DLayout, getNodeSensitivity, MIND3D_VIEWS, type Mind3DViewId, type Vec3Tuple,
} from '../utils/mind3dLayout';
import Mind3DScene, { type Mind3DMode, type SceneEdge, type SceneNode } from './three/Mind3DScene';
import Inspector from './Inspector';

interface Mind3DWorkspaceProps {
  onOpen2D: () => void;
  onOpenCompanion: () => void;
}

const KIND_ORDER: MindNodeKind[] = [
  'emotion', 'thought', 'pattern', 'memory', 'belief', 'identity', 'need', 'goal', 'value',
  'behavior', 'body', 'situation', 'context', 'social', 'strength', 'coping', 'reflection',
  'exercise', 'knowledge', 'conversation', 'safety',
];

const ZERO: Vec3Tuple = [0, 0, 0];

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

  const [mode, setMode] = useState<Mind3DMode>('mind');
  const [view, setView] = useState<Mind3DViewId>('all');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<MindNodeKind[] | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [neuronPart, setNeuronPart] = useState<string | null>('soma');
  const [notice, setNotice] = useState('');

  const selectedNode = nodes.find((node) => node.selected) ?? null;
  const selectedEdge = edges.find((edge) => edge.selected) ?? null;
  const normalizedQuery = query.trim().toLowerCase();

  const sensitivityOf = (node: (typeof nodes)[number]) => getNodeSensitivity(node);
  const isMasked = (node: (typeof nodes)[number]) => {
    const level = sensitivityOf(node);
    return (level === 'private' || level === 'sensitive') && !sensitiveContentVisible;
  };

  // Restricted concepts are removed before layout. Masked concepts keep a placeholder shape
  // so structure is visible, but their text never enters labels, search or the inspector.
  const visibleNodes = useMemo(() => nodes.filter((node) => {
    if (sensitivityOf(node) === 'restricted') return false;
    if (kindFilter && !kindFilter.includes(node.data.kind)) return false;
    if (!normalizedQuery) return true;
    if (isMasked(node)) return false;
    return [node.data.label, node.data.description, node.data.kind, ...node.data.tags].join(' ').toLowerCase().includes(normalizedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [nodes, kindFilter, normalizedQuery, sensitiveContentVisible]);

  const layout = useMemo(() => buildMind3DLayout(visibleNodes), [visibleNodes]);

  const activeNodeId = selectedNode && visibleNodes.some((node) => node.id === selectedNode.id) ? selectedNode.id : null;
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const maskedIds = useMemo(() => new Set(visibleNodes.filter(isMasked).map((node) => node.id)), [visibleNodes, sensitiveContentVisible]);
  const relatedIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeNodeId) {
      ids.add(activeNodeId);
      edges.forEach((edge) => {
        if (edge.source === activeNodeId) ids.add(edge.target);
        if (edge.target === activeNodeId) ids.add(edge.source);
      });
    }
    return ids;
  }, [activeNodeId, edges]);

  const selectNode = (target: (typeof nodes)[number]) => {
    if (isMasked(target)) {
      setNotice('This concept is private. Reveal private content to inspect its wording.');
      return;
    }
    setNodes(nodes.map((item) => ({ ...item, selected: item.id === target.id })));
    setEdges(edges.map((edge) => ({ ...edge, selected: false })));
    setNotice('');
  };

  const sceneNodes: SceneNode[] = useMemo(() => visibleNodes.map((node) => ({
    node,
    position: layout.get(node.id) ?? ZERO,
    masked: maskedIds.has(node.id),
    selected: Boolean(node.selected) && !maskedIds.has(node.id),
    dimmed: Boolean(activeNodeId && !relatedIds.has(node.id)),
    onSelect: selectNode,
    onMove: (target, position) => setNodeSpatial(target.id, { x: position[0], y: position[1], z: position[2] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [visibleNodes, layout, maskedIds, sensitiveContentVisible, activeNodeId, relatedIds, nodes, edges]);

  const sceneEdges: SceneEdge[] = useMemo(() => edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    // A relationship that touches masked content would leak its existence in context, so it is withheld.
    .filter((edge) => !maskedIds.has(edge.source) && !maskedIds.has(edge.target))
    .map((edge) => {
      const selected = Boolean(edge.selected);
      const active = Boolean(activeNodeId && (edge.source === activeNodeId || edge.target === activeNodeId));
      return {
        edge,
        source: layout.get(edge.source) ?? ZERO,
        target: layout.get(edge.target) ?? ZERO,
        active,
        selected,
        dimmed: Boolean(activeNodeId && !active && !selected),
        running,
        onSelect: (target) => {
          setNodes(nodes.map((node) => ({ ...node, selected: false })));
          setEdges(edges.map((item) => ({ ...item, selected: item.id === target.id })));
        },
      };
    }), [edges, visibleIds, maskedIds, layout, activeNodeId, running, nodes, setNodes, setEdges]);

  const restrictedCount = nodes.filter((node) => sensitivityOf(node) === 'restricted').length;
  const maskedCount = maskedIds.size;

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
    setMode('mind');
  };

  const toggleKind = (kind: MindNodeKind) => {
    setView('all');
    setMode('mind');
    setKindFilter((current) => {
      if (!current) return [kind];
      return current.includes(kind) ? (current.length === 1 ? null : current.filter((item) => item !== kind)) : [...current, kind];
    });
  };

  const focusSelected = () => {
    if (!selectedNode) return;
    const position = layout.get(selectedNode.id);
    if (position) window.dispatchEvent(new CustomEvent('mind3d:focus', { detail: position }));
  };

  const onFullscreen = () => {
    const element = document.querySelector('.mind3d-scene-wrap');
    if (element && !document.fullscreenElement) void element.requestFullscreen?.();
    else if (document.fullscreenElement) void document.exitFullscreen?.();
  };

  const neuronInfo = NEURON_ANATOMY.find((item) => item.id === neuronPart) ?? NEURON_ANATOMY[0];

  return (
    <div className="mind3d-workspace">
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
            <div className="mind3d-group-label">VISUAL LAYERS</div>
            <div className="mind3d-view-list">
              {MIND3D_VIEWS.map((item) => (
                <button key={item.id} className={`mind3d-view-button ${view === item.id ? 'is-active' : ''}`} onClick={() => applyView(item.id)}>
                  <span className="mind3d-view-dot" style={{ background: item.kinds ? NODE_META[item.kinds[0] as MindNodeKind].color : '#a5b4fc' }} />
                  <span>{item.label}</span>
                  {view === item.id && <span className="mind3d-view-active" />}
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
          {restrictedCount > 0 && <p className="mind3d-restricted-note">{restrictedCount} restricted record(s) stay outside every standard view.</p>}
        </div>
      </aside>

      <main className="mind3d-main">
        <div className="mind3d-topline">
          <div><span className="mind3d-live-dot" /> 3D COGNITIVE MODEL <span className="mind3d-top-divider">/</span> SHARED MIND DATA</div>
          <div className="mind3d-top-actions">
            {mode === 'neuron' ? <span>Educational biology layer</span> : <><span>{visibleNodes.length} concepts</span><span>{sceneEdges.length} connections</span></>}
            <button onClick={() => setSimulationRunning(!running)} title={running ? 'Pause animation' : 'Run animation'}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? 'Pause' : 'Animate'}</button>
            <button onClick={() => setCameraKey((value) => value + 1)} title="Reset camera"><RotateCcw size={14} /> Reset</button>
            <button onClick={onFullscreen} title="Fullscreen" aria-label="Fullscreen"><Maximize2 size={14} /></button>
          </div>
        </div>
        <div className="mind3d-scene-wrap">
          <Mind3DScene
            key={`${cameraKey}-${mode}`}
            nodes={mode === 'mind' ? sceneNodes : []}
            edges={mode === 'mind' ? sceneEdges : []}
            running={running}
            mode={mode}
            selectedNeuronPart={neuronPart}
            onSelectNeuronPart={setNeuronPart}
          />
          <div className="mind3d-scene-heading">
            <div className="mind3d-eyebrow">NEURAL MIND STUDIO / SPATIAL VIEW</div>
            <h2>{mode === 'mind' ? 'Your mind, in three dimensions.' : mode === 'brain' ? 'Anatomical reference' : 'Biological neuron anatomy'}</h2>
            <p>{mode === 'mind'
              ? 'A conceptual network of thoughts, emotions, memories, needs and responses — not a brain scan.'
              : mode === 'brain'
                ? 'A stylized educational brain sculpture, separate from the personal cognitive network.'
                : 'An educational teaching model. It is never a measurement of your own neural activity.'}</p>
            {mode === 'mind' && maskedCount > 0 && !sensitiveContentVisible && <span className="mind3d-private-status"><LockKeyhole size={11} /> {maskedCount} private concept(s) are masked until you reveal them.</span>}
          </div>
          <div className="mind3d-view-toggle">
            <button className={mode === 'mind' ? 'active' : ''} onClick={() => setMode('mind')}><Sparkles size={13} /> Mind network</button>
            <button className={mode === 'brain' ? 'active' : ''} onClick={() => setMode('brain')}><Brain size={13} /> Brain anatomy</button>
            <button className={mode === 'neuron' ? 'active' : ''} onClick={() => setMode('neuron')}><Waypoints size={13} /> Neuron</button>
          </div>
          {mode === 'mind' && (
            <div className="mind3d-scene-bottom">
              <div className="mind3d-legend">
                {(['emotion', 'thought', 'memory', 'pattern', 'need', 'strength'] as MindNodeKind[]).map((kind) => (
                  <span key={kind}><i style={{ background: NODE_META[kind].color }} /> {NODE_META[kind].label}</span>
                ))}
              </div>
              <div className="mind3d-controls-hint">DRAG TO ROTATE <b>·</b> SCROLL TO ZOOM <b>·</b> DRAG A NODE TO REPOSITION <b>·</b> CLICK TO INSPECT</div>
            </div>
          )}
          {notice && <div className="mind3d-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
          {mode === 'mind' && activeNodeId && <button className="mind3d-focus-pill" onClick={focusSelected}><Focus size={13} /> Focus selected</button>}
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
