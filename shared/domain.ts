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
  'exercise', 'knowledge',
] as const;
export type MindNodeKind = (typeof MIND_NODE_KINDS)[number];

export const MIND_RELATIONS = [
  'activates', 'intensifies', 'soothes', 'arises from', 'recalls', 'reinforces',
  'inhibits', 'signals a need', 'leads to', 'reframes', 'supports', 'conflicts with',
  'co-occurs with', 'associated with', 'evidenced by', 'part of', 'challenges',
  'may indicate', 'context for', 'fulfills', 'contradicts', 'informs',
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

export const WORKSPACES = [
  { id: 'atlas', label: 'Living Mind Map', short: 'Atlas', key: 'A' },
  { id: 'conversation', label: 'AI Conversation', short: 'Conversation', key: 'B' },
  { id: 'emotions', label: 'Emotional Observatory', short: 'Emotions', key: 'C' },
  { id: 'thoughts', label: 'Thought Explorer', short: 'Thoughts', key: 'D' },
  { id: 'memories', label: 'Memory Atlas', short: 'Memories', key: 'E' },
  { id: 'patterns', label: 'Pattern Intelligence', short: 'Patterns', key: 'F' },
  { id: 'reflection', label: 'Reflection Studio', short: 'Reflection', key: 'G' },
  { id: 'neuroscience', label: 'Neuroscience Explorer', short: 'Neuroscience', key: 'H' },
  { id: 'library', label: 'Knowledge Library', short: 'Library', key: 'I' },
  { id: 'settings', label: 'Settings & Data Control', short: 'Settings', key: 'J' },
  { id: 'narrative', label: 'Narrative Threads', short: 'Threads', key: 'K' },
  { id: 'universe', label: 'Personal Cognitive Universe', short: 'Universe', key: 'L' },
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
  { id: 'social', label: 'Social & Relationship Network', kinds: ['social'], color: '#e0a2c0' },
  { id: 'body', label: 'Physical & Body-Related Experiences', kinds: ['body'], color: '#f18db3' },
  { id: 'development', label: 'Goals & Personal Development', kinds: ['goal'], color: '#7fd6a0' },
  { id: 'coping', label: 'Coping & Reflection Strategies', kinds: ['coping', 'exercise'], color: '#6fd0c0' },
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
