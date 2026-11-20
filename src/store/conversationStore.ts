import { create } from 'zustand';
import {
  clientSettingsSchema, conversationEventSchema, reflectionSchema,
  type AiAnalysis, type ClientSettings, type ConversationEvent, type ExerciseState, type Reflection,
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

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string;
  events: ConversationEvent[];
  analyses: StoredAnalysis[];
  proposals: ProposalRecord[];
  settings: ClientSettings;
  exerciseStates: Record<string, ExerciseState>;
  reflections: Reflection[];
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
  deleteEvent: (id: string) => void;
  updateEventText: (id: string, text: string) => void;
  updateAnalysis: (id: string, patch: Partial<AiAnalysis>) => void;
  setStreaming: (patch: Partial<ConversationState['streaming']>) => void;
  hydrate: (data: Partial<Pick<ConversationState, 'conversations' | 'activeConversationId' | 'events' | 'analyses' | 'proposals' | 'settings' | 'exerciseStates' | 'reflections'>>) => void;
  clearConversationsOnly: () => void;
  clearAll: () => void;
}

const id = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

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

  hydrate: (data) => set({ ...data, hydrated: true }),

  clearConversationsOnly: () => set({
    conversations: [], activeConversationId: '', events: [], analyses: [], proposals: [],
    exerciseStates: {}, reflections: [], streaming: { active: false, text: '', status: '' },
  }),

  clearAll: () => set({
    conversations: [], activeConversationId: '', events: [], analyses: [], proposals: [],
    exerciseStates: {}, reflections: [], streaming: { active: false, text: '', status: '' },
    settings: defaultSettings,
  }),
}));
