import { z } from 'zod';
import {
  AI_PROVIDERS, CERTAINTIES, CONFIDENCE_BANDS, EDGE_REVIEW_STATUSES,
  EVIDENCE_CLASSES, MIND_DIMENSION_IDS, MIND_NODE_KINDS, MIND_RELATIONS,
  NODE_STATUSES, PRIVACY_LEVELS, PROVENANCE_LABELS, SENSITIVITY_LEVELS,
  SUGGESTION_STATUSES, TEMPORAL_STATUSES, TIMELINE_ERAS, VALENCES,
} from './domain';

/** Versioned, portable graph format. New fields are optional so v1 projects can be migrated. */
export const evidenceRefSchema = z.object({
  eventId: z.string().min(1),
  excerpt: z.string().max(1200),
  date: z.string().min(1),
});

export const mindNodeDataSchema = z.object({
  label: z.string().min(1).max(240),
  kind: z.enum(MIND_NODE_KINDS),
  description: z.string().max(4000).default(''),
  innerVoice: z.string().max(2000).default(''),
  balancedVoice: z.string().max(2000).default(''),
  intensity: z.number().min(0).max(1).nullable().default(null),
  valence: z.enum(VALENCES).default('neutral'),
  tags: z.array(z.string().max(80)).max(60).default([]),
  source: z.string().max(200).optional(),
  isCore: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  definition: z.string().max(2000).optional(),
  originalText: z.string().max(4000).optional(),
  context: z.string().max(2000).optional(),
  userNote: z.string().max(4000).optional(),
  provenance: z.enum(PROVENANCE_LABELS).default('seed'),
  status: z.enum(NODE_STATUSES).default('active'),
  confidence: z.number().min(0).max(1).nullable().default(null),
  frequency: z.number().int().min(0).optional(),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  evidence: z.array(evidenceRefSchema).max(200).default([]),
  parentId: z.string().optional(),
  isGroup: z.boolean().default(false),
  collapsed: z.boolean().default(false),
  locked: z.boolean().default(false),
  customKind: z.string().max(80).optional(),
  /* ---- Privacy, signal and presentation (2D/3D independent) ---- */
  /** Storage/sharing boundary. Default is private for new personal material. */
  privacy: z.enum(PRIVACY_LEVELS).default('private'),
  /** 3D-layer sensitivity classification, falling back to the kind default when absent. */
  sensitivity: z.enum(SENSITIVITY_LEVELS).default('standard'),
  /** Danger-signal wording is stored verbatim only for safety signalling, never as identity. */
  safetySignal: z.boolean().default(false),
  /** Presentation-only 3D coordinate. Independent of the 2D position unless explicitly synced. */
  pos3: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }).optional(),
  /** Optional independent 3D presentation position used by the full-bleed 3D workspace. */
  spatial: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
  }).nullable().default(null),

  /* ---- Personal-atlas dimensions (all optional: old exports stay valid) ---- */
  /** Primary dimension used for clustering. Never a clinical category or brain region. */
  dimension: z.enum(MIND_DIMENSION_IDS).optional(),
  /** Historical / current / recurring / future / unknown. Never inferred from passage order. */
  temporalStatus: z.enum(TEMPORAL_STATUSES).optional(),
  /** Coarse era or timeframe in the user's own words, e.g. "childhood" or "2019". */
  timePeriod: z.string().max(80).optional(),
  /** Standardised era bucket used by the timeline workspace. */
  era: z.enum(TIMELINE_ERAS).optional(),
  /** Where this statement came from. Only the explicit professional value is a clinical fact. */
  evidenceClass: z.enum(EVIDENCE_CLASSES).optional(),
  /** User-facing reason this record was created, kept separate from any system hypothesis. */
  rationale: z.string().max(1200).optional(),
});

export const mindNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('mind'),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  data: mindNodeDataSchema,
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  hidden: z.boolean().optional(),
  selected: z.boolean().optional(),
  draggable: z.boolean().optional(),
  className: z.string().optional(),
});

export const mindEdgeDataSchema = z.object({
  relation: z.enum(MIND_RELATIONS),
  weight: z.number().min(0).max(1),
  note: z.string().max(2000).optional(),
  explanation: z.string().max(2000).optional(),
  signal: z.boolean().default(true),
  direction: z.enum(['forward', 'reverse', 'bidirectional']).default('forward'),
  customRelation: z.string().max(80).optional(),
  provenance: z.enum(PROVENANCE_LABELS).default('seed'),
  confidence: z.number().min(0).max(1).nullable().default(null),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  /** Structural wires organise the map and never carry signal or enter analysis. */
  structural: z.boolean().default(false),
  /** Suggested relationships remain inert until confirmed, corrected or rejected. */
  review: z.enum(EDGE_REVIEW_STATUSES).default('confirmed'),
  evidence: z.array(evidenceRefSchema).max(50).default([]),
  /** Discovery suggestions are pending until the user approves, edits or rejects them. */
  approval: z.enum(SUGGESTION_STATUSES).default('approved'),
  /** Exploratory / supported / well-supported. Never a risk or severity rating. */
  confidenceBand: z.enum(CONFIDENCE_BANDS).optional(),
  evidenceClass: z.enum(EVIDENCE_CLASSES).optional(),
  /** Identifier of the discovery suggestion that produced this link, when applicable. */
  suggestionId: z.string().max(120).optional(),
});

export const mindEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.literal('neural'),
  animated: z.boolean().optional(),
  selected: z.boolean().optional(),
  data: mindEdgeDataSchema,
});

/**
 * A relationship proposed by the offline discovery engine. It is a question, not a finding:
 * `status` starts as pending and nothing is written into the graph until the user approves it.
 */
export const connectionSuggestionSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relation: z.enum(MIND_RELATIONS),
  explanation: z.string().max(2000),
  evidence: z.string().max(2000),
  evidenceClass: z.enum(EVIDENCE_CLASSES).default('system-hypothesis'),
  confidenceBand: z.enum(CONFIDENCE_BANDS).default('exploratory'),
  rationale: z.string().max(1000).default('Structural relationship between concepts you recorded.'),
  status: z.enum(SUGGESTION_STATUSES).default('pending'),
  rule: z.string().max(80).default('manual'),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type ConnectionSuggestion = z.infer<typeof connectionSuggestionSchema>;

export const projectFileSchema = z.object({
  app: z.literal('neural-mind-studio'),
  schemaVersion: z.literal(2),
  exportedAt: z.string(),
  nodes: z.array(mindNodeSchema).max(20000),
  edges: z.array(mindEdgeSchema).max(100000),
  meta: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    exportedBy: z.string().max(100).optional(),
    customCategories: z.array(z.object({
      id: z.string().min(1).max(80),
      label: z.string().min(1).max(120),
      color: z.string().max(30),
      definition: z.string().max(1000).default(''),
      baseKind: z.enum(MIND_NODE_KINDS),
    })).default([]),
    customRelations: z.array(z.object({
      id: z.string().min(1).max(80),
      label: z.string().min(1).max(120),
      baseRelation: z.enum(MIND_RELATIONS),
    })).default([]),
    /** Reviewable connection suggestions. They remain separate from confirmed edges. */
    suggestions: z.array(connectionSuggestionSchema).max(5000).default([]),
  }).optional(),
}).superRefine((file, ctx) => {
  const ids = new Set<string>();
  for (const node of file.nodes) {
    if (ids.has(node.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate node id: ${node.id}` });
    ids.add(node.id);
  }
  const edgeIds = new Set<string>();
  for (const edge of file.edges) {
    if (edgeIds.has(edge.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate edge id: ${edge.id}` });
    edgeIds.add(edge.id);
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Edge ${edge.id} has an invalid endpoint` });
    }
  }
});

export type ProjectFile = z.infer<typeof projectFileSchema>;
export type MindNodeData = z.infer<typeof mindNodeDataSchema>;
export type MindEdgeData = z.infer<typeof mindEdgeDataSchema>;

/** Conversation and provenance records. */
export const conversationEventSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  text: z.string().max(20000),
  originalText: z.string().max(20000).optional(),
  createdAt: z.string(),
  provider: z.enum(AI_PROVIDERS).optional(),
  model: z.string().max(160).optional(),
  consentGranted: z.boolean().default(false),
  fromTranscription: z.boolean().default(false),
  safetyFlags: z.array(z.string().max(60)).default([]),
  analysisId: z.string().optional(),
});
export type ConversationEvent = z.infer<typeof conversationEventSchema>;

export const reflectionSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  title: z.string().max(240),
  body: z.string().max(20000),
  linkedNodeIds: z.array(z.string()).default([]),
  exerciseId: z.string().optional(),
  sourceEventIds: z.array(z.string()).default([]),
});
export type Reflection = z.infer<typeof reflectionSchema>;

/** Personal-atlas records. All remain local and are only persisted with explicit long-term storage. */
export const journalEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  title: z.string().min(1).max(240),
  body: z.string().max(20000),
  kind: z.enum(['reflection', 'context', 'continuity']).default('reflection'),
  temporalStatus: z.enum(TEMPORAL_STATUSES).default('current'),
  evidenceClass: z.enum(EVIDENCE_CLASSES).default('directly-reported'),
  sensitivity: z.enum(SENSITIVITY_LEVELS).default('private'),
  linkedNodeIds: z.array(z.string().max(120)).default([]),
  suggestedNodeIds: z.array(z.string().max(120)).default([]),
  tags: z.array(z.string().max(80)).max(40).default([]),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const checkInEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  situation: z.string().max(2000).default(''),
  emotions: z.array(z.object({ name: z.string().max(120), intensity: z.number().min(0).max(1).nullable().default(null) })).max(30).default([]),
  bodySignals: z.array(z.string().max(120)).max(30).default([]),
  thoughts: z.string().max(4000).default(''),
  response: z.string().max(4000).default(''),
  outcome: z.string().max(4000).default(''),
  linkedNodeIds: z.array(z.string().max(120)).default([]),
  sensitivity: z.enum(SENSITIVITY_LEVELS).default('private'),
});
export type CheckInEntry = z.infer<typeof checkInEntrySchema>;

export const decisionRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  title: z.string().min(1).max(240),
  question: z.string().max(2000).default(''),
  facts: z.string().max(6000).default(''),
  assumptions: z.string().max(6000).default(''),
  possibilities: z.string().max(6000).default(''),
  risks: z.string().max(6000).default(''),
  unknowns: z.string().max(6000).default(''),
  values: z.string().max(6000).default(''),
  reversible: z.string().max(3000).default(''),
  irreversible: z.string().max(3000).default(''),
  shortTerm: z.string().max(3000).default(''),
  longTerm: z.string().max(3000).default(''),
  linkedNodeIds: z.array(z.string().max(120)).default([]),
  sensitivity: z.enum(SENSITIVITY_LEVELS).default('private'),
});
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;

export const exerciseStateSchema = z.object({
  exerciseId: z.string().min(1),
  response: z.string().max(20000).default(''),
  completed: z.boolean().default(false),
  updatedAt: z.string(),
  linkedNodeIds: z.array(z.string()).default([]),
});
export type ExerciseState = z.infer<typeof exerciseStateSchema>;

/** Strict AI output contract. Nothing here may directly mutate the graph. */
const aiEmotionSchema = z.object({
  name: z.string().min(1).max(120),
  evidence: z.string().max(1200),
  confidence: z.number().min(0).max(1),
  intensity: z.number().min(0).max(1).nullable(),
  certainty: z.enum(CERTAINTIES),
}).strict();

const aiThoughtSchema = z.object({
  original_text: z.string().max(4000),
  normalized_text: z.string().max(2000).optional(),
  type: z.string().max(80),
  certainty: z.enum(CERTAINTIES),
}).strict();

const aiPatternSchema = z.object({
  name: z.string().min(1).max(160),
  evidence: z.string().max(1200),
  confidence: z.number().min(0).max(1),
  requires_confirmation: z.boolean().default(true),
}).strict();

const aiNeedSchema = z.object({
  name: z.string().min(1).max(120),
  evidence: z.string().max(1200),
  confidence: z.number().min(0).max(1),
}).strict();

const aiBehaviourSchema = z.object({
  description: z.string().min(1).max(400),
  evidence: z.string().max(1200),
  confidence: z.number().min(0).max(1),
}).strict();

const aiProposedNodeSchema = z.object({
  tempId: z.string().min(1).max(80),
  kind: z.enum(MIND_NODE_KINDS),
  label: z.string().min(1).max(240),
  description: z.string().max(2000).default(''),
  originalText: z.string().max(4000).optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().max(1200).default(''),
}).strict();

const aiProposedEdgeSchema = z.object({
  source: z.string().min(1).max(80),
  target: z.string().min(1).max(80),
  relation: z.enum(MIND_RELATIONS),
  weight: z.number().min(0).max(1).default(0.5),
  explanation: z.string().max(1200).default(''),
  evidence: z.string().max(1200).default(''),
}).strict();

export const SAFETY_FLAGS = ['possible-crisis', 'self-harm', 'harm-to-others', 'medical-symptoms', 'severe-distress'] as const;

export const aiAnalysisSchema = z.object({
  response_to_user: z.string().min(1).max(8000),
  conversation_summary: z.string().min(1).max(2000),
  situation: z.array(z.string().max(600)).max(20).default([]),
  emotions: z.array(aiEmotionSchema).max(30).default([]),
  thoughts: z.array(aiThoughtSchema).max(40).default([]),
  cognitive_patterns: z.array(aiPatternSchema).max(20).default([]),
  possible_needs: z.array(aiNeedSchema).max(20).default([]),
  reported_behaviours: z.array(aiBehaviourSchema).max(20).default([]),
  alternative_perspectives: z.array(z.string().max(1200)).max(20).default([]),
  suggested_exercises: z.array(z.string().max(300)).max(20).default([]),
  professional_support_considerations: z.array(z.string().max(1200)).max(10).default([]),
  proposed_graph_nodes: z.array(aiProposedNodeSchema).max(40).default([]),
  proposed_graph_edges: z.array(aiProposedEdgeSchema).max(100).default([]),
  clarifying_questions: z.array(z.string().max(600)).max(10).default([]),
  safety_flags: z.array(z.enum(SAFETY_FLAGS)).default([]),
}).strict();
export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

export const analysisRequestSchema = z.object({
  conversationId: z.string().min(1).max(120),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().min(1).max(20000),
  })).min(1).max(40),
  consent: z.literal(true),
  context: z.object({
    approvedNodes: z.array(z.object({
      id: z.string().max(120),
      label: z.string().max(240),
      kind: z.string().max(80),
      description: z.string().max(1000),
    })).max(80).default([]),
    approvedEdges: z.array(z.object({
      source: z.string().max(120),
      target: z.string().max(120),
      relation: z.string().max(80),
    })).max(200).default([]),
    recentEvents: z.array(z.object({
      date: z.string().max(60),
      text: z.string().max(1500),
    })).max(20).default([]),
  }).default({ approvedNodes: [], approvedEdges: [], recentEvents: [] }),
  provider: z.enum(AI_PROVIDERS).optional(),
  model: z.string().max(160).optional(),
  stream: z.boolean().default(false),
});
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

export const analysisResponseSchema = z.object({
  analysis: aiAnalysisSchema,
  meta: z.object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string(),
    latencyMs: z.number().int().min(0),
    offline: z.boolean().default(false),
    warnings: z.array(z.string()).default([]),
    promptChars: z.number().int().min(0),
    completionChars: z.number().int().min(0),
    estimatedCostUsd: z.number().min(0).nullable().default(null),
  }),
});
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

export const knowledgeDomainSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  family: z.enum(['medical-clinical', 'psychology', 'therapy-support', 'neuroscience-cognitive']),
  definition: z.string().min(1),
  scope: z.string().min(1),
  concepts: z.array(z.string()).min(1),
  limitations: z.string().min(1),
  related: z.array(z.string()).default([]),
  exercises: z.array(z.string()).default([]),
});
export type KnowledgeDomain = z.infer<typeof knowledgeDomainSchema>;

export const exerciseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
  instructions: z.array(z.string()).min(1),
  durationMinutes: z.number().int().min(1).max(180),
  questions: z.array(z.string()).default([]),
  evidenceInformed: z.boolean().default(true),
  caution: z.string().default('Educational reflection only; not a substitute for professional care.'),
  relatedKinds: z.array(z.enum(MIND_NODE_KINDS)).default([]),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const clientSettingsSchema = z.object({
  aiConsent: z.boolean().default(false),
  longTermMemory: z.boolean().default(false),
  provider: z.enum(AI_PROVIDERS).default('offline'),
  modelByProvider: z.record(z.string()).default({}),
  theme: z.enum(['dark', 'light']).default('dark'),
  reducedMotion: z.boolean().default(false),
  showSignals: z.boolean().default(true),
  contextSharing: z.object({
    approvedNodes: z.boolean().default(false),
    recentEvents: z.boolean().default(false),
  }).default({ approvedNodes: false, recentEvents: false }),
});
export type ClientSettings = z.infer<typeof clientSettingsSchema>;
