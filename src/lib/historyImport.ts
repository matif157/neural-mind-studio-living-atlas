import {
  BODY_SENSATIONS, COGNITIVE_PATTERNS, EMOTION_TAXONOMY, NEEDS_TAXONOMY,
} from '@shared/taxonomy';
import type { MindNodeKind, SensitivityLevel } from '@shared/domain';
import { assessSafety } from '@shared/safety';

/**
 * Deterministic, offline extraction for imported personal history.
 *
 * Rules for this module:
 *  - The original text is never rewritten, summarised or sent anywhere.
 *  - Every passage keeps exact character offsets into the original document.
 *  - Chronology is only recorded when the text states it. Unknown stays unknown.
 *  - Every candidate is labelled `possible` or `uncertain` and requires user approval.
 *  - Nothing here infers a diagnosis, a hidden memory or a third party's intention.
 */

export type SourceFormat = 'txt' | 'md' | 'json' | 'csv' | 'manual';

export interface Chronology {
  label: string | null;
  precision: 'exact' | 'approximate' | 'unknown';
  source: string | null;
}

export interface PassageDraft {
  order: number;
  heading: string | null;
  originalText: string;
  startOffset: number;
  endOffset: number;
  chronology: Chronology;
  safetyNote: string | null;
  containsSafetyLanguage: boolean;
}

export interface CandidateDraft {
  kind: MindNodeKind;
  label: string;
  description: string;
  evidenceExcerpt: string;
  certainty: 'directly-stated' | 'possible' | 'uncertain';
}

const MAX_PASSAGE_CHARS = 3200;
const MAX_CANDIDATES_PER_PASSAGE = 10;

/* ------------------------------------------------------------------ */
/* Segmentation                                                       */
/* ------------------------------------------------------------------ */

function trimBlock(text: string, start: number, end: number): { start: number; end: number } {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s])) s += 1;
  while (e > s && /\s/.test(text[e - 1])) e -= 1;
  return { start: s, end: e };
}

function splitLongBlock(text: string, start: number, end: number): Array<{ start: number; end: number }> {
  if (end - start <= MAX_PASSAGE_CHARS) return [{ start, end }];
  const pieces: Array<{ start: number; end: number }> = [];
  let cursor = start;
  while (cursor < end) {
    let sliceEnd = Math.min(end, cursor + MAX_PASSAGE_CHARS);
    if (sliceEnd < end) {
      const window = text.slice(cursor, sliceEnd);
      const boundary = Math.max(window.lastIndexOf('. '), window.lastIndexOf('.\n'), window.lastIndexOf('; '));
      if (boundary > MAX_PASSAGE_CHARS * 0.5) sliceEnd = cursor + boundary + 1;
    }
    const trimmed = trimBlock(text, cursor, sliceEnd);
    if (trimmed.end > trimmed.start) pieces.push(trimmed);
    cursor = sliceEnd;
  }
  return pieces;
}

function headingOf(block: string): string | null {
  const first = block.split('\n')[0].trim();
  if (/^#{1,6}\s+/.test(first)) return first.replace(/^#{1,6}\s+/, '').slice(0, 160);
  if (first.length <= 80 && !/[.!?]$/.test(first) && block.includes('\n')) return first.slice(0, 160);
  return null;
}

function segmentProse(text: string): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = [];
  const separator = /\n[ \t]*\n+/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = separator.exec(text)) !== null) {
    const trimmed = trimBlock(text, cursor, match.index);
    if (trimmed.end > trimmed.start) blocks.push(...splitLongBlock(text, trimmed.start, trimmed.end));
    cursor = match.index + match[0].length;
  }
  const tail = trimBlock(text, cursor, text.length);
  if (tail.end > tail.start) blocks.push(...splitLongBlock(text, tail.start, tail.end));
  return blocks;
}

function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (quoted) {
      if (char === '"' && row[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells;
}

function segmentCsv(text: string): Array<{ start: number; end: number }> {
  const rows: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const start = cursor;
    cursor += line.length + 1;
    if (!line.trim()) continue;
    // The first non-empty row is treated as a header and skipped as content.
    if (rows.length === 0 && index === 0) continue;
    rows.push(trimBlock(text, start, start + line.length));
  }
  return rows;
}

function segmentJson(text: string): Array<{ start: number; end: number }> {
  try {
    const parsed: unknown = JSON.parse(text);
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed && typeof parsed === 'object'
        ? ['messages', 'entries', 'passages', 'items', 'history']
          .map((key) => (parsed as Record<string, unknown>)[key])
          .find((value) => Array.isArray(value))
        : null);
    if (!Array.isArray(list)) return segmentProse(text);
    const blocks: Array<{ start: number; end: number }> = [];
    for (const item of list) {
      const rendered = typeof item === 'string' ? item : JSON.stringify(item, null, 2);
      const start = text.indexOf(rendered);
      if (start >= 0) blocks.push({ start, end: start + rendered.length });
      else blocks.push(...splitLongBlock(rendered, 0, rendered.length));
    }
    return blocks;
  } catch {
    return segmentProse(text);
  }
}

export function segmentPassages(text: string, format: SourceFormat = 'txt'): PassageDraft[] {
  if (!text.trim()) return [];
  const blocks = format === 'csv'
    ? segmentCsv(text)
    : format === 'json'
      ? segmentJson(text)
      : segmentProse(text);

  return blocks.map((block, order) => {
    const originalText = text.slice(block.start, block.end);
    const safety = assessSafety(originalText);
    const heading = format === 'csv'
      ? parseCsvRow(originalText.split('\n')[0])[0]?.trim().slice(0, 160) || null
      : headingOf(originalText);
    return {
      order,
      heading,
      originalText,
      startOffset: block.start,
      endOffset: block.end,
      chronology: detectChronology(originalText),
      containsSafetyLanguage: safety.flags.includes('self-harm') || safety.flags.includes('harm-to-others') || safety.flags.includes('possible-crisis'),
      safetyNote: safety.immediateRisk
        ? 'This passage may describe a current safety concern. It is stored as text only and is never analysed automatically.'
        : safety.flags.length
          ? 'This passage contains safety-related language. It is stored as text only and is never analysed automatically.'
          : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Chronology — only what the text actually states                    */
/* ------------------------------------------------------------------ */

const MONTHS = '(January|February|March|April|May|June|July|August|September|October|November|December)';

export function detectChronology(text: string): Chronology {
  const exact = text.match(/\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/);
  if (exact) return { label: exact[0], precision: 'exact', source: exact[0] };
  const monthYear = text.match(new RegExp(`\\b${MONTHS}\\s+((?:19|20)\\d{2})\\b`, 'i'));
  if (monthYear) return { label: `${monthYear[1]} ${monthYear[2]}`, precision: 'approximate', source: monthYear[0] };
  const age = text.match(/\b(?:age[d]?|when i was)\s+(\d{1,2})\b/i);
  if (age) return { label: `Age ${age[1]} (as you described)`, precision: 'approximate', source: age[0] };
  const year = text.match(/\b((?:19|20)\d{2})\b/);
  if (year) return { label: year[1], precision: 'approximate', source: year[0] };
  return { label: null, precision: 'unknown', source: null };
}

/* ------------------------------------------------------------------ */
/* Candidate extraction                                               */
/* ------------------------------------------------------------------ */

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Explicit variants for noun/adjective pairs that do not share a regular stem
 * (anger/angry, fear/afraid, shame/ashamed). Kept deliberately short so the
 * matcher stays inspectable rather than guessing at synonyms.
 */
const IRREGULAR_VARIANTS: Record<string, string[]> = {
  anger: ['angry', 'irritated'],
  anxiety: ['anxious'],
  fear: ['afraid', 'scared', 'fearful'],
  happiness: ['happy'],
  sadness: ['sad', 'unhappy'],
  shame: ['ashamed', 'shameful'],
  pride: ['proud'],
  guilt: ['guilty'],
  envy: ['envious'],
  jealousy: ['jealous'],
  insecurity: ['insecure'],
  resentment: ['resentful'],
  gratitude: ['grateful'],
  compassion: ['compassionate'],
  'self-criticism': ['self-critical'],
};

const SUFFIXES = [
  'ational', 'ations', 'ation', 'ating', 'ated', 'ates', 'ities', 'ity', 'ety',
  'ies', 'ied', 'ings', 'ing', 'ed', 'ness', 'ments', 'ment', 'ance', 'ence',
  'ions', 'ion', 'ous', 'ive', 'ism', 'ist', 'al', 'ic', 's',
];

/** A conservative stem: only used to compare words, never to rewrite text. */
function coreOf(word: string): string {
  let value = word.toLowerCase().replace(/[^a-z]/g, '');
  for (const suffix of SUFFIXES) {
    if (value.endsWith(suffix) && value.length - suffix.length >= 4) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }
  return value.replace(/y$/, 'i');
}

/** True when a taxonomy label is mentioned in the text, allowing regular inflections. */
export function mentionsLabel(text: string, label: string): boolean {
  const phrase = label.toLowerCase().split(/[-\s]+/).map(escape).join('[-\\s]?');
  if (new RegExp(`\\b${phrase}\\b`, 'i').test(text)) return true;

  const words = text.toLowerCase().split(/[^a-z']+/).filter(Boolean);
  const cores = new Set(words.map(coreOf));
  const tokens = label.toLowerCase().split(/[^a-z]+/).filter((token) => token.length >= 4);
  if (!tokens.length) return false;
  return tokens.every((token) => {
    const variants = IRREGULAR_VARIANTS[token] ?? [];
    return [token, ...variants].some((term) => cores.has(coreOf(term)));
  });
}

const FIRST_PERSON = /\b(i|i'm|i've|my|me|myself)\b/i;

const BEHAVIOUR_CUES: Array<{ re: RegExp; label: string }> = [
  { re: /\bavoid(?:ed|s|ing|ance)?\b/i, label: 'Avoidance' },
  { re: /\bwithdrew|withdraw(?:n|ing)?|isolat(?:ed|ing|ion)\b/i, label: 'Withdrawal' },
  { re: /\bask(?:ed|ing)? (?:for )?(?:reassurance|again and again)|reassurance[- ]seek/i, label: 'Reassurance seeking' },
  { re: /\bcheck(?:ed|ing)?\b/i, label: 'Repeated checking' },
  { re: /\bprocrastinat/i, label: 'Procrastination' },
  { re: /\bcry(?:ing)?|cried\b/i, label: 'Crying' },
  { re: /\brun(?:ning)? away|left the room|shut down\b/i, label: 'Withdrawal' },
];

const THOUGHT_CUES = /\b(i(?:\s+(?:often|sometimes|keep|constantly|always|never|really|still|just))?\s+(?:think|thought|believe|should|must|have to|can'?t|cannot|will never)|i am not|i'm not|nobody|no one|everyone|they (?:don'?t|do not|think|hate)|maybe i am|what if|i am worthless|i'?m worthless)\b/i;

function sentencesOf(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 3);
}

export function extractCandidates(passage: Pick<PassageDraft, 'originalText'>): CandidateDraft[] {
  const text = passage.originalText;
  const found = new Map<string, CandidateDraft>();
  const add = (candidate: CandidateDraft) => {
    const key = `${candidate.kind}:${candidate.label.toLowerCase()}`;
    if (!found.has(key) && found.size < MAX_CANDIDATES_PER_PASSAGE) found.set(key, candidate);
  };

  for (const emotion of EMOTION_TAXONOMY) {
    if (!mentionsLabel(text, emotion.name)) continue;
    const stated = sentencesOf(text).some((sentence) =>
      mentionsLabel(sentence, emotion.name)
      && /\bi\s+(?:felt|feel|was|am|get|got|became|have been|'ve been)\b/i.test(sentence),
    );
    add({
      kind: 'emotion',
      label: emotion.name,
      description: `${emotion.definition} Rule-based candidate from your passage — confirm or reject.`,
      evidenceExcerpt: text.slice(0, 600),
      certainty: stated ? 'directly-stated' : 'possible',
    });
  }

  for (const sensation of BODY_SENSATIONS) {
    if (!mentionsLabel(text, sensation)) continue;
    add({
      kind: 'body',
      label: sensation,
      description: 'A physical sensation mentioned in your passage. It is an observation, not a medical explanation.',
      evidenceExcerpt: text.slice(0, 600),
      certainty: 'directly-stated',
    });
  }

  for (const need of NEEDS_TAXONOMY) {
    if (!mentionsLabel(text, need)) continue;
    add({
      kind: 'need',
      label: need,
      description: 'A possible need named in your passage. You decide whether it fits.',
      evidenceExcerpt: text.slice(0, 600),
      certainty: 'possible',
    });
  }

  for (const cue of BEHAVIOUR_CUES) {
    if (!cue.re.test(text)) continue;
    add({
      kind: 'behavior',
      label: cue.label,
      description: 'A behaviour mentioned in your passage. Context matters more than the label.',
      evidenceExcerpt: text.slice(0, 600),
      certainty: 'possible',
    });
  }

  if (FIRST_PERSON.test(text)) {
    for (const pattern of COGNITIVE_PATTERNS) {
      if (!mentionsLabel(text, pattern.name)) continue;
      add({
        kind: 'pattern',
        label: pattern.name,
        description: `${pattern.definition} This is a tentative candidate only; one passage is not evidence of a pattern.`,
        evidenceExcerpt: text.slice(0, 600),
        certainty: 'uncertain',
      });
    }
  }

  for (const sentence of sentencesOf(text)) {
    if (!FIRST_PERSON.test(sentence) || !THOUGHT_CUES.test(sentence)) continue;
    const label = sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
    add({
      kind: 'thought',
      label,
      description: 'Exact wording kept as written. The system does not rewrite or interpret the sentence.',
      evidenceExcerpt: sentence,
      certainty: 'possible',
    });
  }

  return [...found.values()];
}

export function defaultSensitivityFor(kind: MindNodeKind): SensitivityLevel {
  if (kind === 'thought' || kind === 'memory' || kind === 'body' || kind === 'safety') return 'private';
  if (kind === 'pattern' || kind === 'belief' || kind === 'social') return 'sensitive';
  return 'standard';
}

export function formatLabel(format: SourceFormat): string {
  switch (format) {
    case 'md': return 'Markdown';
    case 'json': return 'JSON';
    case 'csv': return 'CSV';
    case 'manual': return 'Typed text';
    default: return 'Plain text';
  }
}
