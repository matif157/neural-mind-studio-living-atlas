/**
 * Ten self-reported dimensions of the Personal Mind Atlas.
 *
 * These are organisational lenses for the person's own words. They are not
 * clinical categories, brain regions, or inferred facts. A dimension is a
 * presentation and review aid, never a diagnosis or a biological localisation.
 */
import type { MindNodeKind } from './domain';

export const PERSONAL_DIMENSIONS = [
  {
    id: 'life-timeline',
    label: 'Life Timeline',
    short: 'Timeline',
    color: '#7dd3fc',
    icon: 'clock',
    description: 'Events, situations and dated context the person chose to record.',
    kinds: ['situation', 'context'],
  },
  {
    id: 'memories-experiences',
    label: 'Memories & Experiences',
    short: 'Memories',
    color: '#a78bfa',
    icon: 'brain',
    description: 'Experiences described as remembered. Nothing is recovered or invented.',
    kinds: ['memory'],
  },
  {
    id: 'thoughts-beliefs',
    label: 'Thoughts & Beliefs',
    short: 'Thoughts',
    color: '#a9b4ff',
    icon: 'lightbulb',
    description: 'Exact reported thoughts, beliefs and values, with interpretations kept separate.',
    kinds: ['thought', 'belief', 'value', 'pattern'],
  },
  {
    id: 'emotional-landscape',
    label: 'Emotional Landscape',
    short: 'Emotions',
    color: '#f5b94c',
    icon: 'heart',
    description: 'Felt emotional states named by the person, with self-rated intensity only.',
    kinds: ['emotion'],
  },
  {
    id: 'physical-internal',
    label: 'Physical & Internal Experiences',
    short: 'Body',
    color: '#f18db3',
    icon: 'pulse',
    description: 'Bodily or interoceptive observations, never medical findings.',
    kinds: ['body'],
  },
  {
    id: 'behavioural-patterns',
    label: 'Behavioural Patterns',
    short: 'Behaviour',
    color: '#59d3c2',
    icon: 'repeat',
    description: 'Reported actions, responses and reflection strategies across time.',
    kinds: ['behavior', 'coping'],
  },
  {
    id: 'relationship-patterns',
    label: 'Relationship Patterns',
    short: 'Relationships',
    color: '#e0a2c0',
    icon: 'users',
    description: 'Relationships and social contexts the person voluntarily described.',
    kinds: ['social', 'need'],
  },
  {
    id: 'imagination-creativity',
    label: 'Imagination & Creativity',
    short: 'Imagination',
    color: '#f0abfc',
    icon: 'sparkles',
    description: 'Imagined scenarios, creative material and educational lenses for exploration.',
    kinds: ['knowledge', 'exercise'],
  },
  {
    id: 'personal-strengths',
    label: 'Personal Strengths',
    short: 'Strengths',
    color: '#7fd6a0',
    icon: 'star',
    description: 'User-identified strengths, values and supportive strategies.',
    kinds: ['value', 'coping'],
  },
  {
    id: 'decisions-future',
    label: 'Decisions & Future Direction',
    short: 'Future',
    color: '#8fd7ff',
    icon: 'target',
    description: 'Chosen directions, goals and revisable next steps.',
    kinds: ['goal'],
  },
] as const;

export type PersonalDimensionId = (typeof PERSONAL_DIMENSIONS)[number]['id'];

export const PERSONAL_DIMENSION_IDS = [
  'life-timeline',
  'memories-experiences',
  'thoughts-beliefs',
  'emotional-landscape',
  'physical-internal',
  'behavioural-patterns',
  'relationship-patterns',
  'imagination-creativity',
  'personal-strengths',
  'decisions-future',
] as const satisfies readonly PersonalDimensionId[];

const KIND_TO_DIMENSION: Record<string, PersonalDimensionId> = {
  root: 'decisions-future',
  situation: 'life-timeline',
  context: 'life-timeline',
  memory: 'memories-experiences',
  thought: 'thoughts-beliefs',
  belief: 'thoughts-beliefs',
  pattern: 'thoughts-beliefs',
  value: 'personal-strengths',
  emotion: 'emotional-landscape',
  body: 'physical-internal',
  behavior: 'behavioural-patterns',
  coping: 'behavioural-patterns',
  social: 'relationship-patterns',
  need: 'relationship-patterns',
  knowledge: 'imagination-creativity',
  exercise: 'imagination-creativity',
  goal: 'decisions-future',
};

export function isPersonalDimension(value: string): value is PersonalDimensionId {
  return PERSONAL_DIMENSIONS.some((dimension) => dimension.id === value);
}

export function dimensionForKind(kind: MindNodeKind | string): PersonalDimensionId {
  return KIND_TO_DIMENSION[kind] ?? 'life-timeline';
}

export function dimensionMeta(id: PersonalDimensionId) {
  return PERSONAL_DIMENSIONS.find((dimension) => dimension.id === id) ?? PERSONAL_DIMENSIONS[0];
}

export function dimensionColor(id: PersonalDimensionId): string {
  return dimensionMeta(id).color;
}

/** Stable 3D anchor per dimension. Presentation-only; never stored in 2D position. */
export function dimensionAnchor(id: PersonalDimensionId): [number, number, number] {
  const index = PERSONAL_DIMENSIONS.findIndex((dimension) => dimension.id === id);
  const safeIndex = index < 0 ? 0 : index;
  const angle = (safeIndex / PERSONAL_DIMENSIONS.length) * Math.PI * 2;
  return [Math.cos(angle) * 9.5, ((safeIndex % 3) - 1) * 2.6, Math.sin(angle) * 9.5];
}
