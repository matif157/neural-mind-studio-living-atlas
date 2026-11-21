import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider,
  SelectionMode, type Connection, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Check, Crosshair, Expand, EyeOff, Focus, GitBranch, Lock, Maximize2,
  RotateCcw, Search, Trash2, Ungroup, X,
} from 'lucide-react';
import { GRAPH_VIEWS } from '@shared/domain';
import { dimensionMeta } from '@shared/dimensions';
import EdgeLegend from './EdgeLegend';
import MindNeuronNode from './MindNeuronNode';
import NeuralEdge from './NeuralEdge';
import Palette from './Palette';
import Inspector from './Inspector';
import { useMindStore } from '../store/mindStore';
import { useConversationStore } from '../store/conversationStore';
import { useUiStore } from '../store/uiStore';
import { isNodeDisplayable, isNodeMasked, type PrivacyView } from '../utils/privacy';
import { scenarios } from '../data/scenarios';
import { isSignalEdge, nodeDimension } from '../lib/mind3d';
import { getMindNodeColor, NODE_META, type MindEdge, type MindNode, type MindNodeKind } from '../types/mind';

const nodeTypes = { mind: MindNeuronNode };
const edgeTypes = { neural: NeuralEdge };

interface MindWorkspaceProps { onFitRef: (fit: () => void) => void }

function MindWorkspace({ onFitRef }: MindWorkspaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow<MindNode, MindEdge>();
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const customCategories = useMindStore((state) => state.customCategories);
  const onNodesChange = useMindStore((state) => state.onNodesChange);
  const onEdgesChange = useMindStore((state) => state.onEdgesChange);
  const addNode = useMindStore((state) => state.addNode);
  const addConnection = useMindStore((state) => state.addConnection);
  const captureHistory = useMindStore((state) => state.captureHistory);
  const setNodes = useMindStore((state) => state.setNodes);
  const setSimulationRunning = useMindStore((state) => state.setSimulationRunning);
  const simulationRunning = useMindStore((state) => state.simulationRunning);
  const activeScenario = useMindStore((state) => state.activeScenario);
  const sensitiveContentVisible = useMindStore((state) => state.sensitiveContentVisible);
  const hiddenKinds = useMindStore((state) => state.hiddenKinds);
  const privateMode = useConversationStore((state) => state.sensitivePrivateMode);
  const groupSelection = useMindStore((state) => state.groupSelection);
  const ungroupSelection = useMindStore((state) => state.ungroupSelection);
  const toggleLock = useMindStore((state) => state.toggleLock);
  const toggleCollapse = useMindStore((state) => state.toggleCollapse);
  const duplicateSelection = useMindStore((state) => state.duplicateSelection);
  const acceptNode = useMindStore((state) => state.acceptNode);
  const rejectNode = useMindStore((state) => state.rejectNode);
  const { graphView, query, kindFilter, provenanceFilter, dimensionFilter, secureView, setQuery, clearFilters, contextMenu, openContextMenu, closeContextMenu, selectedNodeId, setSelectedNode } = useUiStore();
  const [tracedIds, setTracedIds] = useState<Set<string> | null>(null);
  const scenario = scenarios.find((item) => item.id === activeScenario);
  const view = GRAPH_VIEWS.find((item) => item.id === graphView) ?? GRAPH_VIEWS[0];
  const privacyView = useMemo<PrivacyView>(() => ({
    // Either the stored reveal flag or the session secure-view toggle may expose
    // protected wording. Both vocabularies are resolved by effectivePrivacy.
    revealSensitive: sensitiveContentVisible || secureView,
    // Only the 2D map can reveal a restricted record for a review session.
    revealRestricted: secureView,
    privateMode,
    hiddenKinds,
  }), [sensitiveContentVisible, secureView, privateMode, hiddenKinds]);

  // One shared visibility rule: restricted/hidden/private-mode records are removed entirely.
  // Masked records remain as placeholders so the shape of the map survives, but no wording leaks.
  const displayableNodes = useMemo(
    () => nodes.filter((node) => isNodeDisplayable(node, privacyView)),
    [nodes, privacyView],
  );
  const maskedIds = useMemo(
    () => new Set(displayableNodes.filter((node) => isNodeMasked(node, privacyView)).map((node) => node.id)),
    [displayableNodes, privacyView],
  );
  const privacyEdges = useMemo(
    () => edges.filter((edge) => !maskedIds.has(edge.source) && !maskedIds.has(edge.target)),
    [edges, maskedIds],
  );
  const maskNode = useCallback((node: MindNode): MindNode => maskedIds.has(node.id) ? ({
    ...node,
    data: {
      ...node.data,
      label: 'Private concept',
      description: '',
      innerVoice: '',
      balancedVoice: '',
      originalText: '',
      context: '',
      tags: [],
      evidence: [],
      intensity: null,
    },
  }) : node, [maskedIds]);

  const onConnect = useCallback((connection: Connection) => addConnection(connection), [addConnection]);
  const addAtCenter = useCallback((kind: MindNodeKind, customKindId?: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const point = rect
      ? reactFlow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 540, y: 350 };
    addNode(kind, { x: point.x + Math.random() * 80 - 40, y: point.y + Math.random() * 80 - 40 }, undefined, { customKind: customKindId });
  }, [addNode, reactFlow]);

  const fit = useCallback(() => reactFlow.fitView({ padding: 0.22, duration: 500 }), [reactFlow]);
  useEffect(() => { onFitRef(fit); }, [fit, onFitRef]);

  const collapsedParents = useMemo(() => new Set(displayableNodes.filter((node) => node.data.collapsed).map((node) => node.id)), [displayableNodes]);
  const viewIds = useMemo(() => {
    if (!view.kinds.length) return null;
    const ids = new Set<string>();
    for (const node of displayableNodes) if (view.kinds.includes(node.data.kind)) ids.add(node.id);
    for (const edge of privacyEdges) {
      if (ids.has(edge.source)) ids.add(edge.target);
      if (ids.has(edge.target)) ids.add(edge.source);
    }
    return ids;
  }, [view.kinds, displayableNodes, privacyEdges]);

  // Search only over readable wording: masked content must not be discoverable by query.
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return displayableNodes.filter((node) => !maskedIds.has(node.id) && [
      node.data.label, node.data.description, node.data.originalText ?? '', node.data.kind, ...node.data.tags,
    ].join(' ').toLowerCase().includes(term));
  }, [displayableNodes, maskedIds, query]);
  const matchIds = useMemo(() => new Set(matches.map((node) => node.id)), [matches]);
  const selectedIds = useMemo(() => {
    const ids = new Set(displayableNodes.filter((node) => node.selected && !maskedIds.has(node.id)).map((node) => node.id));
    if (!ids.size && selectedNodeId && !maskedIds.has(selectedNodeId)) ids.add(selectedNodeId);
    return ids;
  }, [displayableNodes, maskedIds, selectedNodeId]);
  const relatedIds = useMemo(() => {
    const ids = new Set(selectedIds);
    for (const edge of privacyEdges) {
      if (!isSignalEdge(edge)) continue;
      if (selectedIds.has(edge.source)) ids.add(edge.target);
      if (selectedIds.has(edge.target)) ids.add(edge.source);
    }
    return ids;
  }, [privacyEdges, selectedIds]);

  const visibleNodes = useMemo(() => displayableNodes.filter((node) => {
    if (node.data.parentId && collapsedParents.has(node.data.parentId)) return false;
    if (viewIds && !viewIds.has(node.id)) return false;
    if (kindFilter.length && !kindFilter.includes(node.data.kind)) return false;
    if (provenanceFilter.length && !provenanceFilter.includes(node.data.provenance)) return false;
    if (dimensionFilter !== 'all' && nodeDimension(node) !== dimensionFilter) return false;
    if (query.trim() && !matchIds.has(node.id)) return true; // keep structure, dim non-matches
    return true;
  }).map((node) => {
    const safe = maskNode(node);
    const searchClass = query.trim() ? (matchIds.has(node.id) ? 'search-match' : 'search-dimmed') : '';
    const focusClass = selectedIds.size ? (relatedIds.has(node.id) ? 'selected-focus' : 'selected-dimmed') : '';
    const traceClass = tracedIds && !tracedIds.has(node.id) ? 'trace-dimmed' : '';
    return { ...safe, className: [searchClass, focusClass, traceClass].filter(Boolean).join(' ') };
  }), [displayableNodes, collapsedParents, viewIds, kindFilter, provenanceFilter, dimensionFilter, maskNode, query, matchIds, selectedIds, relatedIds, tracedIds]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => privacyEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map((edge) => {
    const isInScenario = !scenario || (scenario.nodeIds.includes(edge.source) && scenario.nodeIds.includes(edge.target));
    const isSearchPath = !query.trim() || (matchIds.has(edge.source) && matchIds.has(edge.target));
    const isRelated = !selectedIds.size || selectedIds.has(edge.source) || selectedIds.has(edge.target);
    const isTraced = !tracedIds || (tracedIds.has(edge.source) && tracedIds.has(edge.target));
    const opacity = isInScenario && isSearchPath && isRelated && isTraced ? 1 : 0.12;
    return { ...edge, style: { ...(edge.style ?? {}), opacity, stroke: isRelated && selectedIds.size ? '#78cbd5' : edge.style?.stroke } };
  }), [privacyEdges, visibleIds, scenario, query, matchIds, selectedIds, tracedIds]);

  const selectedNode = displayableNodes.find((node) => (node.id === selectedNodeId || node.selected) && !maskedIds.has(node.id)) ?? null;
  const selectedEdge = privacyEdges.find((edge) => edge.selected) ?? null;
  const contextNode = contextMenu?.nodeId ? visibleNodes.find((node) => node.id === contextMenu.nodeId) : null;

  const focusNode = useCallback((id: string) => {
    const node = displayableNodes.find((item) => item.id === id && !maskedIds.has(id));
    if (node) reactFlow.setCenter(node.position.x + 120, node.position.y + 70, { zoom: 1.15, duration: 520 });
  }, [displayableNodes, maskedIds, reactFlow]);

  const traceFrom = useCallback((id: string) => {
    const ids = new Set([id]);
    for (let depth = 0; depth < 2; depth += 1) {
      for (const edge of privacyEdges) {
        if (!isSignalEdge(edge)) continue;
        if (ids.has(edge.source)) ids.add(edge.target);
        if (ids.has(edge.target)) ids.add(edge.source);
      }
    }
    setTracedIds(ids);
  }, [privacyEdges]);

  const runSearch = useCallback(() => {
    const first = matches[0];
    if (first) focusNode(first.id);
  }, [matches, focusNode]);

  const selectOnly = (id: string) => setNodes(displayableNodes.map((node) => ({ ...node, selected: node.id === id })));

  const menuAction = (action: string) => {
    if (!contextMenu?.nodeId) { closeContextMenu(); return; }
    const id = contextMenu.nodeId;
    if (maskedIds.has(id)) { closeContextMenu(); return; }
    switch (action) {
      case 'focus': focusNode(id); break;
      case 'trace': traceFrom(id); break;
      case 'lock': toggleLock(id); break;
      case 'collapse': toggleCollapse(id); break;
      case 'group': groupSelection(); break;
      case 'ungroup': ungroupSelection(); break;
      case 'duplicate': selectOnly(id); duplicateSelection(); break;
      case 'delete': setNodes(nodes.filter((node) => node.id !== id)); break;
      case 'accept': acceptNode(id); break;
      case 'reject': rejectNode(id); break;
    }
    closeContextMenu();
  };

  return (
    <div className="workspace-grid">
      <Palette onAdd={addAtCenter} />
      <main className="mind-canvas-wrap" ref={canvasRef}>
        <div className="canvas-topline">
          <div><span className="live-dot" /> {view.label.toUpperCase()} <span className="canvas-divider">/</span> EDIT MODE</div>
          <div className="canvas-topline-right">
            <span>{visibleNodes.length}/{displayableNodes.length} nodes</span><i /> <span>{visibleEdges.length} links</span>{privateMode && <span className="canvas-privacy-badge">PRIVATE MODE</span>}
            <div className="canvas-search">
              <Search size={12} />
              <input aria-label="Search mind map" placeholder="Find a thought…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') runSearch(); }} />
              {query && <span className="search-count">{matches.length}</span>}
              {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={12} /></button>}
            </div>
            <button className="icon-button small" title="Fit graph" onClick={fit}><Maximize2 size={14} /></button>
            <button className="icon-button small" title="Reset view and filters" onClick={() => { clearFilters(); setTracedIds(null); fit(); }}><RotateCcw size={14} /></button>
            <button className={`view-chip ${secureView ? 'active' : ''}`} title={secureView ? 'Hide sensitive entries' : 'Reveal sensitive entries for review'} onClick={() => useUiStore.getState().toggleSecureView()}>{secureView ? 'Secure view on' : 'Secure view off'}</button>
            <button className="icon-button small" title="Fullscreen canvas" onClick={() => canvasRef.current?.requestFullscreen?.()}><Expand size={14} /></button>
          </div>
        </div>

        {(kindFilter.length > 0 || provenanceFilter.length > 0 || dimensionFilter !== 'all' || tracedIds) && (
          <div className="filter-strip">
            {kindFilter.map((kind) => <button key={kind} onClick={() => useUiStore.getState().toggleKindFilter(kind)}>{NODE_META[kind].label} <X size={11} /></button>)}
            {provenanceFilter.map((item) => <button key={item} onClick={() => useUiStore.getState().toggleProvenanceFilter(item)}>{item} <X size={11} /></button>)}
            {dimensionFilter !== 'all' && <button onClick={() => useUiStore.getState().setDimensionFilter('all')}>{dimensionMeta(dimensionFilter).label} <X size={11} /></button>}
            {tracedIds && <button onClick={() => setTracedIds(null)}>Tracing {tracedIds.size} nodes <X size={11} /></button>}
          </div>
        )}

        {scenario && <div className="scenario-banner" style={{ '--scenario-color': scenario.color } as CSSProperties}><strong>{scenario.title}</strong><span>{scenario.description}</span><button onClick={() => useMindStore.getState().setActiveScenario(null)}>Clear focus ×</button></div>}

        <ReactFlow<MindNode, MindEdge>
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={() => captureHistory('Node moved', 'A reversible position change was recorded.')}
          onBeforeDelete={async () => { captureHistory('Delete requested'); return true; }}
          onNodeClick={(_event, node) => setSelectedNode(maskedIds.has(node.id) ? null : node.id)}
          onPaneClick={() => { closeContextMenu(); setSelectedNode(null); }}
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            openContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
          }}
          onPaneContextMenu={(event) => { event.preventDefault(); openContextMenu({ x: event.clientX, y: event.clientY }); }}
          defaultEdgeOptions={{ type: 'neural', animated: simulationRunning }}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.08}
          maxZoom={2.4}
          panOnScroll
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          deleteKeyCode={['Backspace', 'Delete']}
          snapToGrid
          snapGrid={[16, 16]}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={23} size={1} color="#26354c" />
          <Background variant={BackgroundVariant.Lines} gap={160} color="#182438" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => {
            const item = node as MindNode;
            const custom = item.data?.customKind ? customCategories.find((entry) => entry.id === item.data.customKind) : undefined;
            return custom?.color ?? (item.data?.kind ? getMindNodeColor(item.data) : '#718096');
          }} maskColor="rgba(5,10,20,.68)" />
        </ReactFlow>

        <div className="canvas-legend">
          {['emotion', 'thought', 'pattern', 'memory', 'need', 'behavior'].map((kind) => (
            <span key={kind}><i className="node-dot" style={{ background: NODE_META[kind as MindNodeKind].color }} /> {NODE_META[kind as MindNodeKind].label}</span>
          ))}
          <EdgeLegend compact />
          <button onClick={() => setSimulationRunning(!simulationRunning)}>{simulationRunning ? 'Pause signals' : 'Run signals'}</button>
        </div>

        {contextMenu && (
          <>
            <div className="context-backdrop" onClick={closeContextMenu} />
            <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu">
              {contextNode ? (
                <>
                  <div className="context-title">{contextNode.data.label}</div>
                  <button onClick={() => menuAction('focus')}><Focus size={14} /> Focus node</button>
                  <button onClick={() => menuAction('trace')}><Crosshair size={14} /> Trace relationships</button>
                  <button onClick={() => menuAction('lock')}><Lock size={14} /> Toggle position lock</button>
                  <button onClick={() => menuAction('collapse')}><EyeOff size={14} /> Collapse / expand group</button>
                  <button onClick={() => menuAction('group')}><GitBranch size={14} /> Group selection</button>
                  <button onClick={() => menuAction('ungroup')}><Ungroup size={14} /> Dissolve group</button>
                  <button onClick={() => menuAction('duplicate')}><Check size={14} /> Duplicate</button>
                  {contextNode.data.status === 'draft' && <button onClick={() => menuAction('accept')}><Check size={14} /> Confirm proposal</button>}
                  {contextNode.data.status === 'draft' && <button onClick={() => menuAction('reject')}><X size={14} /> Reject proposal</button>}
                  <button className="danger" onClick={() => menuAction('delete')}><Trash2 size={14} /> Delete node</button>
                </>
              ) : (
                <>
                  <div className="context-title">Canvas</div>
                  <button onClick={() => { fit(); closeContextMenu(); }}><Maximize2 size={14} /> Fit view</button>
                  <button onClick={() => { clearFilters(); closeContextMenu(); }}><RotateCcw size={14} /> Clear all filters</button>
                </>
              )}
            </div>
          </>
        )}
      </main>
      <Inspector selectedNode={selectedNode} selectedEdge={selectedEdge} />
    </div>
  );
}

export default function MindCanvas({ onFitRef }: MindWorkspaceProps) {
  return <ReactFlowProvider><MindWorkspace onFitRef={onFitRef} /></ReactFlowProvider>;
}
