import type { Edge, Node } from '@xyflow/react';
import {
  getMindNodeColor as colorFor, MIND_RELATIONS, NODE_META as BASE_NODE_META,
  type MindNodeKind, type MindRelation, type NodeMeta, type Valence,
} from '@shared/domain';
import type { MindEdgeData, MindNodeData, ProjectFile } from '@shared/schemas';

export type { MindNodeData, MindEdgeData, ProjectFile };
export type { MindNodeKind, MindRelation, NodeMeta };
export type ThoughtValence = Valence;
export type MindNode = Node<MindNodeData, 'mind'>;
export type MindEdge = Edge<MindEdgeData, 'neural'>;
export type MindScenario = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  nodeIds: string[];
  color: string;
};

export const NODE_META = BASE_NODE_META;
export const RELATIONS: string[] = [...MIND_RELATIONS];
export { colorFor as getMindNodeColor };

export function getNodeMeta(kind: string, custom: Record<string, NodeMeta> = {}): NodeMeta {
  return custom[kind] ?? BASE_NODE_META[kind as MindNodeKind] ?? {
    label: kind,
    color: '#9fb3c8',
    tint: 'rgba(159,179,200,.14)',
    icon: 'circle',
    definition: 'A user-defined category.',
    branch: 'Custom Categories',
  };
}

export function isCustomKind(kind: string): boolean {
  return !(kind in BASE_NODE_META);
}
