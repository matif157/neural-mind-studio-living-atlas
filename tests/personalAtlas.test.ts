import { describe, expect, it } from 'vitest';
import {
  getNodeDimension, MIND_DIMENSIONS, NODE_META, WORKSPACES,
  type MindDimensionId, type MindNodeKind,
} from '@shared/domain';
import {
  connectionSuggestionSchema, mindNodeSchema, type ConnectionSuggestion,
} from '@shared/schemas';
import { containsDiagnosticClaim } from '../server/pipeline/safety';
import {
  discoverConnections, suggestLinksForText, timelineEraOf, timelineGroups,
} from '../src/lib/connectionDiscovery';
import { useMindStore } from '../src/store/mindStore';
import type { MindNode } from '../src/types/mind';
import { createProjectFile, validateProjectFile } from '../src/utils/projectFile';
import { displayLabel, isNodeDisplayable, isNodeMasked, sensitivityOf } from '../src/utils/privacy';

type NodeInput = { label: string; kind: MindNodeKind } & Record<string, unknown>;

function makeNode(id: string, input: NodeInput): MindNode {
  return mindNodeSchema.parse({
    id,
    type: 'mind',
    position: { x: 0, y: 0 },
    data: input,
  }) as MindNode;
}

function makeSuggestion(id: string, source: string, target: string): ConnectionSuggestion {
  return connectionSuggestionSchema.parse({
    id,
    source,
    target,
    relation: 'may influence',
    explanation: 'You recorded these at different points in your account. Only you can say whether they relate.',
    evidence: 'Shared wording in your notes.',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
}

const historicalMemory = () => makeNode('memory-1', {
  label: 'A difficult conversation at work',
  description: 'A conversation at work left me feeling tense.',
  kind: 'memory',
  tags: ['work', 'tension'],
  temporalStatus: 'historical',
  era: 'employment',
  timePeriod: 'work',
});

const presentEmotion = () => makeNode('emotion-1', {
  label: 'Tension at work today',
  description: 'Tension at work is present now.',
  kind: 'emotion',
  tags: ['work', 'tension'],
  temporalStatus: 'current',
  era: 'present',
  timePeriod: 'now',
});

describe('personal atlas vocabulary and defaults', () => {
  it('exposes ten equal-status dimensions and 26 workspaces', () => {
    expect(MIND_DIMENSIONS).toHaveLength(10);
    expect(new Set(MIND_DIMENSIONS.map((dimension) => dimension.id)).size).toBe(10);
    expect(WORKSPACES).toHaveLength(26);
    expect(WORKSPACES.map((workspace) => workspace.key).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('infers a primary dimension but lets an explicit choice win', () => {
    expect(getNodeDimension({ kind: 'thought' })).toBe('thoughts');
    expect(getNodeDimension({ kind: 'memory' })).toBe('memories');
    expect(getNodeDimension({ kind: 'memory', dimension: 'decisions' as MindDimensionId })).toBe('decisions');
  });

  it('defaults new personal thoughts to private, current and directly reported', () => {
    const before = useMindStore.getState().nodes;
    const id = useMindStore.getState().addNode('thought', { x: 0, y: 0 }, 'A new thought');
    const created = useMindStore.getState().nodes.find((node) => node.id === id);
    expect(created?.data.sensitivity).toBe('private');
    expect(created?.data.temporalStatus).toBe('current');
    expect(created?.data.evidenceClass).toBe('directly-reported');
    expect(created?.data.dimension).toBeUndefined();
    useMindStore.setState({ nodes: before });
  });
});

describe('offline connection discovery', () => {
  it('returns only pending, non-clinical questions and never mutates the graph', () => {
    const nodes = [historicalMemory(), presentEmotion()];
    const edgesBefore = useMindStore.getState().edges;
    const suggestions = discoverConnections(nodes);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((suggestion) => suggestion.rule === 'may-influence')).toBe(true);
    expect(suggestions.every((suggestion) => suggestion.status === 'pending')).toBe(true);
    expect(suggestions.every((suggestion) => suggestion.evidenceClass === 'system-hypothesis')).toBe(true);
    expect(suggestions.every((suggestion) => !containsDiagnosticClaim(suggestion.explanation))).toBe(true);
    expect(useMindStore.getState().edges).toBe(edgesBefore);
    expect(nodes.map((node) => node.data.label)).toEqual([
      'A difficult conversation at work',
      'Tension at work today',
    ]);
  });

  it('does not re-suggest an existing relationship', () => {
    const nodes = [historicalMemory(), presentEmotion()];
    const discovered = discoverConnections(nodes, { limit: 80 });
    expect(discovered.length).toBeGreaterThan(0);
    const existing = [
      {
        id: 'edge-1',
        source: discovered[0].source,
        target: discovered[0].target,
        type: 'neural' as const,
        data: { relation: discovered[0].relation, weight: 0.5 },
      },
    ];
    const filtered = discoverConnections(nodes, { existingEdges: existing as never, limit: 80 });
    const key = `${discovered[0].source}|${discovered[0].target}`;
    expect(filtered.some((suggestion) => `${suggestion.source}|${suggestion.target}` === key)).toBe(false);
  });

  it('masks labels through the discovery callback', () => {
    const suggestions = discoverConnections([historicalMemory(), presentEmotion()], {
      labelFor: () => 'Private concept',
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((suggestion) => !suggestion.explanation.includes('conversation at work'))).toBe(true);
  });

  it('links free text only to concepts with shared wording', () => {
    const nodes = [presentEmotion(), historicalMemory()];
    expect(suggestLinksForText('work tension today', nodes)).toEqual(['emotion-1', 'memory-1']);
    expect(suggestLinksForText('unrelated vocabulary', nodes)).toEqual([]);
  });
});

describe('timeline vocabulary', () => {
  it('groups eras in stated order with undated records separate', () => {
    const nodes = [
      makeNode('future', { label: 'Future plan', kind: 'goal', era: 'future' }),
      makeNode('undated', { label: 'Undated note', kind: 'reflection' }),
      makeNode('childhood', { label: 'Childhood memory', kind: 'memory', era: 'childhood' }),
      makeNode('present', { label: 'Present note', kind: 'thought', era: 'present' }),
    ];
    expect(timelineGroups(nodes).map((group) => group.era)).toEqual([
      'childhood', 'present', 'future', 'undated',
    ]);
    expect(timelineEraOf(nodes[1])).toBe('undated');
  });
});

describe('shared privacy rules', () => {
  const view = { revealSensitive: false, privateMode: false, hiddenKinds: [] as MindNodeKind[] };

  it('masks private content and withholds restricted content entirely', () => {
    const standard = makeNode('standard', { label: 'Calm', kind: 'emotion', sensitivity: 'standard' });
    const privateThought = makeNode('private', { label: 'A private thought', kind: 'thought', sensitivity: 'private' });
    const restricted = makeNode('restricted', { label: 'Restricted', kind: 'memory', sensitivity: 'restricted' });

    expect(isNodeDisplayable(standard, view)).toBe(true);
    expect(isNodeMasked(standard, view)).toBe(false);
    expect(isNodeDisplayable(privateThought, view)).toBe(true);
    expect(isNodeMasked(privateThought, view)).toBe(true);
    expect(displayLabel(privateThought, view)).toBe('Private concept');
    expect(isNodeDisplayable(restricted, view)).toBe(false);
    expect(isNodeMasked(restricted, view)).toBe(false);
    expect(sensitivityOf({ data: { label: 'Unclassified thought', kind: 'thought' } })).toBe('private');
    expect(sensitivityOf({ data: { label: 'Unclassified emotion', kind: 'emotion' } })).toBe('standard');
  });

  it('respects session reveal, private mode and hidden categories', () => {
    const privateThought = makeNode('private', { label: 'A private thought', kind: 'thought', sensitivity: 'private' });
    expect(isNodeMasked(privateThought, { ...view, revealSensitive: true })).toBe(false);
    expect(isNodeDisplayable(privateThought, { ...view, privateMode: true })).toBe(false);
    expect(isNodeDisplayable(privateThought, { ...view, hiddenKinds: ['thought'] })).toBe(false);
  });
});

describe('reviewable suggestion lifecycle', () => {
  it('edits, approves, rejects, deletes and preserves reviewed decisions on refresh', () => {
    const nodes = [historicalMemory(), presentEmotion()];
    const first = makeSuggestion('s1', 'memory-1', 'emotion-1');
    const second = makeSuggestion('s2', 'emotion-1', 'memory-1');
    useMindStore.setState({ nodes, edges: [], suggestions: [first, second], past: [], future: [] });

    useMindStore.getState().updateSuggestion('s1', { explanation: 'Edited by me.' });
    expect(useMindStore.getState().suggestions[0].status).toBe('edited');

    useMindStore.getState().acceptSuggestion('s1');
    let state = useMindStore.getState();
    expect(state.suggestions.find((item) => item.id === 's1')?.status).toBe('approved');
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].data?.approval).toBe('approved');
    expect(state.edges[0].data?.provenance).toBe('user-confirmed');
    expect(state.edges[0].data?.suggestionId).toBe('s1');

    useMindStore.getState().rejectSuggestion('s2');
    expect(useMindStore.getState().suggestions.find((item) => item.id === 's2')?.status).toBe('rejected');
    useMindStore.getState().deleteSuggestion('s2');
    expect(useMindStore.getState().suggestions.some((item) => item.id === 's2')).toBe(false);

    const edgesBeforeRefresh = useMindStore.getState().edges;
    const pending = useMindStore.getState().refreshSuggestions();
    state = useMindStore.getState();
    expect(state.edges).toHaveLength(edgesBeforeRefresh.length);
    expect(state.suggestions.every((item) => item.status !== 'pending' || item.id.startsWith('suggestion-'))).toBe(true);
    expect(pending).toBeGreaterThanOrEqual(0);

    useMindStore.getState().deleteSuggestion('s1');
    expect(useMindStore.getState().suggestions.some((item) => item.id === 's1')).toBe(false);
  });
});

describe('portable export and no-diagnosis language', () => {
  it('includes reviewable suggestions in a valid project export', () => {
    const suggestion = makeSuggestion('s1', 'memory-1', 'emotion-1');
    const project = createProjectFile([historicalMemory(), presentEmotion()], [], undefined, [suggestion]);
    expect(validateProjectFile(project)).toBe(true);
    expect(project.meta?.suggestions).toHaveLength(1);
    expect(project.meta?.suggestions[0].status).toBe('pending');
  });

  it('keeps pattern and body vocabulary explicitly non-diagnostic', () => {
    expect(NODE_META.pattern.definition).toMatch(/never a diagnosis/i);
    expect(NODE_META.body.definition).toMatch(/not diagnostic/i);
    const text = `${NODE_META.pattern.definition} ${NODE_META.body.definition}`;
    expect(containsDiagnosticClaim(text)).toBe(false);
  });
});
