import { create } from 'zustand';
import {
  addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type EdgeChange, type NodeChange,
} from '@xyflow/react';
import { seedEdges, seedNodes } from '../data/seed';
import { NODE_META, type MindNodeKind } from '@shared/domain';
import { evidenceRefSchema, type AiAnalysis, type ProjectFile } from '@shared/schemas';
import type { MindEdge, MindNode, MindNodeData } from '../types/mind';

type Snapshot = { nodes: MindNode[]; edges: MindEdge[] };
type ClipboardData = { nodes: MindNode[]; edges: MindEdge[] } | null;

export interface ChangeEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
  nodeCount: number;
  edgeCount: number;
}

export interface CustomCategory {
  id: string;
  label: string;
  color: string;
  definition: string;
  baseKind: MindNodeKind;
}
export interface CustomRelation { id: string; label: string; baseRelation: NonNullable<MindEdge['data']>['relation'] }

interface MindState {
  nodes: MindNode[];
  edges: MindEdge[];
  past: Snapshot[];
  future: Snapshot[];
  changeLog: ChangeEntry[];
  clipboard: ClipboardData;
  activeScenario: string | null;
  simulationRunning: boolean;
  sensitiveContentVisible: boolean;
  customCategories: CustomCategory[];
  customRelations: CustomRelation[];
  setNodes: (nodes: MindNode[]) => void;
  setEdges: (edges: MindEdge[]) => void;
  onNodesChange: (changes: NodeChange<MindNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<MindEdge>[]) => void;
  captureHistory: (action?: string, detail?: string) => void;
  addNode: (kind: MindNodeKind, position: { x: number; y: number }, label?: string, patch?: Partial<MindNodeData>) => string;
  updateNode: (id: string, patch: Partial<MindNodeData>, action?: string) => void;
  addConnection: (connection: Connection, relation?: NonNullable<MindEdge['data']>['relation']) => void;
  updateEdge: (id: string, patch: Partial<NonNullable<MindEdge['data']>>) => void;
  reverseEdge: (id: string) => void;
  deleteSelection: () => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (offset?: { x: number; y: number }) => void;
  duplicateSelection: () => void;
  groupSelection: (label?: string) => string | null;
  ungroupSelection: () => void;
  toggleLock: (id: string) => void;
  toggleCollapse: (id: string) => void;
  applyProposals: (payload: {
    nodes: AiAnalysis['proposed_graph_nodes'];
    edges: AiAnalysis['proposed_graph_edges'];
    eventId: string;
    date: string;
  }) => Record<string, string>;
  acceptNode: (id: string) => void;
  correctNode: (id: string, patch: Partial<MindNodeData>) => void;
  rejectNode: (id: string) => void;
  addCustomCategory: (category: CustomCategory) => void;
  addCustomRelation: (relation: CustomRelation) => void;
  undo: () => void;
  redo: () => void;
  loadProject: (file: ProjectFile) => void;
  setActiveScenario: (id: string | null) => void;
  setSimulationRunning: (running: boolean) => void;
  setSensitiveContentVisible: (visible: boolean) => void;
  setNodeSpatial: (id: string, position: { x: number; y: number; z: number } | null) => void;
  resetToStarter: () => void;
  clearChangeLog: () => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const snapshot = (state: Pick<MindState, 'nodes' | 'edges'>): Snapshot => ({ nodes: clone(state.nodes), edges: clone(state.edges) });
const stamp = () => new Date().toISOString();

const blankData = (kind: MindNodeKind, label?: string, patch: Partial<MindNodeData> = {}): MindNodeData => ({
  label: label ?? `New ${NODE_META[kind].label.toLowerCase()}`,
  kind,
  description: 'Describe what this node represents in your experience. Keep it specific and non-judgemental.',
  innerVoice: '',
  balancedVoice: '',
  intensity: null,
  valence: 'neutral',
  tags: [],
  isCore: false,
  createdAt: stamp(),
  updatedAt: stamp(),
  provenance: 'directly-stated',
  status: 'active',
  confidence: null,
  evidence: [],
  collapsed: false,
  locked: false,
  isGroup: false,
  // Personal thoughts are private until the user chooses otherwise. Masking is not encryption.
  sensitivity: kind === 'thought' ? 'private' : 'standard',
  spatial: null,
  ...patch,
});

function commit(state: MindState, patch: Partial<MindState>, action: string, detail: string): Partial<MindState> {
  const entry: ChangeEntry = {
    id: makeId('change'), at: stamp(), action, detail,
    nodeCount: (patch.nodes ?? state.nodes).length,
    edgeCount: (patch.edges ?? state.edges).length,
  };
  return {
    ...patch,
    past: [...state.past.slice(-59), snapshot(state)],
    future: [],
    changeLog: [entry, ...state.changeLog].slice(0, 300),
  };
}

export const useMindStore = create<MindState>((set, get) => ({
  nodes: clone(seedNodes) as MindNode[],
  edges: clone(seedEdges) as MindEdge[],
  past: [],
  future: [],
  changeLog: [{ id: 'initial', at: stamp(), action: 'Workspace opened', detail: 'Starter conceptual map loaded.', nodeCount: seedNodes.length, edgeCount: seedEdges.length }],
  clipboard: null,
  activeScenario: null,
  simulationRunning: true,
  sensitiveContentVisible: false,
  customCategories: [],
  customRelations: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  captureHistory: (action = 'Graph edit', detail = 'A reversible change was made.') => set((state) => ({
    past: [...state.past.slice(-59), snapshot(state)],
    future: [],
    changeLog: [{ id: makeId('change'), at: stamp(), action, detail, nodeCount: state.nodes.length, edgeCount: state.edges.length }, ...state.changeLog].slice(0, 300),
  })),

  onNodesChange: (changes) => set((state) => {
    const removed = changes.some((change) => change.type === 'remove');
    const nextNodes = applyNodeChanges(changes, state.nodes) as MindNode[];
    if (!removed) return { nodes: nextNodes };
    const removedIds = new Set(state.nodes.filter((node) => !nextNodes.some((next) => next.id === node.id)).map((node) => node.id));
    return commit(state, {
      nodes: nextNodes,
      edges: state.edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)),
    }, 'Nodes removed', `${removedIds.size} node(s) deleted.`);
  }),

  onEdgesChange: (changes) => set((state) => {
    const nextEdges = applyEdgeChanges(changes, state.edges) as MindEdge[];
    if (!changes.some((change) => change.type === 'remove')) return { edges: nextEdges };
    return commit(state, { edges: nextEdges }, 'Relationship removed', `${state.edges.length - nextEdges.length} relationship(s) deleted.`);
  }),

  addNode: (kind, position, label, patch) => {
    const id = makeId(kind);
    const newNode: MindNode = {
      id, type: 'mind', position, selected: true,
      data: blankData(kind, label, patch),
    };
    set((state) => commit(state, {
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), newNode],
      activeScenario: null,
    }, 'Node added', label ?? `New ${NODE_META[kind].label}`));
    return id;
  },

  updateNode: (id, patch, action = 'Node edited') => set((state) => {
    const target = state.nodes.find((node) => node.id === id);
    if (!target) return state;
    return commit(state, {
      nodes: state.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch, updatedAt: stamp() } } : node),
    }, action, target.data.label);
  }),

  addConnection: (connection, relation = 'activates') => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    set((state) => {
      if (state.edges.some((edge) => edge.source === connection.source && edge.target === connection.target && edge.data?.relation === relation)) return state;
      const newEdge: MindEdge = {
        id: makeId('synapse'),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'neural',
        animated: true,
        data: { relation, weight: 0.6, signal: true, direction: 'forward', provenance: 'user-confirmed', confidence: null, createdAt: stamp() },
      };
      return commit(state, { edges: addEdge(newEdge, state.edges) as MindEdge[] }, 'Relationship added', `${relation} (${connection.source} → ${connection.target})`);
    });
  },

  updateEdge: (id, patch) => set((state) => ({
    edges: state.edges.map((edge) => edge.id === id
      ? { ...edge, data: { ...edge.data!, ...patch, updatedAt: stamp() } }
      : edge),
    past: [...state.past.slice(-59), snapshot(state)],
    future: [],
    changeLog: [{ id: makeId('change'), at: stamp(), action: 'Relationship edited', detail: id, nodeCount: state.nodes.length, edgeCount: state.edges.length }, ...state.changeLog].slice(0, 300),
  })),

  reverseEdge: (id) => set((state) => commit(state, {
    edges: state.edges.map((edge) => edge.id === id ? { ...edge, source: edge.target, target: edge.source } : edge),
  }, 'Relationship direction reversed', id)),

  deleteSelection: () => set((state) => {
    const nodeIds = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id));
    const edgeIds = new Set(state.edges.filter((edge) => edge.selected).map((edge) => edge.id));
    if (!nodeIds.size && !edgeIds.size) return state;
    return commit(state, {
      nodes: state.nodes.filter((node) => !nodeIds.has(node.id)),
      edges: state.edges.filter((edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)),
      activeScenario: null,
    }, 'Selection deleted', `${nodeIds.size} node(s), ${edgeIds.size} relationship(s)`);
  }),

  deleteNode: (id) => set((state) => commit(state, {
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    activeScenario: null,
  }, 'Node deleted', id)),

  deleteEdge: (id) => set((state) => commit(state, {
    edges: state.edges.filter((edge) => edge.id !== id),
  }, 'Relationship removed', id)),

  copySelection: () => {
    const selectedNodes = get().nodes.filter((node) => node.selected);
    const ids = new Set(selectedNodes.map((node) => node.id));
    const selectedEdges = get().edges.filter((edge) => edge.selected || (ids.has(edge.source) && ids.has(edge.target)));
    set({ clipboard: { nodes: clone(selectedNodes), edges: clone(selectedEdges) } });
  },

  cutSelection: () => { get().copySelection(); get().deleteSelection(); },

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
      ...clone(edge), id: makeId('synapse'),
      source: mapping.get(edge.source) ?? edge.source,
      target: mapping.get(edge.target) ?? edge.target,
      selected: false,
    }));
    set((state) => {
      const ids = new Set([...state.nodes.map((node) => node.id), ...newNodes.map((node) => node.id)]);
      return commit(state, {
        nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...newNodes],
        edges: [...state.edges, ...newEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))],
      }, 'Selection pasted', `${newNodes.length} node(s)`);
    });
  },

  duplicateSelection: () => { get().copySelection(); get().pasteClipboard({ x: 54, y: 42 }); },

  groupSelection: (label = 'Grouped reflection') => {
    const selected = get().nodes.filter((node) => node.selected && !node.data.isGroup);
    if (selected.length < 2) return null;
    const groupId = makeId('group');
    const x = selected.reduce((sum, node) => sum + node.position.x, 0) / selected.length;
    const y = selected.reduce((sum, node) => sum + node.position.y, 0) / selected.length - 120;
    set((state) => commit(state, {
      nodes: [
        ...state.nodes.map((node) => node.selected && !node.data.isGroup ? { ...node, data: { ...node.data, parentId: groupId } } : node),
        {
          id: groupId, type: 'mind', position: { x, y },
          data: blankData('context', label, { isGroup: true, description: 'A logical group. Collapse it to hide its members.' }),
        } as MindNode,
      ],
    }, 'Nodes grouped', `${selected.length} node(s) joined ${label}`));
    return groupId;
  },

  ungroupSelection: () => set((state) => {
    const groups = state.nodes.filter((node) => node.selected && node.data.isGroup);
    if (!groups.length) return state;
    const ids = new Set(groups.map((node) => node.id));
    return commit(state, {
      nodes: state.nodes
        .filter((node) => !ids.has(node.id))
        .map((node) => ids.has(node.data.parentId ?? '') ? { ...node, data: { ...node.data, parentId: undefined } } : node),
    }, 'Group dissolved', `${ids.size} group(s) removed`);
  }),

  toggleLock: (id) => set((state) => ({
    nodes: state.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, locked: !node.data.locked }, draggable: node.data.locked } : node),
    changeLog: [{ id: makeId('change'), at: stamp(), action: 'Position lock toggled', detail: id, nodeCount: state.nodes.length, edgeCount: state.edges.length }, ...state.changeLog].slice(0, 300),
  })),

  toggleCollapse: (id) => set((state) => ({
    nodes: state.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } } : node),
  })),

  applyProposals: ({ nodes, edges, eventId, date }) => {
    const mapping: Record<string, string> = {};
    const created: MindNode[] = [];
    for (const proposal of nodes) {
      const id = makeId(proposal.kind);
      mapping[proposal.tempId] = id;
      created.push({
        id, type: 'mind',
        position: { x: 260 + created.length * 310, y: 220 + (created.length % 3) * 230 },
        data: blankData(proposal.kind, proposal.label, {
          description: proposal.description || 'AI-suggested concept. Review and edit before treating it as part of your map.',
          originalText: proposal.originalText,
          provenance: 'ai-suggested',
          status: 'draft',
          confidence: proposal.confidence,
          intensity: null,
          evidence: proposal.evidence ? [evidenceRefSchema.parse({ eventId, excerpt: proposal.evidence, date })] : [],
        }),
      });
    }
    const createdEdges: MindEdge[] = [];
    for (const proposal of edges) {
      const source = mapping[proposal.source] ?? proposal.source;
      const target = mapping[proposal.target] ?? proposal.target;
      if (source === target) continue;
      createdEdges.push({
        id: makeId('synapse'), source, target, type: 'neural', animated: true,
        data: {
          relation: proposal.relation, weight: proposal.weight, explanation: proposal.explanation,
          provenance: 'ai-suggested', confidence: Math.min(proposal.weight, 0.8),
          direction: 'forward', signal: true, createdAt: stamp(),
        },
      });
    }
    set((state) => commit(state, {
      nodes: [...state.nodes, ...created],
      edges: [...state.edges, ...createdEdges],
    }, 'AI proposals added for review', `${created.length} draft node(s), ${createdEdges.length} draft relationship(s)`));
    return mapping;
  },

  acceptNode: (id) => set((state) => commit(state, {
    nodes: state.nodes.map((node) => node.id === id ? {
      ...node, data: { ...node.data, provenance: 'user-confirmed', status: 'active', updatedAt: stamp() },
    } : node),
  }, 'Proposal confirmed', id)),

  correctNode: (id, patch) => set((state) => commit(state, {
    nodes: state.nodes.map((node) => node.id === id ? {
      ...node, data: { ...node.data, ...patch, provenance: 'user-corrected', status: 'active', updatedAt: stamp() },
    } : node),
  }, 'Proposal corrected', id)),

  rejectNode: (id) => set((state) => commit(state, {
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
  }, 'Proposal rejected', id)),

  addCustomCategory: (category) => set((state) => ({
    customCategories: [...state.customCategories.filter((item) => item.id !== category.id), category],
  })),
  addCustomRelation: (relation) => set((state) => ({
    customRelations: [...state.customRelations.filter((item) => item.id !== relation.id), relation],
  })),

  undo: () => set((state) => {
    if (!state.past.length) return state;
    const previous = state.past[state.past.length - 1];
    return {
      nodes: clone(previous.nodes), edges: clone(previous.edges),
      past: state.past.slice(0, -1),
      future: [snapshot(state), ...state.future].slice(0, 60),
      changeLog: [{ id: makeId('change'), at: stamp(), action: 'Undo', detail: 'Reverted the last graph change.', nodeCount: previous.nodes.length, edgeCount: previous.edges.length }, ...state.changeLog].slice(0, 300),
    };
  }),

  redo: () => set((state) => {
    if (!state.future.length) return state;
    const next = state.future[0];
    return {
      nodes: clone(next.nodes), edges: clone(next.edges),
      past: [...state.past, snapshot(state)].slice(-60),
      future: state.future.slice(1),
      changeLog: [{ id: makeId('change'), at: stamp(), action: 'Redo', detail: 'Restored a graph change.', nodeCount: next.nodes.length, edgeCount: next.edges.length }, ...state.changeLog].slice(0, 300),
    };
  }),

  loadProject: (file) => set((state) => commit(state, {
    nodes: file.nodes,
    edges: file.edges,
    customCategories: file.meta?.customCategories ?? [],
    customRelations: file.meta?.customRelations ?? [],
    activeScenario: null,
  }, 'Project loaded', `${file.nodes.length} node(s), ${file.edges.length} relationship(s)`)),

  setActiveScenario: (id) => set({ activeScenario: id }),
  setSimulationRunning: (running) => set({ simulationRunning: running }),

  setSensitiveContentVisible: (visible) => set((state) => ({
    sensitiveContentVisible: visible,
    // Hiding private content also clears any selection that would otherwise keep showing it.
    nodes: visible ? state.nodes : state.nodes.map((node) => (
      node.data.sensitivity === 'private' || node.data.sensitivity === 'sensitive' || node.data.sensitivity === 'restricted'
        ? { ...node, selected: false }
        : node
    )),
  })),

  setNodeSpatial: (id, position) => set((state) => ({
    nodes: state.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, spatial: position, updatedAt: stamp() } } : node),
    changeLog: [{ id: makeId('change'), at: stamp(), action: '3D position updated', detail: id, nodeCount: state.nodes.length, edgeCount: state.edges.length }, ...state.changeLog].slice(0, 300),
  })),

  resetToStarter: () => set((state) => commit(state, {
    nodes: clone(seedNodes) as MindNode[], edges: clone(seedEdges) as MindEdge[], activeScenario: null,
  }, 'Starter map restored', 'The starter conceptual map was reloaded.')),

  clearChangeLog: () => set({ changeLog: [] }),
}));
