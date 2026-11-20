import type { Edge, Node } from '@xyflow/react';

export type MindNodeKind =
  | 'emotion'
  | 'thought'
  | 'memory'
  | 'pattern'
  | 'need'
  | 'body'
  | 'behavior'
  | 'trigger'
  | 'belief'
  | 'context';

export type MindRelation =
  | 'activates'
  | 'intensifies'
  | 'soothes'
  | 'arises from'
  | 'recalls'
  | 'reinforces'
  | 'inhibits'
  | 'signals a need'
  | 'leads to'
  | 'reframes'
  | 'supports'
  | 'conflicts with'
  | 'co-occurs with';

export type ThoughtValence = 'positive' | 'negative' | 'mixed' | 'neutral';

export interface MindNodeData extends Record<string, unknown> {
  label: string;
  kind: MindNodeKind;
  description: string;
  innerVoice: string;
  balancedVoice: string;
  intensity: number;
  valence: ThoughtValence;
  tags: string[];
  source?: string;
  isCore?: boolean;
  createdAt?: string;
}

export interface MindEdgeData extends Record<string, unknown> {
  relation: MindRelation;
  weight: number;
  note?: string;
  signal?: boolean;
}

export type MindNode = Node<MindNodeData, 'mind'>;
export type MindEdge = Edge<MindEdgeData, 'neural'>;

export interface MindScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  nodeIds: string[];
  color: string;
}

export interface MindProjectFile {
  app: 'neural-mind-studio';
  schemaVersion: 1;
  exportedAt: string;
  nodes: MindNode[];
  edges: MindEdge[];
}

export const NODE_META: Record<MindNodeKind, { label: string; color: string; tint: string; icon: string }> = {
  emotion: { label: 'Emotion', color: '#f5b94c', tint: 'rgba(245,185,76,.15)', icon: '◉' },
  thought: { label: 'Thought', color: '#70a7ff', tint: 'rgba(112,167,255,.15)', icon: '✧' },
  memory: { label: 'Memory', color: '#b99aff', tint: 'rgba(185,154,255,.15)', icon: '◈' },
  pattern: { label: 'Pattern', color: '#ff8d68', tint: 'rgba(255,141,104,.15)', icon: '⟳' },
  need: { label: 'Need', color: '#59d3c2', tint: 'rgba(89,211,194,.15)', icon: '◇' },
  body: { label: 'Body signal', color: '#f18db3', tint: 'rgba(241,141,179,.15)', icon: '⌁' },
  behavior: { label: 'Behavior', color: '#81d69b', tint: 'rgba(129,214,155,.15)', icon: '↗' },
  trigger: { label: 'Trigger', color: '#ff6d79', tint: 'rgba(255,109,121,.15)', icon: '⚡' },
  belief: { label: 'Core belief', color: '#b4c0d3', tint: 'rgba(180,192,211,.15)', icon: '◎' },
  context: { label: 'Context', color: '#8ba7bd', tint: 'rgba(139,167,189,.15)', icon: '▧' },
};

export const RELATIONS: MindRelation[] = [
  'activates', 'intensifies', 'soothes', 'arises from', 'recalls', 'reinforces',
  'inhibits', 'signals a need', 'leads to', 'reframes', 'supports', 'conflicts with', 'co-occurs with',
];

export function getMindNodeColor(data: Pick<MindNodeData, 'kind' | 'label'>): string {
  if (data.kind === 'emotion') {
    const label = data.label.toLowerCase();
    const emotionColors: Array<[string[], string]> = [
      [['joy', 'happiness', 'happy', 'gratitude', 'hope', 'excitement'], '#f5c65e'],
      [['sadness', 'sad', 'grief', 'sorrow'], '#70a7ff'],
      [['anxiety', 'worry', 'fear', 'panic'], '#ff9a68'],
      [['anger', 'rage', 'irritation'], '#ff6879'],
      [['regret', 'guilt'], '#b99aff'],
      [['calm', 'relief', 'peace'], '#59d3c2'],
      [['shame', 'embarrassment'], '#e58ab8'],
      [['loneliness', 'isolation'], '#9197e8'],
      [['frustration'], '#f28b68'],
      [['curiosity', 'interest'], '#70d4c4'],
      [['overwhelm', 'overwhelmed'], '#d78ff0'],
    ];
    const match = emotionColors.find(([aliases]) => aliases.some((alias) => label.includes(alias)));
    if (match) return match[1];
  }
  return NODE_META[data.kind].color;
}
