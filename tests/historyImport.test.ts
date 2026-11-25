import { beforeEach, describe, expect, it } from 'vitest';
import { detectChronology, extractCandidates, segmentPassages } from '../src/lib/historyImport';
import { useImportStore } from '../src/store/importStore';
import { useMindStore } from '../src/store/mindStore';
import { shouldShowNodeInMind3D } from '../src/utils/mind3dLayout';
import { seedNodes } from '../src/data/seed';

const HISTORY = [
  '# Early years',
  '',
  'When I was 9 I remember feeling afraid when an adult in the family shouted. I learned to check for mistakes before anyone noticed.',
  '',
  '## School period',
  '',
  'At 13 I moved to a new school. I felt humiliated and I cried most nights. I avoided speaking in class.',
  '',
  '## Present',
  '',
  'I still feel anxious before social situations. I often think that people are judging me.',
].join('\n');

describe('history segmentation', () => {
  it('keeps exact original text and offsets for every passage', () => {
    const passages = segmentPassages(HISTORY, 'md');
    expect(passages.length).toBeGreaterThan(2);
    for (const passage of passages) {
      expect(HISTORY.slice(passage.startOffset, passage.endOffset)).toBe(passage.originalText);
    }
  });

  it('preserves the full document when passages are concatenated by order', () => {
    const passages = segmentPassages(HISTORY, 'md').sort((a, b) => a.order - b.order);
    const joined = passages.map((passage) => passage.originalText).join('\n\n');
    expect(joined).toContain('When I was 9');
    expect(joined).toContain('I often think that people are judging me.');
  });

  it('segments CSV rows and skips the header', () => {
    const csv = 'date,text\n2019-04-02,"I felt afraid at school"\n2020-01-01,"I avoided a phone call"';
    const passages = segmentPassages(csv, 'csv');
    expect(passages).toHaveLength(2);
    expect(passages[0].originalText).toContain('2019-04-02');
  });

  it('returns nothing for empty input rather than inventing a passage', () => {
    expect(segmentPassages('   ', 'txt')).toEqual([]);
  });
});

describe('chronology', () => {
  it('records an exact ISO date only when stated', () => {
    const result = detectChronology('On 2019-04-02 I moved schools.');
    expect(result.precision).toBe('exact');
    expect(result.label).toBe('2019-04-02');
  });

  it('records a year as approximate', () => {
    const result = detectChronology('This happened in 2014 and I still think about it.');
    expect(result.precision).toBe('approximate');
    expect(result.label).toBe('2014');
  });

  it('records an age as approximate and keeps the source phrase', () => {
    const result = detectChronology('When I was 9 I felt afraid.');
    expect(result.precision).toBe('approximate');
    expect(result.label).toContain('9');
    expect(result.source).toBe('When I was 9');
  });

  it('leaves unknown dates unknown', () => {
    const result = detectChronology('I remember feeling tense, but I cannot place it in time.');
    expect(result.precision).toBe('unknown');
    expect(result.label).toBeNull();
  });

  it('does not infer chronology from passage order', () => {
    const passages = segmentPassages('First paragraph with no date.\n\nSecond paragraph also undated.', 'txt');
    expect(passages.every((passage) => passage.chronology.precision === 'unknown')).toBe(true);
  });
});

describe('candidate extraction', () => {
  it('extracts emotions as possible, not as facts', () => {
    const candidates = extractCandidates({ originalText: 'I felt anxious before the meeting.' });
    const anxiety = candidates.find((item) => item.kind === 'emotion' && item.label === 'Anxiety');
    expect(anxiety).toBeDefined();
    expect(['possible', 'directly-stated']).toContain(anxiety?.certainty);
  });

  it('keeps an automatic thought in its exact wording', () => {
    const sentence = 'I always think that people are judging me.';
    const candidates = extractCandidates({ originalText: sentence });
    const thought = candidates.find((item) => item.kind === 'thought');
    expect(thought?.evidenceExcerpt).toContain('people are judging me');
  });

  it('marks cognitive patterns as uncertain and requires first person', () => {
    const first = extractCandidates({ originalText: 'I keep ruminating about the same conversation.' });
    expect(first.find((item) => item.kind === 'pattern')?.certainty).toBe('uncertain');
    const third = extractCandidates({ originalText: 'Rumination is described in textbooks.' });
    expect(third.find((item) => item.kind === 'pattern')).toBeUndefined();
  });

  it('does not invent body sensations that were not mentioned', () => {
    const candidates = extractCandidates({ originalText: 'I felt sad about the news.' });
    expect(candidates.some((item) => item.kind === 'body')).toBe(false);
  });

  it('flags safety language in a passage without analysing it', () => {
    const passages = segmentPassages('Sometimes I think about ending my life.', 'txt');
    expect(passages[0].containsSafetyLanguage).toBe(true);
    expect(passages[0].safetyNote).toMatch(/never analysed automatically/);
  });
});

describe('import approval and provenance', () => {
  beforeEach(() => {
    useImportStore.getState().clearImported();
    useMindStore.getState().resetToStarter();
  });

  it('creates no graph nodes until a candidate is approved', () => {
    const before = useMindStore.getState().nodes.length;
    useImportStore.getState().importText({ title: 'Test history', format: 'md', text: HISTORY, sensitivity: 'sensitive' });
    expect(useMindStore.getState().nodes.length).toBe(before);
    expect(useImportStore.getState().candidates.length).toBeGreaterThan(0);
    expect(useImportStore.getState().candidates.every((item) => item.status === 'pending')).toBe(true);
  });

  it('stores exact evidence and a source link on approval', () => {
    useImportStore.getState().importText({ title: 'Test history', format: 'md', text: HISTORY, sensitivity: 'sensitive' });
    const candidate = useImportStore.getState().candidates.find((item) => item.kind === 'emotion');
    expect(candidate).toBeDefined();
    const nodeId = useImportStore.getState().approveCandidate(candidate!.id);
    expect(nodeId).toBeTruthy();
    const node = useMindStore.getState().nodes.find((item) => item.id === nodeId);
    expect(node?.data.provenance).toBe('user-confirmed');
    expect(node?.data.source).toBe(candidate!.passageId);
    expect(node?.data.evidence[0].eventId).toBe(candidate!.passageId);
    expect(node?.data.evidence[0].excerpt.length).toBeGreaterThan(0);
    const approved = useImportStore.getState().candidates.find((item) => item.id === candidate!.id);
    expect(approved?.status).toBe('approved');
  });

  it('applies the stricter of the document and kind privacy levels', () => {
    useImportStore.getState().importText({ title: 'Test history', format: 'md', text: HISTORY, sensitivity: 'sensitive' });
    const thought = useImportStore.getState().candidates.find((item) => item.kind === 'thought');
    const nodeId = useImportStore.getState().approveCandidate(thought!.id);
    const node = useMindStore.getState().nodes.find((item) => item.id === nodeId)!;
    expect(['sensitive', 'restricted']).toContain(node.data.sensitivity);
  });

  it('never renders restricted imported concepts in the 3D atlas', () => {
    useImportStore.getState().importText({ title: 'Test history', format: 'md', text: HISTORY, sensitivity: 'restricted' });
    const candidate = useImportStore.getState().candidates[0];
    const nodeId = useImportStore.getState().approveCandidate(candidate.id);
    const node = useMindStore.getState().nodes.find((item) => item.id === nodeId)!;
    expect(node.data.sensitivity).toBe('restricted');
    expect(shouldShowNodeInMind3D(node, true)).toBe(false);
  });

  it('rejects a candidate without touching the graph', () => {
    useImportStore.getState().importText({ title: 'Test history', format: 'md', text: HISTORY, sensitivity: 'sensitive' });
    const candidate = useImportStore.getState().candidates[0];
    const before = useMindStore.getState().nodes.length;
    useImportStore.getState().rejectCandidate(candidate.id);
    expect(useMindStore.getState().nodes.length).toBe(before);
    expect(useImportStore.getState().candidates.find((item) => item.id === candidate.id)?.status).toBe('rejected');
  });

  it('keeps the public seed graph free of imported personal history', () => {
    expect(seedNodes.every((node) => node.data.provenance === 'seed')).toBe(true);
    expect(seedNodes.every((node) => node.data.sensitivity === 'standard')).toBe(true);
    expect(seedNodes.some((node) => node.data.label.toLowerCase().includes('new school'))).toBe(false);
  });
});
