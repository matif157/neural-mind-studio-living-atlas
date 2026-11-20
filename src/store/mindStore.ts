import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { seedEdges, seedNodes } from '../data/seed';
import { NODE_META, type MindEdge, type MindNode, type MindNodeData, type MindNodeKind, type MindProjectFile } from '../types/mind';

type Snapshot = { nodes: MindNode[]; edges: MindEdge[] };
type ClipboardData = { nodes: MindNode[]; edges: MindEdge[] } | null;

interface MindState {
  nodes: MindNode[];
  edges: MindEdge[];
  past: Snapshot[];
  future: Snapshot[];
  clipboard: ClipboardData;
  activeScenario: string | null;
  simulationRunning: boolean;
  setNodes: (nodes: MindNode[]) => void;
  setEdges: (edges: MindEdge[]) => void;
  onNodesChange: (changes: NodeChange<MindNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<MindEdge>[]) => void;
  captureHistory: () => void;
  addNode: (kind: MindNodeKind, position: { x: number; y: number }, label?: string) => string;
  updateNode: (id: string, patch: Partial<MindNodeData>) => void;
  addConnection: (connection: Connection, relation?: NonNullable<MindEdge['data']>['relation']) => void;
  updateEdge: (id: string, patch: Partial<NonNullable<MindEdge['data']>>) => void;
  deleteSelection: () => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (offset?: { x: number; y: number }) => void;
  duplicateSelection: () => void;
  undo: () => void;
  redo: () => void;
  loadProject: (file: MindProjectFile) => void;
  setActiveScenario: (id: string | null) => void;
  setSimulationRunning: (running: boolean) => void;
  resetToStarter: () => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const snapshot = (state: Pick<MindState, 'nodes' | 'edges'>): Snapshot => ({ nodes: clone(state.nodes), edges: clone(state.edges) });
const blankData = (kind: MindNodeKind, label?: string): MindNodeData => ({
  label: label ?? `New ${NODE_META[kind].label.toLowerCase()}`,
  kind,
  description: 'Describe what this node represents in your experience. Keep it specific and non-judgemental.',
  innerVoice: 'What might this experience be saying?',
  balancedVoice: 'What is a fair, supportive and realistic response?',
  intensity: 0.5,
  valence: kind === 'emotion' ? 'mixed' : 'neutral',
  tags: [],
  createdAt: new Date().toISOString(),
});

export const useMindStore = create<MindState>((set, get) => ({
  nodes: clone(seedNodes),
  edges: clone(seedEdges),
  past: [],
  future: [],
  clipboard: null,
  activeScenario: null,
  simulationRunning: true,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  captureHistory: () => set((state) => ({ past: [...state.past.slice(-49), snapshot(state)], future: [] })),

  onNodesChange: (changes) => set((state) => {
    const removed = changes.some((change) => change.type === 'remove');
    const nextNodes = applyNodeChanges(changes, state.nodes) as MindNode[];
    if (!removed) return { nodes: nextNodes };
    const removedIds = new Set(state.nodes.filter((node) => !nextNodes.some((next) => next.id === node.id)).map((node) => node.id));
    return {
      nodes: nextNodes,
      edges: state.edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)),
    };
  }),

  onEdgesChange: (changes) => set((state) => {
    return { edges: applyEdgeChanges(changes, state.edges) as MindEdge[] };
  }),

  addNode: (kind, position, label) => {
    const id = makeId(kind);
    const meta = NODE_META[kind];
    const newNode: MindNode = {
      id, type: 'mind', position,
      selected: true,
      data: blankData(kind, label ?? `New ${meta.label}`),
    };
    set((state) => ({
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), newNode],
      past: [...state.past.slice(-49), snapshot(state)], future: [],
      activeScenario: null,
    }));
    return id;
  },

  updateNode: (id, patch) => set((state) => ({
    nodes: state.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node),
    past: [...state.past.slice(-49), snapshot(state)], future: [],
  })),

  addConnection: (connection, relation = 'activates') => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const id = makeId('synapse');
    const newEdge: MindEdge = {
      id,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'neural',
      animated: true,
      data: { relation, weight: 0.6, signal: true },
    };
    set((state) => {
      if (state.edges.some((edge) => edge.source === newEdge.source && edge.target === newEdge.target && edge.data?.relation === relation)) return state;
      return { edges: addEdge(newEdge, state.edges) as MindEdge[], past: [...state.past.slice(-49), snapshot(state)], future: [] };
    });
  },

  updateEdge: (id, patch) => set((state) => ({
    edges: state.edges.map((edge) => edge.id === id ? { ...edge, data: { ...edge.data!, ...patch } } : edge),
    past: [...state.past.slice(-49), snapshot(state)], future: [],
  })),

  deleteSelection: () => set((state) => {
    const nodeIds = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id));
    const edgeIds = new Set(state.edges.filter((edge) => edge.selected).map((edge) => edge.id));
    if (!nodeIds.size && !edgeIds.size) return state;
    return {
      nodes: state.nodes.filter((node) => !nodeIds.has(node.id)),
      edges: state.edges.filter((edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)),
      past: [...state.past.slice(-49), snapshot(state)], future: [], activeScenario: null,
    };
  }),

  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    past: [...state.past.slice(-49), snapshot(state)], future: [], activeScenario: null,
  })),

  deleteEdge: (id) => set((state) => ({
    edges: state.edges.filter((edge) => edge.id !== id),
    past: [...state.past.slice(-49), snapshot(state)], future: [],
  })),

  copySelection: () => {
    const selectedNodes = get().nodes.filter((node) => node.selected);
    const ids = new Set(selectedNodes.map((node) => node.id));
    const selectedEdges = get().edges.filter((edge) => edge.selected || (ids.has(edge.source) && ids.has(edge.target)));
    set({ clipboard: { nodes: clone(selectedNodes), edges: clone(selectedEdges) } });
  },

  cutSelection: () => {
    get().copySelection();
    get().deleteSelection();
  },

  pasteClipboard: (offset = { x: 70, y: 50 }) => {
    const clipboard = get().clipboard;
    if (!clipboard || (!clipboard.nodes.length && !clipboard.edges.length)) return;
    const mapping = new Map<string, string>();
    const newNodes = clipboard.nodes.map((node) => {
      const id = makeId(node.data.kind);
      mapping.set(node.id, id);
      return { ...clone(node), id, selected: true, position: { x: node.position.x + offset.x, y: node.position.y + offset.y } };
    });
    const newEdges = clipboard.edges.map((edge) => ({
      ...clone(edge), id: makeId('synapse'), source: mapping.get(edge.source) ?? edge.source, target: mapping.get(edge.target) ?? edge.target, selected: false,
    }));
    set((state) => {
      const nextNodeIds = new Set([...state.nodes.map((node) => node.id), ...newNodes.map((node) => node.id)]);
      return {
        nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...newNodes],
        edges: [...state.edges, ...newEdges.filter((edge) => nextNodeIds.has(edge.source) && nextNodeIds.has(edge.target))],
        past: [...state.past.slice(-49), snapshot(state)], future: [], activeScenario: null,
      };
    });
  },

  duplicateSelection: () => {
    get().copySelection();
    get().pasteClipboard({ x: 54, y: 42 });
  },

  undo: () => set((state) => {
    if (!state.past.length) return state;
    const previous = state.past[state.past.length - 1];
    return {
      nodes: clone(previous.nodes), edges: clone(previous.edges),
      past: state.past.slice(0, -1), future: [snapshot(state), ...state.future].slice(0, 50),
    };
  }),

  redo: () => set((state) => {
    if (!state.future.length) return state;
    const next = state.future[0];
    return {
      nodes: clone(next.nodes), edges: clone(next.edges),
      past: [...state.past, snapshot(state)].slice(-50), future: state.future.slice(1),
    };
  }),

  loadProject: (file) => set((state) => ({
    nodes: file.nodes,
    edges: file.edges,
    past: [...state.past.slice(-49), snapshot(state)],
    future: [],
    activeScenario: null,
  })),

  setActiveScenario: (id) => set({ activeScenario: id }),
  setSimulationRunning: (running) => set({ simulationRunning: running }),

  resetToStarter: () => set((state) => ({
    nodes: clone(seedNodes), edges: clone(seedEdges),
    past: [...state.past.slice(-49), snapshot(state)], future: [], activeScenario: null,
  })),
}));
