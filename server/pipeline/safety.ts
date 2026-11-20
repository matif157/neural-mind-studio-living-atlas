import { CRISIS_MESSAGE } from '../../shared/taxonomy';
import type { SAFETY_FLAGS } from '../../shared/schemas';

type SafetyFlag = (typeof SAFETY_FLAGS)[number];

const PATTERNS: Array<{ flag: SafetyFlag; re: RegExp }> = [
  { flag: 'self-harm', re: /\b(kill myself|end my life|end it all|suicid\w*|self[-\s]?harm|hurt myself|cut myself|no reason to live|want to die|better off dead)\b/i },
  { flag: 'harm-to-others', re: /\b(hurt someone|kill someone|harm others|attack someone|make them pay)\b/i },
  { flag: 'medical-symptoms', re: /\b(chest pain|can'?t breathe|cannot breathe|severe headache|fainting|numbness on one side|difficulty breathing)\b/i },
  { flag: 'severe-distress', re: /\b(can'?t cope|unbearable|at my breaking point|completely hopeless|nothing matters anymore)\b/i },
  { flag: 'possible-crisis', re: /\b(emergency|in immediate danger|tonight i might|right now i need help)\b/i },
];

export function detectSafetyFlags(text: string): SafetyFlag[] {
  const flags = new Set<SafetyFlag>();
  for (const { flag, re } of PATTERNS) if (re.test(text)) flags.add(flag);
  if (flags.has('self-harm') || flags.has('harm-to-others') || flags.has('possible-crisis')) flags.add('possible-crisis');
  return [...flags];
}

export function crisisSupplement(flags: SafetyFlag[]): string | null {
  if (!flags.includes('possible-crisis') && !flags.includes('self-harm') && !flags.includes('harm-to-others')) return null;
  return `\n\n${CRISIS_MESSAGE}`;
}

const DIAGNOSTIC_PATTERN = /\b(you (?:have|are diagnosed with|suffer from)|this (?:proves|means) you have|your (?:depression|bipolar|adhd|ptsd|schizophrenia))\b/i;

export function containsDiagnosticClaim(text: string): boolean {
  return DIAGNOSTIC_PATTERN.test(text);
}

export function safetyWarnings(flags: SafetyFlag[]): string[] {
  if (!flags.length) return [];
  return ['Safety-related language was detected. The response includes general support guidance and is not a crisis service.'];
}
