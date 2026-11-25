import {
  dimensionAnchor, dimensionColor, dimensionForKind, normalizeDimensionId,
  type PersonalDimensionId,
} from '@shared/dimensions';
import type { PrivacyLevel } from '@shared/domain';
import type { MindEdge, MindNode } from '../types/mind';
import { effectivePrivacy } from '../utils/privacy';

export type CameraPreset = 'front' | 'side' | 'top' | 'iso';

export interface VisibilityOptions {
  secureView?: boolean;
  dimension?: PersonalDimensionId | 'all';
  query?: string;
}

export interface Point3 { x: number; y: number; z: number }

export function nodePrivacy(node: MindNode): PrivacyLevel {
  return node.data.privacy ?? 'private';
}

/**
 * Both vocabularies must agree before wording leaves secure view. `private`
 * is the default local storage state and stays visible; `private` sensitivity
 * on a thought is masked in the full 3D workspace, so the accessible universe
 * applies the same effective level rather than reading `privacy` alone.
 */
function isProtectedOutsideSecureView(node: MindNode): boolean {
  return effectivePrivacy(node) !== 'standard';
}

export function nodeDimension(node: MindNode): PersonalDimensionId {
  return normalizeDimensionId(node.data.dimension) ?? dimensionForKind(node.data.kind);
}

/** No personal wording for sensitive or restricted nodes leaves the secure view. */
export function displayLabel(node: MindNode, secureView = false): string {
  if (!secureView && isProtectedOutsideSecureView(node)) return 'Sensitive entry';
  return node.data.label;
}

function matchesQuery(node: MindNode, query: string, secureView: boolean): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  if (!secureView && isProtectedOutsideSecureView(node)) return false;
  return [displayLabel(node, secureView), node.data.description, node.data.kind, ...node.data.tags]
    .join(' ').toLowerCase().includes(term);
}

export function isVisibleIn3D(node: MindNode, options: VisibilityOptions = {}): boolean {
  if (!options.secureView && isProtectedOutsideSecureView(node)) return false;
  if (options.dimension && options.dimension !== 'all' && nodeDimension(node) !== options.dimension) return false;
  if (options.query && !matchesQuery(node, options.query, Boolean(options.secureView))) return false;
  return true;
}

export const EDGE_VISUAL_COLORS = {
  confirmed: '#78cbd5',
  suggested: '#f5b94c',
  structural: '#4c617c',
  excluded: '#d98ba0',
} as const;

export type EdgeVisualState = keyof typeof EDGE_VISUAL_COLORS;

/**
 * Any relationship that has not been approved by the person is speculative —
 * whichever compatibility field recorded it. Seed and legacy edges without an
 * `approval` field are confirmed; only an explicit pending/rejected status or
 * an AI/system origin makes an edge speculative.
 */
export function isSpeculativeEdge(edge: MindEdge): boolean {
  const data = edge.data;
  if (!data || data.structural === true) return false;
  return data.review === 'suggested'
    || data.approval === 'pending'
    || data.provenance === 'ai-suggested'
    || data.evidenceClass === 'system-hypothesis';
}

export function isExcludedEdge(edge: MindEdge): boolean {
  const data = edge.data;
  if (!data) return true;
  return data.review === 'rejected'
    || data.approval === 'rejected'
    || data.signal === false;
}

export function edgeVisualState(edge: MindEdge): EdgeVisualState {
  if (edge.data?.structural === true) return 'structural';
  if (isSpeculativeEdge(edge)) return 'suggested';
  if (isExcludedEdge(edge)) return 'excluded';
  return 'confirmed';
}

/**
 * Structural, suggested, rejected and non-signalling relationships never
 * propagate signal and never enter loop, hub or AI context calculations.
 */
export function isSignalEdge(edge: MindEdge): boolean {
  return edgeVisualState(edge) === 'confirmed';
}

export function filterGraphFor3D(nodes: MindNode[], edges: MindEdge[], options: VisibilityOptions = {}) {
  const visibleNodes = nodes.filter((node) => isVisibleIn3D(node, options));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    hiddenCount: nodes.length - visibleNodes.length,
    signalEdges: visibleEdges.filter(isSignalEdge),
    suggestedEdges: visibleEdges.filter(isSpeculativeEdge),
  };
}

export function stableHash(value: string): number {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Presentation positions. `pos3` is used when the user has explicitly placed a
 * node in 3D; otherwise layout is deterministic. The 2D `position` is never read
 * or written here, so the two spatial systems stay independent.
 */
export function layout3D(nodes: MindNode[]): Map<string, Point3 & { dimension: PersonalDimensionId; color: string }> {
  const result = new Map<string, Point3 & { dimension: PersonalDimensionId; color: string }>();
  const counters = new Map<PersonalDimensionId, number>();
  for (const node of nodes) {
    const dimension = nodeDimension(node);
    const index = counters.get(dimension) ?? 0;
    counters.set(dimension, index + 1);
    const anchor = dimensionAnchor(dimension);
    const hash = stableHash(node.id);
    const angle = ((hash % 720) / 720) * Math.PI * 2 + index * 0.55;
    const radius = 2.1 + (((hash >>> 8) % 100) / 100) * 3.2;
    const fallback = {
      x: anchor[0] + Math.cos(angle) * radius,
      y: anchor[1] + ((((hash >>> 4) % 100) / 100) - 0.5) * 4.2,
      z: anchor[2] + Math.sin(angle) * radius,
    };
    const point = node.data.pos3 ?? fallback;
    result.set(node.id, { ...point, dimension, color: dimensionColor(dimension) });
  }
  return result;
}

export function cameraPreset(preset: CameraPreset): { position: [number, number, number]; target: [number, number, number] } {
  const presets: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
    front: { position: [0, 2, 26], target: [0, 0, 0] },
    side: { position: [26, 2, 0], target: [0, 0, 0] },
    top: { position: [0, 28, 0.01], target: [0, 0, 0] },
    iso: { position: [18, 15, 20], target: [0, 0, 0] },
  };
  return presets[preset];
}

export interface RelationshipExplanation {
  source: string;
  destination: string;
  type: string;
  supportingInformation: string;
  evidenceClass: string;
  explanation: string;
  confirmationStatus: string;
  signalBearing: boolean;
  structural: boolean;
}

/** Everything the user needs to review a discovered relationship in one place. */
export function explainRelationship(
  edge: MindEdge,
  nodes: MindNode[],
  secureView = false,
): RelationshipExplanation {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  const state = edgeVisualState(edge);
  const confirmationStatus = state === 'suggested'
    ? 'suggested'
    : state === 'structural'
      ? 'structural'
      : state === 'excluded'
        ? (edge.data?.review === 'rejected' || edge.data?.approval === 'rejected' ? 'rejected' : 'not signal-bearing')
        : (edge.data?.review ?? 'confirmed');
  return {
    source: source ? displayLabel(source, secureView) : edge.source,
    destination: target ? displayLabel(target, secureView) : edge.target,
    type: edge.data?.customRelation ?? edge.data?.relation ?? 'unspecified',
    supportingInformation: edge.data?.evidence.map((item) => item.excerpt).join(' · ') || edge.data?.note || '',
    evidenceClass: edge.data?.provenance ?? 'unspecified',
    explanation: edge.data?.explanation ?? '',
    confirmationStatus,
    signalBearing: state === 'confirmed',
    structural: state === 'structural',
  };
}
