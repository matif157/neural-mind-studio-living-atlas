import {
  eraRank, getNodeDimension, type MindDimensionId, type MindRelation,
} from '@shared/domain';
import { connectionSuggestionSchema, type ConnectionSuggestion } from '@shared/schemas';
import type { MindEdge, MindNode } from '../types/mind';

/**
 * Offline, deterministic relationship discovery.
 *
 * This module never writes to the graph and never makes a clinical claim. It produces
 * questions ("may influence", "occurred before", ...) with the exact user wording that
 * prompted them. Every result starts as `pending` and must be approved by the user before
 * an edge exists. It is deliberately lexical and conservative: a missing suggestion is
 * better than a false explanation of someone's life.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'did', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'here', 'him', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'just', 'me', 'my', 'of', 'on', 'or', 'our', 'out', 'she',
  'so', 'some', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'to', 'too', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why',
  'will', 'with', 'would', 'you', 'your', 'about', 'after', 'all', 'also', 'because', 'before',
  'could', 'even', 'feel', 'felt', 'get', 'got', 'more', 'much', 'not', 'now', 'one', 'only',
  'other', 'over', 'really', 'said', 'say', 'said', 'see', 'things', 'think', 'thought', 'time',
  'very', 'want', 'way', 'well', 'went', 'what', 'while', 'with', 'without', 'years',
]);

const RELATION_BY_RULE: Record<string, MindRelation> = {
  'occurred-before': 'occurred before',
  'may-influence': 'may influence',
  'may-trigger': 'may trigger',
  'associated-with': 'associated with',
  'reinforces': 'reinforces',
  'coping-response': 'coping response to',
  'supports-goal': 'supports',
  'possible-conflict': 'conflicts with',
  'alternative-explanation': 'alternative explanation',
  'needs-exploration': 'requires further exploration',
};

export function tokenize(value: string | undefined | null): string[] {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^'+|'+$/g, ''))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sharedTokens(a: MindNode, b: MindNode): string[] {
  const left = unique([
    ...tokenize(a.data.label),
    ...tokenize(a.data.description),
    ...(a.data.tags ?? []).flatMap(tokenize),
  ]);
  const right = new Set([
    ...tokenize(b.data.label),
    ...tokenize(b.data.description),
    ...(b.data.tags ?? []).flatMap(tokenize),
  ]);
  return left.filter((word) => right.has(word));
}

function sharedTags(a: MindNode, b: MindNode): string[] {
  const left = new Set((a.data.tags ?? []).map((tag) => tag.toLowerCase().trim()));
  return (b.data.tags ?? []).map((tag) => tag.toLowerCase().trim()).filter((tag) => left.has(tag));
}

function shortText(value: string | undefined, max = 180): string {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function explicitTime(node: MindNode): number | null {
  const period = (node.data.timePeriod ?? '').toLowerCase();
  const year = period.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (year) return Number(year[1]);
  const era = node.data.era ?? (TIMELINE_ERA_HINTS.find((hint) => period.includes(hint.id))?.id ?? 'undated');
  if (era !== 'undated') return 1000 + eraRank(era);
  return null;
}

const TIMELINE_ERA_HINTS = [
  { id: 'childhood' as const, words: ['childhood', 'child', 'young', 'early years'] },
  { id: 'adolescence' as const, words: ['adolescen', 'teen', 'school years'] },
  { id: 'education' as const, words: ['university', 'college', 'study', 'student', 'exam'] },
  { id: 'employment' as const, words: ['work', 'job', 'employed', 'career'] },
  { id: 'relationships' as const, words: ['relationship', 'marriage', 'partner'] },
  { id: 'present' as const, words: ['now', 'currently', 'today', 'these days'] },
  { id: 'future' as const, words: ['future', 'plan to', 'hope to', 'someday'] },
];

export function timelineEraOf(node: MindNode): string {
  const period = (node.data.timePeriod ?? '').toLowerCase();
  const hint = TIMELINE_ERA_HINTS.find((item) => item.words.some((word) => period.includes(word)));
  return node.data.era ?? hint?.id ?? 'undated';
}

function confidenceFor(shared: string[], tags: string[], explicit = false): ConnectionSuggestion['confidenceBand'] {
  if (explicit && shared.length >= 2) return 'well-supported';
  if (shared.length >= 2 || tags.length > 0 || explicit) return 'supported';
  return 'exploratory';
}

export interface DiscoveryOptions {
  /** Cap on returned suggestions so a large graph stays reviewable. */
  limit?: number;
  /** Called with each node's display label. Use it to avoid exposing masked content. */
  labelFor?: (node: MindNode) => string;
  /** Existing links are never re-suggested. */
  existingEdges?: MindEdge[];
}

function createBuilder(options: DiscoveryOptions) {
  const seen = new Set<string>();
  const results: ConnectionSuggestion[] = [];
  const existing = new Set((options.existingEdges ?? []).map((edge) => `${edge.source}|${edge.target}`));
  const timestamp = new Date().toISOString();
  const labelFor = options.labelFor ?? ((node: MindNode) => node.data.label);

  return {
    results,
    add(
      source: MindNode,
      target: MindNode,
      rule: string,
      relation: MindRelation,
      evidence: string,
      explanation: string,
      confidenceBand: ConnectionSuggestion['confidenceBand'],
      rationale = 'Based on wording you recorded. Review it before treating it as meaningful.',
    ) {
      if (source.id === target.id) return;
      const key = `${source.id}|${target.id}|${relation}`;
      if (seen.has(key) || existing.has(`${source.id}|${target.id}`)) return;
      seen.add(key);
      results.push(connectionSuggestionSchema.parse({
        id: `suggestion-${source.id}-${target.id}-${rule}`,
        source: source.id,
        target: target.id,
        relation,
        explanation: `“${shortText(labelFor(source), 70)}” → “${shortText(labelFor(target), 70)}”. ${explanation}`,
        evidence: shortText(evidence),
        evidenceClass: 'system-hypothesis',
        confidenceBand,
        rationale,
        status: 'pending',
        rule,
        createdAt: timestamp,
      }));
    },
  };
}

const CONFIDENCE_ORDER: Record<ConnectionSuggestion['confidenceBand'], number> = {
  'well-supported': 2, supported: 1, exploratory: 0,
};

/** Discover possible relationships across all ten dimensions. Graph data is never mutated. */
export function discoverConnections(nodes: MindNode[], options: DiscoveryOptions = {}): ConnectionSuggestion[] {
  const builder = createBuilder(options);
  const limit = Math.max(1, Math.min(200, options.limit ?? 60));

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      const a = nodes[i];
      const b = nodes[j];
      const shared = sharedTokens(a, b);
      const tags = sharedTags(a, b);
      const dimensionA = getNodeDimension({ kind: a.data.kind, dimension: a.data.dimension });
      const dimensionB = getNodeDimension({ kind: b.data.kind, dimension: b.data.dimension });
      const timeA = explicitTime(a);
      const timeB = explicitTime(b);
      const eraA = timelineEraOf(a);
      const eraB = timelineEraOf(b);

      // Earlier -> later. Records order only, never causation.
      if (timeA !== null && timeB !== null && timeA < timeB && (a.data.temporalStatus === 'historical' || eraRank(eraA) < eraRank(eraB))) {
        builder.add(a, b, 'occurred-before', RELATION_BY_RULE['occurred-before'],
          `${a.data.timePeriod ?? eraA} / ${b.data.timePeriod ?? eraB}`,
          'You placed these at different points in your account. This records order only, not cause.',
          timeA >= 1000 ? 'supported' : 'well-supported',
          'Stated timeframe comparison. Confirm the order yourself; no causal claim is made.');
      }

      // Historical or situational material that shares wording with a present observation.
      const earlierToPresent = (
        (dimensionA === 'timeline' || dimensionA === 'memories') &&
        (dimensionB === 'emotion' || dimensionB === 'thoughts' || dimensionB === 'body' || dimensionB === 'behaviour') &&
        (a.data.temporalStatus === 'historical' || eraRank(eraA) < eraRank(eraB)) &&
        (shared.length > 0 || tags.length > 0)
      );
      if (earlierToPresent) {
        builder.add(a, b, 'may-influence', RELATION_BY_RULE['may-influence'],
          `Shared wording: ${shared.slice(0, 6).join(', ') || tags.slice(0, 6).join(', ')}`,
          'An earlier experience and a later observation share wording in your notes. Is this a connection you recognise?',
          confidenceFor(shared, tags, timeA !== null));
      }

      // Situation/context -> emotion or body signal with overlapping wording.
      if ((a.data.kind === 'situation' || a.data.kind === 'context') &&
          (b.data.kind === 'emotion' || b.data.kind === 'body') && (shared.length > 0 || tags.length > 0)) {
        builder.add(a, b, 'may-trigger', RELATION_BY_RULE['may-trigger'],
          `Shared wording: ${shared.slice(0, 6).join(', ') || tags.slice(0, 6).join(', ')}`,
          'You described a situation and an experience with similar wording. A trigger relationship is only a question here.',
          confidenceFor(shared, tags));
      }

      // A response and an ongoing experience sharing content: possible short-term relief.
      if ((a.data.kind === 'coping' || a.data.kind === 'exercise' || a.data.kind === 'behavior') &&
          (b.data.kind === 'emotion' || b.data.kind === 'thought' || b.data.kind === 'pattern' || b.data.kind === 'body') &&
          (shared.length > 0 || tags.length > 0)) {
        builder.add(a, b, 'coping-response', RELATION_BY_RULE['coping-response'],
          `Shared wording: ${shared.slice(0, 6).join(', ') || tags.slice(0, 6).join(', ')}`,
          'You recorded both a response and an ongoing experience. Whether one relieves, maintains or neither is for you to decide.',
          confidenceFor(shared, tags));
      }

      // Strengths and values may support directions you want to pursue.
      if ((a.data.kind === 'strength' || a.data.kind === 'value') && b.data.kind === 'goal' &&
          (shared.length > 0 || tags.length > 0)) {
        builder.add(a, b, 'supports-goal', RELATION_BY_RULE['supports-goal'],
          `Shared wording: ${shared.slice(0, 6).join(', ') || tags.slice(0, 6).join(', ')}`,
          'A resource you identified appears alongside a direction you chose. This suggests a possible route, not a guarantee.',
          confidenceFor(shared, tags, true));
      }

      // Repeating thought wording. Repetition is a prompt to look, not evidence of illness.
      if ((a.data.kind === 'thought' || a.data.kind === 'pattern') && (b.data.kind === 'thought' || b.data.kind === 'pattern') && i < j) {
        const left = unique(tokenize(a.data.label));
        const right = new Set(tokenize(b.data.label));
        const common = left.filter((word) => right.has(word));
        if (common.length >= 2 && common.length / Math.max(1, new Set([...left, ...right]).size) >= 0.5) {
          builder.add(a, b, 'reinforces', RELATION_BY_RULE['reinforces'],
            `Shared wording: ${common.slice(0, 6).join(', ')}`,
            'Similar wording appears more than once in your notes. Repetition alone does not indicate a problem.',
            confidenceFor(common, tags));
        }
      }

      // Competing directions, held as a question rather than a verdict.
      if (dimensionA === 'strengths' && dimensionB === 'decisions' && tags.length > 0) {
        builder.add(a, b, 'possible-conflict', RELATION_BY_RULE['possible-conflict'],
          `Shared tags: ${tags.slice(0, 6).join(', ')}`,
          'A value or resource and a decision appear together. They may align or pull in different directions — you decide.',
          'exploratory', 'Tag overlap only. This is an invitation to compare, not a recommendation.');
      }

      // A recorded hypothesis should be compared with, not substituted for, direct experience.
      if (a.data.kind === 'pattern' && (b.data.kind === 'emotion' || b.data.kind === 'thought') && tags.length > 0) {
        builder.add(a, b, 'alternative-explanation', RELATION_BY_RULE['alternative-explanation'],
          `Shared tags: ${tags.slice(0, 6).join(', ')}`,
          'A hypothesis and a direct observation share context. More than one explanation may fit.',
          'exploratory', 'Always holds alternative explanations open; never upgrades a hypothesis to a fact.');
      }

      // Shared context without shared vocabulary: needs exploration rather than interpretation.
      if (tags.length > 0 && shared.length === 0 && dimensionA !== dimensionB && i < j) {
        builder.add(a, b, 'needs-exploration', RELATION_BY_RULE['needs-exploration'],
          `Shared tags: ${tags.slice(0, 6).join(', ')}`,
          'You grouped these concepts with the same tag but described them differently. Only you can say whether they relate.',
          'exploratory', 'Shared user tag only. No mechanism or cause is implied.');
      }
    }
  }

  return builder.results
    .sort((a, b) => CONFIDENCE_ORDER[b.confidenceBand] - CONFIDENCE_ORDER[a.confidenceBand] || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Suggest links between free text (e.g. a journal entry) and concepts already in the graph. */
export function suggestLinksForText(text: string, nodes: MindNode[], limit = 6): string[] {
  const words = new Set(tokenize(text));
  if (!words.size) return [];
  return nodes
    .map((node) => {
      const labelTokens = tokenize(node.data.label);
      const bodyTokens = [...tokenize(node.data.description), ...(node.data.tags ?? []).flatMap(tokenize)];
      const labelHits = labelTokens.filter((word) => words.has(word)).length;
      const bodyHits = bodyTokens.filter((word) => words.has(word)).length;
      return { id: node.id, score: labelHits * 2 + bodyHits };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => item.id);
}

/** Timeline ordering used by the personal timeline workspace. Undated records stay separate. */
export function timelineGroups(nodes: MindNode[]): Array<{ era: string; nodes: MindNode[] }> {
  const order = ['childhood', 'adolescence', 'education', 'employment', 'relationships', 'present', 'future', 'undated'];
  const groups = new Map<string, MindNode[]>();
  for (const node of nodes) {
    const era = timelineEraOf(node);
    const group = groups.get(era) ?? [];
    group.push(node);
    groups.set(era, group);
  }
  return order
    .filter((era) => groups.has(era))
    .map((era) => ({ era, nodes: groups.get(era)!.sort((a, b) => (a.data.timePeriod ?? '').localeCompare(b.data.timePeriod ?? '') || a.id.localeCompare(b.id)) }));
}

export function dimensionOf(node: MindNode): MindDimensionId {
  return getNodeDimension({ kind: node.data.kind, dimension: node.data.dimension });
}
