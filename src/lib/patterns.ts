import type { AiAnalysis } from '@shared/schemas';
import type { MindEdge, MindNode } from '../types/mind';

export interface StoredAnalysis {
  id: string;
  createdAt: string;
  conversationId: string;
  analysis: AiAnalysis;
  offline: boolean;
}

export interface SeriesPoint { date: string; label: string; value: number; eventId: string }

const day = (iso: string) => iso.slice(0, 10);

/** Intensity is only charted when the user explicitly supplied it. */
export function emotionIntensitySeries(analyses: StoredAnalysis[]): { points: SeriesPoint[]; hasIntensities: boolean } {
  const points: SeriesPoint[] = [];
  for (const record of analyses) {
    for (const emotion of record.analysis.emotions) {
      if (emotion.intensity === null) continue;
      points.push({
        date: day(record.createdAt),
        label: emotion.name,
        value: emotion.intensity,
        eventId: record.id,
      });
    }
  }
  return { points: points.sort((a, b) => a.date.localeCompare(b.date)), hasIntensities: points.length > 0 };
}

export function emotionFrequency(analyses: StoredAnalysis[]): Array<{ label: string; count: number; certainty: string }> {
  const counts = new Map<string, { count: number; certainty: string }>();
  for (const record of analyses) {
    for (const emotion of record.analysis.emotions) {
      const entry = counts.get(emotion.name) ?? { count: 0, certainty: emotion.certainty };
      entry.count += 1;
      counts.set(emotion.name, entry);
    }
  }
  return [...counts.entries()].map(([label, value]) => ({ label, ...value })).sort((a, b) => b.count - a.count);
}

export function thoughtRecurrence(analyses: StoredAnalysis[]): Array<{ text: string; count: number; dates: string[]; contexts: string[] }> {
  const map = new Map<string, { text: string; count: number; dates: string[]; contexts: string[] }>();
  for (const record of analyses) {
    for (const thought of record.analysis.thoughts) {
      const key = thought.original_text.trim().toLowerCase();
      if (!key) continue;
      const entry = map.get(key) ?? { text: thought.original_text, count: 0, dates: [], contexts: [] };
      entry.count += 1;
      entry.dates.push(day(record.createdAt));
      entry.contexts.push(...record.analysis.situation);
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function emotionCoOccurrence(analyses: StoredAnalysis[]): Array<{ pair: [string, string]; count: number }> {
  const counts = new Map<string, number>();
  for (const record of analyses) {
    const names = [...new Set(record.analysis.emotions.map((emotion) => emotion.name))].sort();
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const key = `${names[i]}::${names[j]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ pair: key.split('::') as [string, string], count }))
    .sort((a, b) => b.count - a.count);
}

/** Descriptive cognitive-loop examples from the user's own graph; no clinical meaning. */
export function cognitiveLoops(nodes: MindNode[], edges: MindEdge[], limit = 8): Array<Array<{ id: string; label: string; relation: string }>> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Array<{ to: string; relation: string }>>();
  for (const edge of edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push({ to: edge.target, relation: edge.data?.customRelation ?? edge.data?.relation ?? 'associated with' });
    adjacency.set(edge.source, list);
  }
  const loops: Array<Array<{ id: string; label: string; relation: string }>> = [];
  const seen = new Set<string>();
  const visit = (start: string, current: string, path: Array<{ id: string; label: string; relation: string }>, depth: number): void => {
    if (depth > 6 || loops.length >= limit) return;
    for (const next of adjacency.get(current) ?? []) {
      if (next.to === start && path.length >= 2) {
        const key = [...path.map((item) => item.id), start].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          loops.push([...path, { id: start, label: byId.get(start)?.data.label ?? start, relation: next.relation }]);
        }
        continue;
      }
      if (path.some((item) => item.id === next.to)) continue;
      const node = byId.get(next.to);
      if (!node) continue;
      visit(start, next.to, [...path, { id: next.to, label: node.data.label, relation: next.relation }], depth + 1);
    }
  };
  for (const node of nodes) {
    if (loops.length >= limit) break;
    visit(node.id, node.id, [{ id: node.id, label: node.data.label, relation: 'start' }], 0);
  }
  return loops;
}

export function patternChange(analyses: StoredAnalysis[], term: string): Array<{ date: string; mentions: number; intensity: number | null; eventId: string }> {
  const needle = term.toLowerCase();
  return analyses.map((record) => {
    const json = JSON.stringify(record.analysis).toLowerCase();
    const mentions = (json.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
    const intensities = record.analysis.emotions
      .filter((emotion) => emotion.name.toLowerCase().includes(needle) && emotion.intensity !== null)
      .map((emotion) => emotion.intensity as number);
    return {
      date: day(record.createdAt),
      mentions,
      intensity: intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : null,
      eventId: record.id,
    };
  }).filter((point) => point.mentions > 0);
}

export function graphProvenanceCounts(nodes: MindNode[], edges: MindEdge[]) {
  const nodeCounts: Record<string, number> = {};
  const edgeCounts: Record<string, number> = {};
  for (const node of nodes) nodeCounts[node.data.provenance] = (nodeCounts[node.data.provenance] ?? 0) + 1;
  for (const edge of edges) edgeCounts[edge.data?.provenance ?? 'seed'] = (edgeCounts[edge.data?.provenance ?? 'seed'] ?? 0) + 1;
  return { nodeCounts, edgeCounts };
}
