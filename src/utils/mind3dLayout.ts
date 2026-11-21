import { getNodeDimension, MIND_DIMENSIONS, type MindDimensionId, type MindNodeKind, type SensitivityLevel } from '@shared/domain';
import { timelineEraOf } from '../lib/connectionDiscovery';
import type { MindNode } from '../types/mind';
import { isNodeDisplayable, isNodeMasked, type PrivacyView } from './privacy';

export type Vec3Tuple = [number, number, number];
export type Mind3DLayoutMode = 'constellation' | 'dimension' | 'timeline';

export const MIND3D_LAYOUTS = [
  { id: 'constellation', label: 'Kind constellation', description: 'Current conceptual constellations around the reference sculpture.' },
  { id: 'dimension', label: 'Ten dimensions', description: 'Cluster concepts by their primary life dimension.' },
  { id: 'timeline', label: 'Life timeline', description: 'Lay concepts out by the era you stated. Undated records stay separate.' },
] as const satisfies ReadonlyArray<{ id: Mind3DLayoutMode; label: string; description: string }>;

/**
 * Conceptual constellations arranged around the anatomical reference sculpture.
 * These are NOT coordinates for psychological functions inside the biological brain.
 * Every kind in the shared domain has an anchor so no concept silently disappears in 3D.
 */
const ANCHORS: Record<MindNodeKind, Vec3Tuple> = {
  root: [0, 0.05, 0.9],
  emotion: [-2.95, 1.55, 0.35],
  thought: [2.95, 1.55, 0.3],
  memory: [0.05, 3.05, -1.55],
  pattern: [-2.95, -1.35, -0.9],
  need: [2.95, -1.4, 0.25],
  body: [-1.25, -2.7, 1.9],
  behavior: [1.25, -2.7, -1.9],
  situation: [-3.35, 0.1, 1.95],
  context: [0.0, 0.0, -3.75],
  belief: [3.35, 0.05, 1.9],
  identity: [3.6, 1.9, -1.4],
  goal: [2.2, -2.9, -1.2],
  value: [3.05, 2.75, 0.9],
  coping: [-2.3, -2.85, -1.55],
  social: [-1.05, 2.85, 2.2],
  exercise: [-3.4, 2.7, -0.35],
  knowledge: [0.0, 3.9, 1.35],
  strength: [1.45, 3.2, 2.15],
  reflection: [-3.6, -0.55, 2.55],
  conversation: [3.6, -0.45, -2.5],
  safety: [-2.0, 0.65, 3.1],
};

/** Ten equal-status lenses. No dimension is placed "inside" or "above" another. */
const DIMENSION_ANCHORS: Record<MindDimensionId, Vec3Tuple> = {
  timeline: [-4.1, 1.5, 2.3],
  memories: [-2.55, 3.15, 1.2],
  thoughts: [-0.7, 3.9, 0.1],
  emotion: [1.25, 3.35, -0.9],
  body: [3.05, 2.35, -1.7],
  behaviour: [4.0, 0.45, 1.5],
  relationships: [2.7, -1.85, 2.6],
  imagination: [0.6, -3.15, 1.7],
  strengths: [-1.6, -3.0, 2.35],
  decisions: [-3.55, -1.55, 2.9],
};

const TIMELINE_ANCHORS: Record<string, Vec3Tuple> = {
  childhood: [-4.6, 0.9, 2.9],
  adolescence: [-3.25, -0.45, 3.25],
  education: [-1.95, 1.05, 3.5],
  employment: [-0.65, -0.55, 3.7],
  relationships: [0.7, 1.1, 3.5],
  present: [2.0, -0.35, 3.3],
  future: [3.4, 1.0, 2.95],
  undated: [4.6, -1.15, 2.7],
};

export const MIND3D_DIMENSION_VIEWS = MIND_DIMENSIONS.map((dimension) => ({
  id: dimension.id,
  label: dimension.label,
  short: dimension.short,
  color: dimension.color,
  description: dimension.description,
}));

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function normalize(v: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(...v) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function placeGroups(
  groups: Map<string, MindNode[]>,
  anchorFor: (key: string) => Vec3Tuple,
  respectSpatial: boolean,
): Map<string, Vec3Tuple> {
  const result = new Map<string, Vec3Tuple>();
  for (const [key, group] of groups) {
    const anchor = anchorFor(key);
    const radial = normalize(anchor);
    const reference: Vec3Tuple = Math.abs(radial[1]) > 0.82 ? [1, 0, 0] : [0, 1, 0];
    const tangent = normalize(cross(radial, reference));
    const bitangent = normalize(cross(radial, tangent));

    // Sort by stable ID so the model doesn't jump between renders or sessions.
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((node, index) => {
      const manual = node.data.spatial;
      if (respectSpatial && manual) {
        result.set(node.id, [manual.x, manual.y, manual.z]);
        return;
      }
      const seed = hash(`${key}:${node.id}`);
      const angle = index * GOLDEN_ANGLE + (seed % 1000) / 1000;
      const ring = 0.18 + Math.sqrt(index) * 0.115;
      const radialJitter = ((seed % 101) / 100 - 0.5) * 0.15;
      const u = Math.cos(angle) * ring;
      const v = Math.sin(angle) * ring;
      result.set(node.id, [
        anchor[0] + tangent[0] * u + bitangent[0] * v + radial[0] * radialJitter,
        anchor[1] + tangent[1] * u + bitangent[1] * v + radial[1] * radialJitter,
        anchor[2] + tangent[2] * u + bitangent[2] * v + radial[2] * radialJitter,
      ]);
    });
  }
  return result;
}

export interface BuildMind3DLayoutOptions {
  mode?: Mind3DLayoutMode;
}

/**
 * Deterministic 3D layout. In the default constellation a stored `spatial` position always
 * wins, so a user's manual arrangement survives refresh and never touches 2D coordinates.
 * Dimension and timeline modes intentionally recalculate positions so those lenses stay readable.
 */
export function buildMind3DLayout(nodes: MindNode[], options: BuildMind3DLayoutOptions = {}): Map<string, Vec3Tuple> {
  const mode = options.mode ?? 'constellation';
  if (mode === 'dimension') {
    const groups = new Map<string, MindNode[]>();
    for (const node of nodes) {
      const key = getNodeDimension({ kind: node.data.kind, dimension: node.data.dimension });
      groups.set(key, [...(groups.get(key) ?? []), node]);
    }
    return placeGroups(groups, (key) => DIMENSION_ANCHORS[key as MindDimensionId] ?? DIMENSION_ANCHORS.memories, false);
  }
  if (mode === 'timeline') {
    const groups = new Map<string, MindNode[]>();
    for (const node of nodes) {
      const key = node.data.era ?? timelineEraOf(node);
      groups.set(key, [...(groups.get(key) ?? []), node]);
    }
    return placeGroups(groups, (key) => TIMELINE_ANCHORS[key] ?? TIMELINE_ANCHORS.undated, false);
  }
  const groups = new Map<string, MindNode[]>();
  for (const node of nodes) {
    groups.set(node.data.kind, [...(groups.get(node.data.kind) ?? []), node]);
  }
  return placeGroups(groups, (key) => ANCHORS[key as MindNodeKind] ?? ANCHORS.context, true);
}

export function getNodeSensitivity(node: Pick<MindNode, 'data'>): SensitivityLevel {
  const value = node.data.sensitivity;
  if (value === 'restricted' || value === 'sensitive' || value === 'private' || value === 'standard') return value;
  // Older project files have no field: thoughts stay private by default.
  return node.data.kind === 'thought' ? 'private' : 'standard';
}

function asPrivacyView(view: PrivacyView | boolean): PrivacyView {
  return typeof view === 'boolean'
    ? { revealSensitive: view, privateMode: false, hiddenKinds: [] }
    : view;
}

/** Restricted concepts never enter the standard 3D atlas. Boolean form is kept for older callers. */
export function shouldShowNodeInMind3D(node: MindNode, view: PrivacyView | boolean): boolean {
  return isNodeDisplayable(node, asPrivacyView(view));
}

export function isMaskedInMind3D(node: MindNode, view: PrivacyView | boolean): boolean {
  return isNodeMasked(node, asPrivacyView(view));
}

export const MIND3D_VIEWS = [
  { id: 'all', label: 'Whole mind', kinds: null },
  { id: 'emotion', label: 'Emotions', kinds: ['emotion'] },
  { id: 'thought', label: 'Thoughts', kinds: ['thought', 'belief', 'identity'] },
  { id: 'memory', label: 'Memories', kinds: ['memory', 'situation', 'context'] },
  { id: 'pattern', label: 'Patterns', kinds: ['pattern', 'coping'] },
  { id: 'body', label: 'Body & behaviour', kinds: ['body', 'behavior'] },
  { id: 'meaning', label: 'Beliefs & needs', kinds: ['belief', 'need', 'value', 'goal'] },
  { id: 'social', label: 'Relationships', kinds: ['social', 'conversation'] },
  { id: 'strengths', label: 'Strengths', kinds: ['strength', 'coping', 'reflection'] },
  { id: 'support', label: 'Safety & support', kinds: ['safety', 'knowledge', 'exercise'] },
] as const satisfies ReadonlyArray<{ id: string; label: string; kinds: readonly MindNodeKind[] | null }>;

export type Mind3DViewId = (typeof MIND3D_VIEWS)[number]['id'];
