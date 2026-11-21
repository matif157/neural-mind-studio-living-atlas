import { create } from 'zustand';
import {
  checkInEntrySchema, clientSettingsSchema, conversationEventSchema, decisionRecordSchema,
  journalEntrySchema, reflectionSchema,
  type AiAnalysis, type CheckInEntry, type ClientSettings, type ConversationEvent,
  type DecisionRecord, type ExerciseState, type JournalEntry, type Reflection,
} from '@shared/schemas';
import type { AiProviderId } from '@shared/domain';
import type { StoredAnalysis } from '../lib/patterns';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type ProposalPayload =
  | { type: 'node'; value: AiAnalysis['proposed_graph_nodes'][number] }
  | { type: 'edge'; value: AiAnalysis['proposed_graph_edges'][number] };

export interface ProposalRecord {
  id: string;
  analysisId: string;
  eventId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
  payload: ProposalPayload;
}

export type NarrativeStatus = 'draft' | 'reviewed' | 'rejected';
export type NarrativeLinkKind = 'same trigger' | 'same body response' | 'same story' | 'same need' | 'repeats over time' | 'contradicts';

export interface NarrativeThread {
  id: string;
  title: string;
  period: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeSegment {
  id: string;
  threadId: string;
  order: number;
  title: string;
  originalText: string;
  whatHappened: string;
  feltBody: string;
  story: string;
  need: string;
  action: string;
  confidence: number;
  status: NarrativeStatus;
}

export interface NarrativeLink {
  id: string;
  fromId: string;
  toId: string;
  kind: NarrativeLinkKind;
  note: string;
  createdAt: string;
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string;
  events: ConversationEvent[];
  analyses: StoredAnalysis[];
  proposals: ProposalRecord[];
  settings: ClientSettings;
  exerciseStates: Record<string, ExerciseState>;
  reflections: Reflection[];
  journalEntries: JournalEntry[];
  checkIns: CheckInEntry[];
  decisionRecords: DecisionRecord[];
  threads: NarrativeThread[];
  segments: NarrativeSegment[];
  links: NarrativeLink[];
  sensitivePrivateMode: boolean;
  streaming: { active: boolean; text: string; status: string };
  hydrated: boolean;
  newConversation: () => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addEvent: (event: ConversationEvent) => void;
  addAnalysis: (record: StoredAnalysis) => void;
  addProposals: (analysisId: string, eventId: string, analysis: AiAnalysis) => void;
  setProposalStatus: (id: string, status: ProposalRecord['status']) => void;
  setProposalPayload: (id: string, payload: ProposalPayload) => void;
  setSettings: (patch: Partial<ClientSettings>) => void;
  setProvider: (provider: AiProviderId) => void;
  setModel: (provider: AiProviderId, model: string) => void;
  saveExerciseState: (state: ExerciseState) => void;
  saveReflection: (reflection: Reflection) => void;
  saveJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  saveCheckIn: (entry: CheckInEntry) => void;
  deleteCheckIn: (id: string) => void;
  saveDecisionRecord: (record: DecisionRecord) => void;
  deleteDecisionRecord: (id: string) => void;
  setSensitivePrivateMode: (enabled: boolean) => void;
  deleteEvent: (id: string) => void;
  updateEventText: (id: string, text: string) => void;
  updateAnalysis: (id: string, patch: Partial<AiAnalysis>) => void;
  setStreaming: (patch: Partial<ConversationState['streaming']>) => void;
  addThread: () => string;
  updateThread: (threadId: string, patch: Partial<Pick<NarrativeThread, 'title' | 'period' | 'rawText'>>) => void;
  deleteThread: (threadId: string) => void;
  splitThread: (threadId: string) => number;
  addSegment: (threadId: string) => string;
  updateSegment: (segmentId: string, patch: Partial<NarrativeSegment>) => void;
  deleteSegment: (segmentId: string) => void;
  addLink: (link: Omit<NarrativeLink, 'id' | 'createdAt'>) => void;
  deleteLink: (linkId: string) => void;
  hydrate: (data: Partial<Pick<ConversationState, 'conversations' | 'activeConversationId' | 'events' | 'analyses' | 'proposals' | 'settings' | 'exerciseStates' | 'reflections' | 'journalEntries' | 'checkIns' | 'decisionRecords' | 'threads' | 'segments' | 'links' | 'sensitivePrivateMode'>>) => void;
  clearConversationsOnly: () => void;
  clearAll: () => void;
}

const id = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

export const NARRATIVE_LINK_KINDS: NarrativeLinkKind[] = [
  'same trigger', 'same body response', 'same story', 'same need', 'repeats over time', 'contradicts',
];

function splitNarrativeText(rawText: string): Array<Pick<NarrativeSegment, 'title' | 'originalText'>> {
  const paragraphs = rawText.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const pieces = paragraphs.length > 1
    ? paragraphs
    : rawText.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  return pieces.map((piece, index) => {
    const firstLine = piece.split('\n')[0].replace(/^[#>*\-\d.\s]+/, '').trim();
    const title = firstLine.length > 0 && firstLine.length <= 64
      ? firstLine
      : `Part ${index + 1}`;
    return { title, originalText: piece };
  });
}

const defaultSettings = clientSettingsSchema.parse({});

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: '',
  events: [],
  analyses: [],
  proposals: [],
  settings: defaultSettings,
  exerciseStates: {},
  reflections: [],
  journalEntries: [],
  checkIns: [],
  decisionRecords: [],
  threads: [],
  segments: [],
  links: [],
  sensitivePrivateMode: false,
  streaming: { active: false, text: '', status: '' },
  hydrated: false,

  newConversation: () => {
    const conversationId = id('conversation');
    set((state) => ({
      conversations: [{ id: conversationId, title: `Reflection ${state.conversations.length + 1}`, createdAt: now(), updatedAt: now() }, ...state.conversations],
      activeConversationId: conversationId,
    }));
    return conversationId;
  },

  setActiveConversation: (activeConversationId) => set({ activeConversationId }),

  deleteConversation: (conversationId) => set((state) => {
    const eventIds = new Set(state.events.filter((event) => event.conversationId === conversationId).map((event) => event.id));
    return {
      conversations: state.conversations.filter((conversation) => conversation.id !== conversationId),
      activeConversationId: state.activeConversationId === conversationId ? (state.conversations.find((item) => item.id !== conversationId)?.id ?? '') : state.activeConversationId,
      events: state.events.filter((event) => event.conversationId !== conversationId),
      analyses: state.analyses.filter((record) => !eventIds.has(record.id)),
      proposals: state.proposals.filter((proposal) => !eventIds.has(proposal.eventId)),
    };
  }),

  addEvent: (event) => set((state) => ({
    events: [...state.events, conversationEventSchema.parse(event)],
    conversations: state.conversations.map((conversation) => conversation.id === event.conversationId
      ? { ...conversation, updatedAt: now(), title: conversation.title === `Reflection ${state.conversations.indexOf(conversation) + 1}` ? event.text.slice(0, 52) : conversation.title }
      : conversation),
  })),

  addAnalysis: (record) => set((state) => ({ analyses: [...state.analyses, record] })),

  addProposals: (analysisId, eventId, analysis) => set((state) => ({
    proposals: [
      ...state.proposals,
      ...analysis.proposed_graph_nodes.map((value) => ({
        id: id('proposal'), analysisId, eventId, createdAt: now(), status: 'pending' as const, payload: { type: 'node' as const, value },
      })),
      ...analysis.proposed_graph_edges.map((value) => ({
        id: id('proposal'), analysisId, eventId, createdAt: now(), status: 'pending' as const, payload: { type: 'edge' as const, value },
      })),
    ],
  })),

  setProposalStatus: (proposalId, status) => set((state) => ({
    proposals: state.proposals.map((proposal) => proposal.id === proposalId ? { ...proposal, status } : proposal),
  })),

  setProposalPayload: (proposalId, payload) => set((state) => ({
    proposals: state.proposals.map((proposal) => proposal.id === proposalId ? { ...proposal, payload, status: 'edited' } : proposal),
  })),

  setSettings: (patch) => set((state) => ({
    settings: clientSettingsSchema.parse({ ...state.settings, ...patch }),
  })),

  setProvider: (provider) => get().setSettings({ provider }),
  setModel: (provider, model) => {
    const settings = get().settings;
    get().setSettings({ modelByProvider: { ...settings.modelByProvider, [provider]: model } });
  },

  saveExerciseState: (exerciseState) => set((state) => ({
    exerciseStates: { ...state.exerciseStates, [exerciseState.exerciseId]: exerciseState },
  })),

  saveReflection: (reflection) => set((state) => ({
    reflections: [...state.reflections, reflectionSchema.parse(reflection)],
  })),

  saveJournalEntry: (entry) => set((state) => ({
    journalEntries: [...state.journalEntries, journalEntrySchema.parse(entry)],
  })),

  updateJournalEntry: (entryId, patch) => set((state) => ({
    journalEntries: state.journalEntries.map((entry) => entry.id === entryId
      ? journalEntrySchema.parse({ ...entry, ...patch, updatedAt: now() })
      : entry),
  })),

  deleteJournalEntry: (entryId) => set((state) => ({
    journalEntries: state.journalEntries.filter((entry) => entry.id !== entryId),
  })),

  saveCheckIn: (entry) => set((state) => ({
    checkIns: [...state.checkIns, checkInEntrySchema.parse(entry)],
  })),

  deleteCheckIn: (entryId) => set((state) => ({
    checkIns: state.checkIns.filter((entry) => entry.id !== entryId),
  })),

  saveDecisionRecord: (record) => set((state) => ({
    decisionRecords: [...state.decisionRecords, decisionRecordSchema.parse(record)],
  })),

  deleteDecisionRecord: (recordId) => set((state) => ({
    decisionRecords: state.decisionRecords.filter((record) => record.id !== recordId),
  })),

  setSensitivePrivateMode: (sensitivePrivateMode) => set({ sensitivePrivateMode }),

  deleteEvent: (eventId) => set((state) => ({
    events: state.events.filter((event) => event.id !== eventId),
    analyses: state.analyses.filter((record) => record.id !== eventId),
    proposals: state.proposals.filter((proposal) => proposal.eventId !== eventId),
  })),

  updateEventText: (eventId, text) => set((state) => ({
    events: state.events.map((event) => event.id === eventId ? { ...event, text } : event),
  })),

  updateAnalysis: (analysisId, patch) => set((state) => ({
    analyses: state.analyses.map((record) => record.id === analysisId
      ? { ...record, analysis: { ...record.analysis, ...patch } }
      : record),
  })),

  setStreaming: (patch) => set((state) => ({ streaming: { ...state.streaming, ...patch } })),

  addThread: () => {
    const threadId = id('thread');
    const timestamp = now();
    set((state) => ({
      threads: [{ id: threadId, title: 'Untitled thread', period: '', rawText: '', createdAt: timestamp, updatedAt: timestamp }, ...state.threads],
    }));
    return threadId;
  },

  updateThread: (threadId, patch) => set((state) => ({
    threads: state.threads.map((thread) => thread.id === threadId ? { ...thread, ...patch, updatedAt: now() } : thread),
  })),

  deleteThread: (threadId) => set((state) => {
    const segmentIds = new Set(state.segments.filter((segment) => segment.threadId === threadId).map((segment) => segment.id));
    return {
      threads: state.threads.filter((thread) => thread.id !== threadId),
      segments: state.segments.filter((segment) => segment.threadId !== threadId),
      links: state.links.filter((link) => !segmentIds.has(link.fromId) && !segmentIds.has(link.toId)),
    };
  }),

  splitThread: (threadId) => {
    const thread = get().threads.find((item) => item.id === threadId);
    if (!thread) return 0;
    const pieces = splitNarrativeText(thread.rawText);
    if (pieces.length === 0) return 0;
    set((state) => {
      const remainingSegments = state.segments.filter((segment) => segment.threadId !== threadId);
      const removedIds = new Set(state.segments.filter((segment) => segment.threadId === threadId).map((segment) => segment.id));
      return {
        segments: [
          ...remainingSegments,
          ...pieces.map((piece, index) => ({
            id: id('segment'), threadId, order: index + 1, title: piece.title,
            originalText: piece.originalText, whatHappened: '', feltBody: '', story: '',
            need: '', action: '', confidence: 0.5, status: 'draft' as const,
          })),
        ],
        links: state.links.filter((link) => !removedIds.has(link.fromId) && !removedIds.has(link.toId)),
      };
    });
    return pieces.length;
  },

  addSegment: (threadId) => {
    const segmentId = id('segment');
    set((state) => ({
      segments: [...state.segments, {
        id: segmentId, threadId,
        order: state.segments.filter((segment) => segment.threadId === threadId).length + 1,
        title: 'New segment', originalText: '', whatHappened: '', feltBody: '', story: '',
        need: '', action: '', confidence: 0.5, status: 'draft',
      }],
    }));
    return segmentId;
  },

  updateSegment: (segmentId, patch) => set((state) => ({
    segments: state.segments.map((segment) => segment.id === segmentId ? { ...segment, ...patch } : segment),
  })),

  deleteSegment: (segmentId) => set((state) => ({
    segments: state.segments.filter((segment) => segment.id !== segmentId),
    links: state.links.filter((link) => link.fromId !== segmentId && link.toId !== segmentId),
  })),

  addLink: (link) => set((state) => {
    const duplicate = state.links.some((item) =>
      (item.fromId === link.fromId && item.toId === link.toId)
      || (item.fromId === link.toId && item.toId === link.fromId));
    if (duplicate) return state;
    return { links: [...state.links, { ...link, id: id('link'), createdAt: now() }] };
  }),

  deleteLink: (linkId) => set((state) => ({ links: state.links.filter((link) => link.id !== linkId) })),

  hydrate: (data) => set({ ...data, hydrated: true }),

  clearConversationsOnly: () => set({
    conversations: [], activeConversationId: '', events: [], analyses: [], proposals: [],
    exerciseStates: {}, reflections: [], journalEntries: [], checkIns: [], decisionRecords: [],
    threads: [], segments: [], links: [],
    streaming: { active: false, text: '', status: '' },
  }),

  clearAll: () => set({
    conversations: [], activeConversationId: '', events: [], analyses: [], proposals: [],
    exerciseStates: {}, reflections: [], journalEntries: [], checkIns: [], decisionRecords: [],
    threads: [], segments: [], links: [],
    sensitivePrivateMode: false,
    streaming: { active: false, text: '', status: '' },
    settings: defaultSettings,
  }),
}));
