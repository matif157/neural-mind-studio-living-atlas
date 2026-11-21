import type { MindNode, MindNodeKind } from '../types/mind';
import type { SensitivityLevel } from '@shared/domain';

export type Vec3Tuple = [number, number, number];

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

/**
 * Deterministic, stable 3D layout. A node's stored `spatial` position always wins, so a user's
 * manual arrangement survives refresh and never touches the 2D graph coordinates.
 */
export function buildMind3DLayout(nodes: MindNode[]): Map<string, Vec3Tuple> {
  const groups = new Map<MindNodeKind, MindNode[]>();
  for (const node of nodes) {
    const group = groups.get(node.data.kind) ?? [];
    group.push(node);
    groups.set(node.data.kind, group);
  }

  const result = new Map<string, Vec3Tuple>();
  for (const [kind, group] of groups) {
    const anchor = ANCHORS[kind] ?? ANCHORS.context;
    const radial = normalize(anchor);
    const reference: Vec3Tuple = Math.abs(radial[1]) > 0.82 ? [1, 0, 0] : [0, 1, 0];
    const tangent = normalize(cross(radial, reference));
    const bitangent = normalize(cross(radial, tangent));

    // Sort by stable ID so the model doesn't jump between renders or sessions.
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((node, index) => {
      const manual = node.data.spatial;
      if (manual) {
        result.set(node.id, [manual.x, manual.y, manual.z]);
        return;
      }
      const seed = hash(node.id);
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

export function getNodeSensitivity(node: Pick<MindNode, 'data'>): SensitivityLevel {
  const value = node.data.sensitivity;
  if (value === 'restricted' || value === 'sensitive' || value === 'private' || value === 'standard') return value;
  // Older project files have no field: thoughts stay private by default.
  return node.data.kind === 'thought' ? 'private' : 'standard';
}

/** Restricted concepts never enter the standard 3D atlas. Private/sensitive concepts need explicit session consent. */
export function shouldShowNodeInMind3D(node: Pick<MindNode, 'data'>, revealSensitive: boolean): boolean {
  const sensitivity = getNodeSensitivity(node);
  if (sensitivity === 'restricted') return false;
  if (sensitivity === 'sensitive' || sensitivity === 'private') return revealSensitive;
  return true;
}

export function isMaskedInMind3D(node: Pick<MindNode, 'data'>, revealSensitive: boolean): boolean {
  if (shouldShowNodeInMind3D(node, revealSensitive)) return false;
  return getNodeSensitivity(node) !== 'restricted';
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
