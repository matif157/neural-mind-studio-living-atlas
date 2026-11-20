import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider,
  SelectionMode, type Connection, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MindNeuronNode from './MindNeuronNode';
import NeuralEdge from './NeuralEdge';
import Palette from './Palette';
import Inspector from './Inspector';
import { useMindStore } from '../store/mindStore';
import { scenarios } from '../data/scenarios';
import { Search, X } from 'lucide-react';
import { getMindNodeColor } from '../types/mind';
import type { MindEdge, MindNode, MindNodeKind } from '../types/mind';

const nodeTypes = { mind: MindNeuronNode };
const edgeTypes = { neural: NeuralEdge };

interface MindWorkspaceProps {
  onFitRef: (fit: () => void) => void;
}

function MindWorkspace({ onFitRef }: MindWorkspaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow<MindNode, MindEdge>();
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const onNodesChange = useMindStore((state) => state.onNodesChange);
  const onEdgesChange = useMindStore((state) => state.onEdgesChange);
  const addNode = useMindStore((state) => state.addNode);
  const addConnection = useMindStore((state) => state.addConnection);
  const captureHistory = useMindStore((state) => state.captureHistory);
  const activeScenario = useMindStore((state) => state.activeScenario);
  const scenario = scenarios.find((item) => item.id === activeScenario);
  const [query, setQuery] = useState('');

  const onConnect = useCallback((connection: Connection) => addConnection(connection), [addConnection]);
  const addAtCenter = useCallback((kind: MindNodeKind) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const point = rect
      ? reactFlow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 540, y: 350 };
    addNode(kind, { x: point.x + Math.random() * 80 - 40, y: point.y + Math.random() * 80 - 40 });
  }, [addNode, reactFlow]);

  const selectedNode = nodes.find((node) => node.selected) ?? null;
  const selectedEdge = edges.find((edge) => edge.selected) ?? null;

  const fit = useCallback(() => reactFlow.fitView({ padding: 0.22, duration: 500 }), [reactFlow]);
  useEffect(() => { onFitRef(fit); }, [fit, onFitRef]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return nodes.filter((node) => [node.data.label, node.data.description, node.data.kind, ...node.data.tags].join(' ').toLowerCase().includes(term));
  }, [nodes, query]);
  const matchIds = useMemo(() => new Set(matches.map((node) => node.id)), [matches]);
  const selectedIds = useMemo(() => new Set(nodes.filter((node) => node.selected).map((node) => node.id)), [nodes]);
  const relatedToSelection = useMemo(() => {
    const ids = new Set(selectedIds);
    for (const edge of edges) {
      if (selectedIds.has(edge.source)) ids.add(edge.target);
      if (selectedIds.has(edge.target)) ids.add(edge.source);
    }
    return ids;
  }, [edges, selectedIds]);
  const visibleNodes = useMemo(() => nodes.map((node) => {
    const searchClass = query.trim() ? (matchIds.has(node.id) ? 'search-match' : 'search-dimmed') : '';
    const focusClass = selectedIds.size ? (relatedToSelection.has(node.id) ? 'selected-focus' : 'selected-dimmed') : '';
    return { ...node, className: `${searchClass} ${focusClass}`.trim() };
  }), [nodes, query, matchIds, selectedIds, relatedToSelection]);
  const visibleEdges = useMemo(() => edges.map((edge) => {
    const isInScenario = !scenario || (scenario.nodeIds.includes(edge.source) && scenario.nodeIds.includes(edge.target));
    const isSearchPath = !query.trim() || (matchIds.has(edge.source) && matchIds.has(edge.target));
    const isRelated = !selectedIds.size || selectedIds.has(edge.source) || selectedIds.has(edge.target);
    const opacity = isInScenario ? (isSearchPath ? (isRelated ? 1 : 0.18) : 0.08) : 0.12;
    return { ...edge, style: { ...(edge.style ?? {}), opacity, stroke: isRelated && selectedIds.size ? '#78cbd5' : edge.style?.stroke } };
  }), [edges, scenario, query, matchIds, selectedIds]);
  const runSearch = useCallback(() => {
    const first = matches[0];
    if (first) reactFlow.setCenter(first.position.x + 80, first.position.y + 60, { zoom: 1.12, duration: 480 });
  }, [matches, reactFlow]);

  return (
    <div className="workspace-grid">
      <Palette onAdd={addAtCenter} />
      <main className="mind-canvas-wrap" ref={canvasRef}>
        <div className="canvas-topline">
          <div><span className="live-dot" /> NEURAL NETWORK / EDIT MODE</div>
          <div className="canvas-topline-right"><span>{nodes.length} nodes</span><i /> <span>{edges.length} synapses</span><div className="canvas-search"><Search size={12} /><input aria-label="Search mind map" placeholder="Find a thought…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') runSearch(); }} />{query && <span className="search-count">{matches.length}</span>}{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={12} /></button>}</div></div>
        </div>
        {scenario && <div className="scenario-banner" style={{ '--scenario-color': scenario.color } as CSSProperties}><strong>{scenario.title}</strong><span>{scenario.description}</span><button onClick={() => useMindStore.getState().setActiveScenario(null)}>Clear focus ×</button></div>}
        <ReactFlow<MindNode, MindEdge>
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={captureHistory}
          onBeforeDelete={async () => { captureHistory(); return true; }}
          defaultEdgeOptions={{ type: 'neural', animated: true }}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.12}
          maxZoom={2.2}
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
            const n = node as MindNode;
            return n.data?.kind ? getMindNodeColor(n.data) : '#718096';
          }} maskColor="rgba(5,10,20,.68)" />
        </ReactFlow>
        <div className="canvas-legend">
          <span><i style={{ background: '#f5b94c' }} /> Emotion</span><span><i style={{ background: '#70a7ff' }} /> Thought</span><span><i style={{ background: '#b99aff' }} /> Memory</span><span><i style={{ background: '#ff8d68' }} /> Pattern</span><span><i style={{ background: '#59d3c2' }} /> Need</span>
        </div>
      </main>
      <Inspector selectedNode={selectedNode} selectedEdge={selectedEdge} />
    </div>
  );
}

export default function MindCanvas({ onFitRef }: MindWorkspaceProps) {
  return <ReactFlowProvider><MindWorkspace onFitRef={onFitRef} /></ReactFlowProvider>;
}
