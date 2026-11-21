/**
 * Shared domain vocabulary for the Living Mind Atlas.
 * These constants are imported by both the browser client and the API server.
 * No value here represents a diagnosis, a biological measurement or a clinical claim.
 */

export const APP_NAME = 'NEURAL MIND STUDIO';
export const APP_SUBNAME = 'LIVING MIND ATLAS';
export const TAGLINE = 'Explore your mind. Understand your patterns. Discover new ways to think.';
export const SCHEMA_VERSION = 2;

export const MIND_NODE_KINDS = [
  'root', 'emotion', 'thought', 'pattern', 'memory', 'belief', 'identity', 'need',
  'behavior', 'context', 'body', 'goal', 'value', 'coping', 'social', 'situation',
  'exercise', 'knowledge', 'strength', 'reflection', 'conversation', 'safety',
] as const;
export type MindNodeKind = (typeof MIND_NODE_KINDS)[number];

/**
 * Privacy classification for a concept. `standard` content may appear in ordinary views.
 * `private` and `sensitive` content is masked until the user explicitly reveals it for a session.
 * `restricted` content never enters the standard 2D/3D atlas at all.
 * Visual masking is not encryption — it is a shoulder-surfing control, not a cryptographic one.
 */
export const SENSITIVITY_LEVELS = ['standard', 'private', 'sensitive', 'restricted'] as const;
export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

export const MIND_RELATIONS = [
  'activates', 'intensifies', 'soothes', 'arises from', 'recalls', 'reinforces',
  'inhibits', 'signals a need', 'leads to', 'reframes', 'supports', 'conflicts with',
  'co-occurs with', 'associated with', 'evidenced by', 'part of', 'challenges',
  'may indicate', 'context for', 'fulfills', 'contradicts', 'informs',
  // Exploratory relationship-discovery vocabulary. These never mean "proven cause".
  'may influence', 'may trigger', 'occurred before', 'coping response to',
  'alternative explanation', 'requires further exploration',
] as const;
export type MindRelation = (typeof MIND_RELATIONS)[number];

export const PROVENANCE_LABELS = [
  'directly-stated', 'user-confirmed', 'ai-suggested', 'user-corrected', 'uncertain', 'archived', 'seed',
] as const;
export type Provenance = (typeof PROVENANCE_LABELS)[number];

export const NODE_STATUSES = ['active', 'draft', 'archived'] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

/** Privacy is a user-controlled presentation and sharing boundary, not a clinical label. */
export const PRIVACY_LEVELS = ['public', 'private', 'sensitive', 'restricted'] as const;
export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

/** A proposed relationship stays a suggestion until the user reviews it. */
export const EDGE_REVIEW_STATUSES = ['suggested', 'confirmed', 'rejected'] as const;
export type EdgeReviewStatus = (typeof EDGE_REVIEW_STATUSES)[number];

export const VALENCES = ['positive', 'negative', 'mixed', 'neutral'] as const;
export type Valence = (typeof VALENCES)[number];

export const CERTAINTIES = ['directly-stated', 'possible', 'uncertain'] as const;
export type Certainty = (typeof CERTAINTIES)[number];

/**
 * Ten connected dimensions of the personal atlas. A node has one primary dimension for
 * clustering, but relationships can cross any dimension boundary. These are organisational
 * lenses for self-understanding, not clinical categories or biological brain regions.
 */
export const MIND_DIMENSIONS = [
  { id: 'timeline', label: 'Life Timeline', short: 'Timeline', color: '#9fc4ff', icon: 'clock', description: 'Experiences placed in the order you stated. Earlier events are never assumed to cause later ones.', kinds: ['memory', 'situation', 'context', 'conversation'] },
  { id: 'memories', label: 'Memories & Experiences', short: 'Memories', color: '#a8bde0', icon: 'brain', description: 'Experiences you remembered, with the personal meaning and timeframe you chose to record.', kinds: ['memory', 'situation', 'reflection'] },
  { id: 'thoughts', label: 'Thoughts & Beliefs', short: 'Thoughts', color: '#a9b4ff', icon: 'lightbulb', description: 'Recurring thoughts, interpretations, assumptions and internal disagreements, in your own words.', kinds: ['thought', 'belief', 'pattern', 'knowledge'] },
  { id: 'emotion', label: 'Emotional Landscape', short: 'Emotions', color: '#f5b94c', icon: 'heart', description: 'Emotions that can coexist. No single emotion is treated as a personality trait or a cause.', kinds: ['emotion', 'identity', 'safety'] },
  { id: 'body', label: 'Physical & Internal', short: 'Body', color: '#f18db3', icon: 'pulse', description: 'Bodily observations you noticed. Medical interpretation stays separate from personal observation.', kinds: ['body'] },
  { id: 'behaviour', label: 'Behavioural Patterns', short: 'Behaviour', color: '#59d3c2', icon: 'repeat', description: 'Actions and tendencies you reported, described without assuming a single cause.', kinds: ['behavior', 'coping'] },
  { id: 'relationships', label: 'Relationship Patterns', short: 'Relationships', color: '#e0a2c0', icon: 'users', description: 'Your needs, boundaries and interpretations. Never a profile of another person.', kinds: ['social', 'need', 'conversation'] },
  { id: 'imagination', label: 'Imagination & Creativity', short: 'Imagination', color: '#c7a9ff', icon: 'sparkles', description: 'Imagination, ambitious scenarios and creative thinking, kept distinct from repetitive loops and from health.', kinds: ['pattern', 'reflection', 'thought'] },
  { id: 'strengths', label: 'Personal Strengths', short: 'Strengths', color: '#4fd6a8', icon: 'star', description: 'Interests, skills, values and resources you identify — protective factors, not inflated claims.', kinds: ['strength', 'value', 'exercise'] },
  { id: 'decisions', label: 'Decisions & Future', short: 'Decisions', color: '#7fd6a0', icon: 'target', description: 'Education, career, finances, relationships and lifestyle directions you are weighing.', kinds: ['goal', 'context', 'need'] },
] as const;
export type MindDimensionId = (typeof MIND_DIMENSIONS)[number]['id'];
export const MIND_DIMENSION_IDS = MIND_DIMENSIONS.map((item) => item.id) as [MindDimensionId, ...MindDimensionId[]];

/** Primary dimension inferred from a node kind. An explicit `data.dimension` always wins. */
export const KIND_DIMENSION: Record<MindNodeKind, MindDimensionId> = {
  root: 'timeline', emotion: 'emotion', thought: 'thoughts', pattern: 'thoughts',
  memory: 'memories', belief: 'thoughts', identity: 'emotion', need: 'relationships',
  behavior: 'behaviour', context: 'timeline', body: 'body', goal: 'decisions',
  value: 'strengths', coping: 'behaviour', social: 'relationships', situation: 'timeline',
  exercise: 'strengths', knowledge: 'thoughts', strength: 'strengths',
  reflection: 'memories', conversation: 'relationships', safety: 'emotion',
};

export function getNodeDimension(node: { kind: MindNodeKind; dimension?: MindDimensionId | null }): MindDimensionId {
  return node.dimension ?? KIND_DIMENSION[node.kind] ?? 'memories';
}

/** Whether the experience is placed in the past, present, repeated or not yet happening. */
export const TEMPORAL_STATUSES = ['historical', 'current', 'recurring', 'future', 'unknown'] as const;
export type TemporalStatus = (typeof TEMPORAL_STATUSES)[number];

/**
 * Where a statement came from. Only `professionally-established` may represent a clinical
 * fact, and only when the user explicitly supplies that information. No other value is a diagnosis.
 */
export const EVIDENCE_CLASSES = [
  'directly-reported', 'self-believed', 'self-suspected', 'system-hypothesis',
  'user-confirmed', 'professionally-established',
] as const;
export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

/** How well a suggested connection is supported by your own notes — never a severity or risk rating. */
export const CONFIDENCE_BANDS = ['exploratory', 'supported', 'well-supported'] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

export const SUGGESTION_STATUSES = ['pending', 'approved', 'rejected', 'edited'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const TIMELINE_ERAS = [
  'childhood', 'adolescence', 'education', 'employment', 'relationships', 'present', 'future', 'undated',
] as const;
export type TimelineEra = (typeof TIMELINE_ERAS)[number];

export function eraRank(value: string | undefined | null): number {
  const normalized = (value ?? '').toLowerCase().trim();
  const index = TIMELINE_ERAS.indexOf(normalized as TimelineEra);
  return index >= 0 ? index : TIMELINE_ERAS.length - 1;
}

export const WORKSPACES = [
  { id: 'atlas', label: 'Mind Atlas', short: 'Atlas', key: 'A', icon: 'circle' },
  { id: 'universe', label: '3D Cognitive Universe', short: '3D Mind', key: 'B', icon: 'orbit' },
  { id: 'conversation', label: 'Conversation Intelligence', short: 'Conversation', key: 'C', icon: 'users' },
  { id: 'emotions', label: 'Emotion Observatory', short: 'Emotions', key: 'D', icon: 'heart' },
  { id: 'thoughts', label: 'Thought Explorer', short: 'Thoughts', key: 'E', icon: 'lightbulb' },
  { id: 'patterns', label: 'Cognitive Pattern Lab', short: 'Patterns', key: 'F', icon: 'repeat' },
  { id: 'memories', label: 'Memory Atlas', short: 'Memories', key: 'G', icon: 'brain' },
  { id: 'relationships', label: 'Relationship Dynamics', short: 'Relations', key: 'H', icon: 'users' },
  { id: 'behaviour', label: 'Behavioural Systems', short: 'Behaviour', key: 'I', icon: 'arrow' },
  { id: 'body', label: 'Body & Interoception', short: 'Body', key: 'J', icon: 'pulse' },
  { id: 'reflection', label: 'Reflection Studio', short: 'Reflection', key: 'K', icon: 'check' },
  { id: 'growth', label: 'Personal Growth', short: 'Growth', key: 'L', icon: 'target' },
  { id: 'neuroscience', label: 'Neuroscience Explorer', short: 'Neuroscience', key: 'M', icon: 'pulse' },
  { id: 'library', label: 'Evidence Library', short: 'Evidence', key: 'N', icon: 'book' },
  { id: 'analytics', label: 'History & Analytics', short: 'Analytics', key: 'O', icon: 'grid' },
  { id: 'narrative', label: 'Narrative Threads', short: 'Threads', key: 'P', icon: 'compass' },
  { id: 'settings', label: 'Data & Privacy', short: 'Privacy', key: 'Q', icon: 'shield' },
  { id: 'timeline', label: 'Personal Timeline', short: 'Timeline', key: 'R', icon: 'calendar' },
  { id: 'connections', label: 'Connection Explorer', short: 'Connections', key: 'S', icon: 'link' },
  { id: 'loops', label: 'Repetitive Thought Explorer', short: 'Loops', key: 'T', icon: 'repeat' },
  { id: 'triggers', label: 'Trigger & Response Explorer', short: 'Triggers', key: 'U', icon: 'arrow' },
  { id: 'decisions', label: 'Decision Clarity Studio', short: 'Decisions', key: 'V', icon: 'compass' },
  { id: 'journal', label: 'Reflection Journal', short: 'Journal', key: 'W', icon: 'book' },
  { id: 'continuity', label: 'Context & Continuity', short: 'Continuity', key: 'X', icon: 'file' },
  { id: 'checkin', label: 'Emotional & Physical Check-In', short: 'Check-in', key: 'Y', icon: 'pulse' },
  { id: 'privacy', label: 'Sensitive Memory Controls', short: 'Sensitive', key: 'Z', icon: 'lock' },
] as const;
export type WorkspaceId = (typeof WORKSPACES)[number]['id'];

export const GRAPH_VIEWS = [
  { id: 'whole', label: 'Whole Mind', kinds: [] as MindNodeKind[] },
  { id: 'emotion', label: 'Emotion View', kinds: ['emotion'] as MindNodeKind[] },
  { id: 'thought', label: 'Thought View', kinds: ['thought', 'belief', 'pattern'] as MindNodeKind[] },
  { id: 'pattern', label: 'Cognitive Pattern View', kinds: ['pattern', 'coping'] as MindNodeKind[] },
  { id: 'memory', label: 'Memory View', kinds: ['memory', 'context', 'situation'] as MindNodeKind[] },
  { id: 'behavior', label: 'Behaviour View', kinds: ['behavior', 'body', 'social', 'need'] as MindNodeKind[] },
  { id: 'timeline', label: 'Timeline View', kinds: ['emotion', 'thought', 'memory', 'behavior'] as MindNodeKind[] },
  { id: 'strengths', label: 'Strengths View', kinds: ['strength', 'value', 'goal', 'coping'] as MindNodeKind[] },
  { id: 'neural', label: 'Neuronal Anatomy', kinds: ['knowledge'] as MindNodeKind[] },
] as const;
export type GraphViewId = (typeof GRAPH_VIEWS)[number]['id'];

export interface NodeMeta {
  label: string;
  color: string;
  tint: string;
  icon: string;
  definition: string;
  branch: string;
}

export const NODE_META: Record<MindNodeKind, NodeMeta> = {
  root: { label: 'Personal Mind', color: '#dbeafe', tint: 'rgba(219,234,254,.12)', icon: 'circle', definition: 'The personal anchor of this map. It represents the whole reflected experience, not a biological brain.', branch: 'Personal Mind' },
  emotion: { label: 'Emotion', color: '#f5b94c', tint: 'rgba(245,185,76,.15)', icon: 'heart', definition: 'A felt affective state such as sadness, interest, anger or calm. States change over time and are not personality traits.', branch: 'Emotional Network' },
  thought: { label: 'Thought', color: '#a9b4ff', tint: 'rgba(169,180,255,.15)', icon: 'lightbulb', definition: 'A verbal, imagistic or propositional mental event. Original user wording is always preserved separately from interpretations.', branch: 'Thought Network' },
  pattern: { label: 'Cognitive Pattern', color: '#b98cff', tint: 'rgba(185,140,255,.15)', icon: 'repeat', definition: 'A possible recurring way of attending, interpreting or responding. A hypothesis for reflection, never a diagnosis.', branch: 'Cognitive Patterns' },
  memory: { label: 'Memory', color: '#9fb8d8', tint: 'rgba(159,184,216,.15)', icon: 'brain', definition: 'An experience the user described as remembered. Nothing is inferred, recovered or invented by the system.', branch: 'Memory Network' },
  belief: { label: 'Belief', color: '#8f9cff', tint: 'rgba(143,156,255,.15)', icon: 'compass', definition: 'A stated assumption about self, others, relationships, success or the world, or an AI-suggested hypothesis awaiting review.', branch: 'Belief System' },
  identity: { label: 'Identity', color: '#c7a9ff', tint: 'rgba(199,169,255,.15)', icon: 'user', definition: 'Aspects of self-concept and self-image the user chooses to record.', branch: 'Identity & Self-Concept' },
  need: { label: 'Need', color: '#e8c26a', tint: 'rgba(232,194,106,.15)', icon: 'diamond', definition: 'A possible requirement such as safety, rest or connection. Needs are prompts for reflection, not facts.', branch: 'Needs & Motivation' },
  behavior: { label: 'Behaviour', color: '#59d3c2', tint: 'rgba(89,211,194,.15)', icon: 'arrow', definition: 'An action or tendency the user reported. Behaviours are never inferred from emotions alone.', branch: 'Behaviour & Responses' },
  context: { label: 'Context', color: '#8ba7bd', tint: 'rgba(139,167,189,.15)', icon: 'grid', definition: 'Situational or environmental conditions such as workload, uncertainty or timing.', branch: 'Context & Situation' },
  body: { label: 'Body Signal', color: '#f18db3', tint: 'rgba(241,141,179,.15)', icon: 'pulse', definition: 'A bodily sensation the user noticed. Similar sensations can have many causes and are not diagnostic.', branch: 'Physical & Body Experiences' },
  goal: { label: 'Goal', color: '#7fd6a0', tint: 'rgba(127,214,160,.15)', icon: 'target', definition: 'A personally chosen direction or intention.', branch: 'Goals & Development' },
  value: { label: 'Value', color: '#8fd7ff', tint: 'rgba(143,215,255,.15)', icon: 'star', definition: 'A principle or source of meaning the user identifies as important.', branch: 'Belief System' },
  coping: { label: 'Coping & Reflection', color: '#6fd0c0', tint: 'rgba(111,208,192,.15)', icon: 'shield', definition: 'A strategy or exercise the user finds supportive. Educational, not a guaranteed treatment.', branch: 'Coping & Reflection' },
  social: { label: 'Relationship', color: '#e0a2c0', tint: 'rgba(224,162,192,.15)', icon: 'users', definition: 'A person, relationship or social context the user voluntarily described.', branch: 'Social & Relationship Network' },
  situation: { label: 'Situation', color: '#a8b6c8', tint: 'rgba(168,182,200,.15)', icon: 'map', definition: 'A specific event or scene in which an experience occurred.', branch: 'Context & Situation' },
  exercise: { label: 'Exercise', color: '#9fe0b5', tint: 'rgba(159,224,181,.15)', icon: 'check', definition: 'A structured reflective activity with completion state and user response.', branch: 'Coping & Reflection' },
  knowledge: { label: 'Knowledge Domain', color: '#b6c9e8', tint: 'rgba(182,201,232,.15)', icon: 'book', definition: 'An educational lens such as cognitive psychology or neuroscience with explicit limitations.', branch: 'Knowledge Library' },
  strength: { label: 'Strength & Resource', color: '#4fd6a8', tint: 'rgba(79,214,168,.15)', icon: 'shield', definition: 'A capability, supportive relationship, value or resource the user identifies. Protective factors are first-class content.', branch: 'Strengths & Protective Factors' },
  reflection: { label: 'Reflection', color: '#7fe3d0', tint: 'rgba(127,227,208,.15)', icon: 'check', definition: 'A written reflection or completed exercise response, linked to the concepts it concerns.', branch: 'Coping & Reflection' },
  conversation: { label: 'Conversation', color: '#9db9e6', tint: 'rgba(157,185,230,.15)', icon: 'users', definition: 'A conversation record the user chose to analyse. Exact wording and message IDs are preserved.', branch: 'Conversation Records' },
  safety: { label: 'Safety & Support', color: '#ffb27a', tint: 'rgba(255,178,122,.15)', icon: 'shield', definition: 'A user-controlled safety resource or plan entry. Never displayed as a risk score or prediction.', branch: 'Safety & Support' },
};

export const PRIMARY_BRANCHES: Array<{ id: string; label: string; kinds: MindNodeKind[]; color: string }> = [
  { id: 'emotional', label: 'Emotional Network', kinds: ['emotion'], color: '#f5b94c' },
  { id: 'thoughts', label: 'Thought Network', kinds: ['thought'], color: '#a9b4ff' },
  { id: 'patterns', label: 'Cognitive Patterns', kinds: ['pattern'], color: '#b98cff' },
  { id: 'memories', label: 'Memory Network', kinds: ['memory'], color: '#9fb8d8' },
  { id: 'beliefs', label: 'Belief System', kinds: ['belief', 'value'], color: '#8f9cff' },
  { id: 'identity', label: 'Identity & Self-Concept', kinds: ['identity'], color: '#c7a9ff' },
  { id: 'needs', label: 'Needs & Motivation', kinds: ['need', 'goal'], color: '#e8c26a' },
  { id: 'behaviour', label: 'Behaviour & Responses', kinds: ['behavior'], color: '#59d3c2' },
  { id: 'social', label: 'Social & Relationship Network', kinds: ['social', 'conversation'], color: '#e0a2c0' },
  { id: 'body', label: 'Physical & Body-Related Experiences', kinds: ['body'], color: '#f18db3' },
  { id: 'development', label: 'Goals & Personal Development', kinds: ['goal'], color: '#7fd6a0' },
  { id: 'strengths', label: 'Strengths & Protective Factors', kinds: ['strength'], color: '#4fd6a8' },
  { id: 'coping', label: 'Coping & Reflection Strategies', kinds: ['coping', 'exercise', 'reflection'], color: '#6fd0c0' },
  { id: 'safety', label: 'Safety & Support', kinds: ['safety'], color: '#ffb27a' },
];

export const EMOTION_COLORS: Array<{ aliases: string[]; color: string }> = [
  { aliases: ['joy', 'happiness', 'happy', 'gratitude', 'hope', 'excitement', 'pride', 'love', 'affection', 'contentment'], color: '#f5c65e' },
  { aliases: ['sadness', 'sad', 'grief', 'sorrow', 'disappointment', 'loneliness'], color: '#70a7ff' },
  { aliases: ['anxiety', 'worry', 'fear', 'panic', 'overwhelm', 'insecurity'], color: '#ff9a68' },
  { aliases: ['anger', 'rage', 'irritation', 'frustration', 'resentment'], color: '#ff6879' },
  { aliases: ['regret', 'guilt'], color: '#b99aff' },
  { aliases: ['calm', 'relief', 'peace', 'contentment'], color: '#59d3c2' },
  { aliases: ['shame', 'embarrassment', 'guilt'], color: '#e58ab8' },
  { aliases: ['curiosity', 'interest', 'surprise'], color: '#70d4c4' },
  { aliases: ['hopelessness', 'helplessness', 'envy', 'jealousy', 'disgust', 'confusion', 'nostalgia'], color: '#9aa8c4' },
];

export function getMindNodeColor(data: Pick<{ kind: MindNodeKind; label: string }, 'kind' | 'label'>): string {
  if (data.kind === 'emotion') {
    const label = data.label.toLowerCase();
    const match = EMOTION_COLORS.find(({ aliases }) => aliases.some((alias) => label.includes(alias)));
    if (match) return match.color;
  }
  return NODE_META[data.kind]?.color ?? '#8ba7bd';
}

export const AI_PROVIDERS = ['gemini', 'openrouter', 'deepseek', 'local', 'offline'] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_META: Record<AiProviderId, { label: string; credentials: boolean; note: string }> = {
  gemini: { label: 'Google Gemini', credentials: true, note: 'Official Google GenAI SDK. Key stays on the server.' },
  openrouter: { label: 'OpenRouter', credentials: true, note: 'OpenAI-compatible router with many models.' },
  deepseek: { label: 'DeepSeek', credentials: true, note: 'OpenAI-compatible DeepSeek endpoint.' },
  local: { label: 'Local OpenAI-compatible', credentials: false, note: 'For local models such as Ollama or LM Studio.' },
  offline: { label: 'Offline deterministic', credentials: false, note: 'Rule-based analysis; no network, no model. Clearly labelled.' },
};
