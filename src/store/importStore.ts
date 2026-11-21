import { create } from 'zustand';
import type { MindNodeKind, SensitivityLevel } from '@shared/domain';
import { readLocal, STORAGE_KEYS, writeLocal } from '../lib/db';
import {
  defaultSensitivityFor, extractCandidates, segmentPassages,
  type CandidateDraft, type PassageDraft, type SourceFormat,
} from '../lib/historyImport';
import { useConversationStore } from './conversationStore';
import { useMindStore } from './mindStore';

export interface SourceDocument {
  id: string;
  title: string;
  format: SourceFormat;
  originalText: string;
  importedAt: string;
  byteLength: number;
  sensitivity: SensitivityLevel;
}

export interface SourcePassage extends PassageDraft {
  id: string;
  documentId: string;
}

export interface ImportCandidate extends CandidateDraft {
  id: string;
  documentId: string;
  passageId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedNodeId?: string;
}

interface ImportState {
  documents: SourceDocument[];
  passages: SourcePassage[];
  candidates: ImportCandidate[];
  importText: (input: { title: string; format: SourceFormat; text: string; sensitivity: SensitivityLevel }) => { documentId: string; passages: number; candidates: number };
  approveCandidate: (candidateId: string) => string | null;
  rejectCandidate: (candidateId: string) => void;
  approvePassage: (passageId: string) => number;
  deleteDocument: (documentId: string, removeApprovedNodes?: boolean) => void;
  clearImported: () => void;
  hydrate: (data: { documents?: SourceDocument[]; passages?: SourcePassage[]; candidates?: ImportCandidate[] }) => void;
}

const id = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

const SENSITIVITY_RANK: Record<SensitivityLevel, number> = { standard: 0, private: 1, sensitive: 2, restricted: 3 };

function stricter(a: SensitivityLevel, b: SensitivityLevel): SensitivityLevel {
  return SENSITIVITY_RANK[a] >= SENSITIVITY_RANK[b] ? a : b;
}

function persist(state: Pick<ImportState, 'documents' | 'passages' | 'candidates'>) {
  // Imported personal history is only written to disk when the user has enabled long-term memory.
  const allowed = useConversationStore.getState().settings.longTermMemory;
  if (!allowed) {
    void writeLocal(STORAGE_KEYS.history, null);
    return;
  }
  void writeLocal(STORAGE_KEYS.history, {
    documents: state.documents,
    passages: state.passages,
    candidates: state.candidates,
  });
}

function nextPosition(): { x: number; y: number } {
  const nodes = useMindStore.getState().nodes;
  return { x: 300 + (nodes.length % 8) * 195, y: 250 + (nodes.length % 5) * 155 };
}

export const useImportStore = create<ImportState>((set, get) => ({
  documents: [],
  passages: [],
  candidates: [],

  importText: ({ title, format, text, sensitivity }) => {
    const documentId = id('source');
    const document: SourceDocument = {
      id: documentId,
      title: title.trim().slice(0, 200) || `Imported ${format.toUpperCase()} source`,
      format,
      originalText: text,
      importedAt: now(),
      byteLength: new Blob([text]).size,
      sensitivity,
    };
    const passageDrafts = segmentPassages(text, format);
    const passages: SourcePassage[] = passageDrafts.map((draft) => ({ ...draft, id: id('passage'), documentId }));
    const candidates: ImportCandidate[] = passages.flatMap((passage) => extractCandidates(passage).map((candidate) => ({
      ...candidate,
      id: id('candidate'),
      documentId,
      passageId: passage.id,
      status: 'pending' as const,
      createdAt: now(),
    })));

    set((state) => {
      const next = {
        documents: [...state.documents, document],
        passages: [...state.passages, ...passages],
        candidates: [...state.candidates, ...candidates],
      };
      persist(next);
      return next;
    });
    return { documentId, passages: passages.length, candidates: candidates.length };
  },

  approveCandidate: (candidateId) => {
    const candidate = get().candidates.find((item) => item.id === candidateId);
    if (!candidate || candidate.status === 'approved') return candidate?.approvedNodeId ?? null;
    const passage = get().passages.find((item) => item.id === candidate.passageId);
    const document = get().documents.find((item) => item.id === candidate.documentId);
    if (!passage || !document) return null;

    const sensitivity = stricter(document.sensitivity, defaultSensitivityFor(candidate.kind));
    const mind = useMindStore.getState();
    const nodeId = mind.addNode(candidate.kind, nextPosition(), candidate.label, {
      description: candidate.description,
      originalText: candidate.evidenceExcerpt,
      context: passage.chronology.label ?? undefined,
      source: passage.id,
      sensitivity,
      provenance: 'user-confirmed',
      status: 'active',
      tags: ['imported-history', document.title].slice(0, 60),
      evidence: [{
        eventId: passage.id,
        excerpt: candidate.evidenceExcerpt.slice(0, 1200),
        date: passage.chronology.label ?? 'unknown',
      }],
    });

    set((state) => {
      const next = {
        ...state,
        candidates: state.candidates.map((item) => item.id === candidateId
          ? { ...item, status: 'approved' as const, approvedNodeId: nodeId }
          : item),
      };
      persist(next);
      return next;
    });
    return nodeId;
  },

  rejectCandidate: (candidateId) => set((state) => {
    const next = {
      ...state,
      candidates: state.candidates.map((item) => item.id === candidateId ? { ...item, status: 'rejected' as const } : item),
    };
    persist(next);
    return next;
  }),

  approvePassage: (passageId) => {
    const pending = get().candidates.filter((item) => item.passageId === passageId && item.status === 'pending');
    for (const candidate of pending) get().approveCandidate(candidate.id);
    return pending.length;
  },

  deleteDocument: (documentId, removeApprovedNodes = false) => set((state) => {
    const passageIds = new Set(state.passages.filter((item) => item.documentId === documentId).map((item) => item.id));
    const approvedNodeIds = state.candidates
      .filter((item) => item.documentId === documentId && item.approvedNodeId)
      .map((item) => item.approvedNodeId as string);
    if (removeApprovedNodes) {
      const mind = useMindStore.getState();
      for (const nodeId of approvedNodeIds) mind.deleteNode(nodeId);
    }
    const next = {
      documents: state.documents.filter((item) => item.id !== documentId),
      passages: state.passages.filter((item) => item.documentId !== documentId),
      candidates: state.candidates.filter((item) => item.documentId !== documentId && !passageIds.has(item.passageId)),
    };
    persist(next);
    return next;
  }),

  clearImported: () => set(() => {
    const next = { documents: [], passages: [], candidates: [] };
    void writeLocal(STORAGE_KEYS.history, null);
    return next;
  }),

  hydrate: (data) => set({
    documents: Array.isArray(data.documents) ? data.documents : [],
    passages: Array.isArray(data.passages) ? data.passages : [],
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
  }),
}));

/** Loads previously stored import data, but only if long-term storage is enabled. */
export async function hydrateImportStore(): Promise<void> {
  const raw = await readLocal<{ documents?: SourceDocument[]; passages?: SourcePassage[]; candidates?: ImportCandidate[] }>(STORAGE_KEYS.history);
  if (!raw) return;
  useImportStore.getState().hydrate(raw);
}

/** Looks up the exact source passage and document for an approved graph node. */
export function sourceForNode(nodeId: string): { candidate: ImportCandidate; passage: SourcePassage; document: SourceDocument } | null {
  const { candidates, passages, documents } = useImportStore.getState();
  const candidate = candidates.find((item) => item.approvedNodeId === nodeId);
  if (!candidate) return null;
  const passage = passages.find((item) => item.id === candidate.passageId);
  const document = documents.find((item) => item.id === candidate.documentId);
  if (!passage || !document) return null;
  return { candidate, passage, document };
}

export type { MindNodeKind };
