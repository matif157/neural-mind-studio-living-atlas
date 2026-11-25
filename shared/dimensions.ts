/**
 * Ten self-reported dimensions of the Personal Mind Atlas.
 *
 * These are organisational lenses for the person's own words. They are not
 * clinical categories, brain regions, or inferred facts. A dimension is a
 * presentation and review aid, never a diagnosis or a biological localisation.
 *
 * `shared/domain.ts` is the single canonical source for the ten lenses. This
 * module keeps the adapter API used by the 2D canvas, the universe workspace
 * and the inspector, and also understands the longer legacy ids from older
 * exports so saved projects keep working.
 */
import {
  getNodeDimension, MIND_DIMENSIONS, MIND_DIMENSION_IDS,
  type MindDimensionId, type MindNodeKind,
} from './domain';

export type PersonalDimensionId = MindDimensionId;
export const PERSONAL_DIMENSIONS = MIND_DIMENSIONS;
export const PERSONAL_DIMENSION_IDS = MIND_DIMENSION_IDS;

/** Legacy hyphenated ids from earlier Personal Mind Atlas exports. */
const LEGACY_DIMENSION_IDS: Record<string, MindDimensionId> = {
  'life-timeline': 'timeline',
  'memories-experiences': 'memories',
  'thoughts-beliefs': 'thoughts',
  'emotional-landscape': 'emotion',
  'physical-internal': 'body',
  'behavioural-patterns': 'behaviour',
  'relationship-patterns': 'relationships',
  'imagination-creativity': 'imagination',
  'personal-strengths': 'strengths',
  'decisions-future': 'decisions',
};

export function normalizeDimensionId(value: string | null | undefined): PersonalDimensionId | null {
  if (!value) return null;
  return LEGACY_DIMENSION_IDS[value] ?? (PERSONAL_DIMENSION_IDS.includes(value as MindDimensionId) ? value as MindDimensionId : null);
}

export function isPersonalDimension(value: string): value is PersonalDimensionId {
  return normalizeDimensionId(value) !== null;
}

/** Primary dimension for a node kind; an explicit stored dimension always wins. */
export function dimensionForKind(kind: MindNodeKind | string): PersonalDimensionId {
  return getNodeDimension({ kind: kind as MindNodeKind });
}

export function dimensionMeta(id: string | null | undefined) {
  const normalized = normalizeDimensionId(id) ?? PERSONAL_DIMENSION_IDS[0];
  return PERSONAL_DIMENSIONS.find((dimension) => dimension.id === normalized) ?? PERSONAL_DIMENSIONS[0];
}

export function dimensionColor(id: string | null | undefined): string {
  return dimensionMeta(id).color;
}

/** Stable 3D anchor per dimension. Presentation-only; never stored in 2D position. */
export function dimensionAnchor(id: string | null | undefined): [number, number, number] {
  const normalized = normalizeDimensionId(id) ?? PERSONAL_DIMENSION_IDS[0];
  const index = PERSONAL_DIMENSIONS.findIndex((dimension) => dimension.id === normalized);
  const safeIndex = index < 0 ? 0 : index;
  const angle = (safeIndex / PERSONAL_DIMENSIONS.length) * Math.PI * 2;
  return [Math.cos(angle) * 9.5, ((safeIndex % 3) - 1) * 2.6, Math.sin(angle) * 9.5];
}
