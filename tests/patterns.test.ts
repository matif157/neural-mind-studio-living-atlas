import { describe, expect, it } from 'vitest';
import { aiAnalysisSchema } from '../shared/schemas';
import { seedEdges, seedNodes } from '../src/data/seed';
import {
  cognitiveLoops, emotionCoOccurrence, emotionFrequency, emotionIntensitySeries,
  graphProvenanceCounts, thoughtRecurrence,
} from '../src/lib/patterns';
import type { StoredAnalysis } from '../src/lib/patterns';

const analysis = (createdAt: string, patch: Record<string, unknown> = {}): StoredAnalysis => ({
  id: `analysis-${createdAt}`,
  createdAt,
  conversationId: 'conversation-1',
  offline: true,
  analysis: aiAnalysisSchema.parse({
    response_to_user: 'Reflection text',
    conversation_summary: 'Summary',
    ...patch,
  }),
});

describe('longitudinal pattern utilities', () => {
  it('charts only user-stated intensity and sorts by date', () => {
    const records = [
      analysis('2026-02-02T10:00:00Z', { emotions: [{ name: 'Sadness', evidence: 'I felt sad', confidence: 0.8, intensity: 0.7, certainty: 'directly-stated' }] }),
      analysis('2026-01-01T10:00:00Z', { emotions: [{ name: 'Calm', evidence: 'I felt calm', confidence: 0.8, intensity: null, certainty: 'directly-stated' }] }),
      analysis('2026-03-03T10:00:00Z', { emotions: [{ name: 'Sadness', evidence: 'I felt sad again', confidence: 0.8, intensity: 0.4, certainty: 'possible' }] }),
    ];
    const { points, hasIntensities } = emotionIntensitySeries(records);
    expect(hasIntensities).toBe(true);
    expect(points).toHaveLength(2);
    expect(points.map((point) => point.date)).toEqual(['2026-02-02', '2026-03-03']);
  });

  it('reports no intensity chart when no values were supplied', () => {
    const result = emotionIntensitySeries([analysis('2026-01-01T10:00:00Z')]);
    expect(result.hasIntensities).toBe(false);
    expect(result.points).toEqual([]);
  });

  it('counts emotion frequency and co-occurrence without inventing intensity', () => {
    const records = [
      analysis('2026-01-01T10:00:00Z', { emotions: [
        { name: 'Anxiety', evidence: 'worried', confidence: 0.7, intensity: null, certainty: 'directly-stated' },
        { name: 'Frustration', evidence: 'irritated', confidence: 0.6, intensity: null, certainty: 'possible' },
      ] }),
      analysis('2026-01-02T10:00:00Z', { emotions: [
        { name: 'Anxiety', evidence: 'worried again', confidence: 0.7, intensity: null, certainty: 'directly-stated' },
      ] }),
    ];
    expect(emotionFrequency(records)[0]).toMatchObject({ label: 'Anxiety', count: 2 });
    expect(emotionCoOccurrence(records)).toEqual([{ pair: ['Anxiety', 'Frustration'], count: 1 }]);
  });

  it('groups recurring thought text by original wording', () => {
    const records = [
      analysis('2026-01-01T10:00:00Z', { thoughts: [{ original_text: 'I will fail', type: 'automatic_thought', certainty: 'directly-stated' }] }),
      analysis('2026-01-02T10:00:00Z', { thoughts: [{ original_text: 'I will fail', type: 'automatic_thought', certainty: 'directly-stated' }] }),
    ];
    const recurrence = thoughtRecurrence(records);
    expect(recurrence).toHaveLength(1);
    expect(recurrence[0].count).toBe(2);
    expect(recurrence[0].dates).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('finds descriptive loops and provenance counts from the graph', () => {
    const loops = cognitiveLoops(seedNodes, seedEdges);
    expect(Array.isArray(loops)).toBe(true);
    const counts = graphProvenanceCounts(seedNodes, seedEdges);
    expect(Object.values(counts.nodeCounts).reduce((sum, value) => sum + value, 0)).toBe(seedNodes.length);
    expect(Object.values(counts.edgeCounts).reduce((sum, value) => sum + value, 0)).toBe(seedEdges.length);
  });
});
