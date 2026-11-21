import { CRISIS_MESSAGE } from './taxonomy';
import type { SAFETY_FLAGS } from './schemas';

export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

/**
 * Safety detection is deliberately transparent, rule-based and inspectable.
 * It never produces a probability, a severity score or a predictive "risk level".
 * NICE NG225 cautions against using scales or global risk categories to predict
 * future suicide or self-harm, so this module only identifies *currently stated*
 * concerns and directs the person toward immediate human support.
 */

type Category = 'self-harm' | 'harm-to-others' | 'medical-symptoms' | 'severe-distress' | 'immediate-danger';

interface Rule {
  category: Category;
  re: RegExp;
}

const RULES: Rule[] = [
  // Direct suicidal ideation and intent.
  { category: 'self-harm', re: /\b(kill(?:ing)? myself|end(?:ing)? my life|end it all|take my (?:own )?life|suicid\w*|self[-\s]?harm(?:ing)?|hurt(?:ing)? myself|cut(?:ting)? myself|no reason to live|want(?:ed)? to die|better off dead|don'?t want to (?:be here|wake up|live)|wish i (?:was|were) dead)\b/i },
  // Plans, means and farewell behaviour raise immediacy.
  { category: 'self-harm', re: /\b(suicide (?:plan|note|method)|plan(?:ning)? to (?:kill|end)|going to (?:kill|end) (?:myself|it)|bought a (?:gun|rope)|stockpil\w* (?:pills|medication)|have (?:a|the) (?:gun|knife|rope|pills) (?:ready|with me)|said my goodbyes|wrote a (?:suicide|goodbye) (?:note|letter))\b/i },
  // Harm to others: intent, plans and threats.
  { category: 'harm-to-others', re: /\b(kill|hurt|harm|attack|stab|shoot|strangle|poison|beat)\s+(?:him|her|them|someone|somebody|people|my (?:partner|wife|husband|girlfriend|boyfriend|family|brother|sister|father|mother|boss|neighbou?r))\b/i },
  { category: 'harm-to-others', re: /\b(make (?:him|her|them) pay|teach (?:him|her|them) a lesson|(?:want|plan(?:ning)?) to (?:confront|attack) (?:him|her|them)|going to (?:hurt|kill|attack) (?:him|her|them)|i (?:could|might|will) (?:hurt|kill) (?:him|her|them))\b/i },
  { category: 'harm-to-others', re: /\b(thoughts? (?:of|about) (?:harming|hurting|killing) (?:someone|others|him|her|them)|urge to (?:hurt|harm|kill)|afraid i(?:'ll| will) (?:hurt|kill))\b/i },
  // Immediate danger / loss of control.
  { category: 'immediate-danger', re: /\b(immediate danger|in danger right now|right now i (?:might|may|could|want to)|tonight i (?:might|may|will)|about to (?:do it|end it|hurt)|can'?t stop myself|losing control|losing my mind and might|emergency|need help (?:right now|now))\b/i },
  { category: 'immediate-danger', re: /\b(access to (?:a )?(?:gun|knife|weapon|pills|rope)|have (?:a )?(?:gun|knife|weapon|pills|rope) (?:nearby|with me|at home))\b/i },
  // Medical red flags that warrant human assessment, never an AI diagnosis.
  { category: 'medical-symptoms', re: /\b(chest pain|can'?t breathe|cannot breathe|severe headache|fainting|numbness on one side|slurred speech|sudden weakness|difficulty breathing|seizure)\b/i },
  // Severe distress without explicit intent.
  { category: 'severe-distress', re: /\b(can'?t cope|unbearable|at my breaking point|completely hopeless|nothing matters anymore|no way out|falling apart)\b/i },
];

/**
 * Explicit denials suppress the crisis interrupt for that clause, e.g. "I would never kill myself".
 * They do not suppress "I don't want to live" because that phrase expresses distress, not denial.
 * A suppressed clause is still returned in `noted` so nothing is silently discarded.
 */
const DENIALS: RegExp[] = [
  /\b(?:not|never)\s+(?:been\s+)?suicid\w*/i,
  /\b(?:would|will)\s+never\s+(?:kill|hurt|harm)\s+(?:myself|anyone|anybody|him|her|them|someone)\b/i,
  /\b(?:don'?t|do not|didn'?t)\s+(?:want|intend|plan)\s+to\s+(?:hurt|harm|kill)\b/i,
  /\bwould never (?:act|do it|follow through)\b/i,
  /\b(?:no|without)\s+(?:current\s+)?(?:plans?|intent(?:ion)?|urge)\s+to\s+(?:kill|hurt|harm|end)/i,
  /\bnot\s+(?:going|about)\s+to\s+(?:kill|hurt|harm)\s+(?:myself|anyone|him|her|them)\b/i,
  /\bi\s+(?:am|'m)\s+(?:not|no longer)\s+(?:suicidal|self[-\s]?harming)\b/i,
  /\b(?:used to|in the past|years ago)\b/i,
];

/** First-person statements of current intent or desire. These are not probabilities. */
const DIRECT_INTENT: RegExp[] = [
  /\bi (?:really )?(?:want|need) to die\b/i,
  /\bi (?:don'?t|do not) want to (?:live|be here|wake up)\b/i,
  /\bi (?:can'?t|cannot) (?:go on|keep going)\b/i,
  /\bi(?:'m| am) going to (?:kill|end) (?:myself|my life)\b/i,
  /\bi (?:will|might|could|may) (?:kill|end) (?:myself|my life)\b/i,
  /\bi have a plan to (?:kill|end) (?:myself|my life)\b/i,
  /\bi (?:really )?(?:want|need|plan|intend) to (?:kill|hurt|harm|attack)\s+(?:him|her|them|someone|somebody|people)\b/i,
  /\bi(?:'m| am) (?:about to|going to) (?:hurt|kill|attack)\s+(?:him|her|them|someone)\b/i,
];

/** Requests the system must never assist with, regardless of emotional content. */
const UNSAFE_REQUESTS: Array<{ id: string; re: RegExp; label: string }> = [
  { id: 'monitor-person', re: /\b(track|monitor|spy on|follow|locate|find out where|stalk|surveil)\s+(?:him|her|them|my (?:ex|partner|wife|husband|girlfriend|boyfriend))\b/i, label: 'Monitoring or locating another person' },
  { id: 'retaliation', re: /\b(get revenge|revenge on|make (?:him|her|them) suffer|ruin (?:his|her|their) life|blackmail|threaten (?:him|her|them))\b/i, label: 'Retaliation, coercion or blackmail' },
  { id: 'coercion', re: /\b(force (?:him|her|them) to|make (?:him|her|them) stay|stop (?:him|her|them) from leaving|pressure (?:him|her|them) into)\b/i, label: 'Coercing another person' },
  { id: 'weapons', re: /\b(how (?:do|can) i (?:get|buy|make) a (?:gun|knife|weapon|bomb)|untraceable (?:gun|weapon)|hurt (?:someone|people) without (?:getting caught|evidence))\b/i, label: 'Obtaining means or evading detection' },
];

export interface SafetyAssessment {
  flags: SafetyFlag[];
  categories: Category[];
  /** True only when currently stated intent/danger is present. Never a prediction. */
  immediateRisk: boolean;
  /** Exact matched phrases, so the decision is inspectable. Never a paraphrase. */
  evidence: string[];
  /** Clauses containing crisis wording that were explicitly denied by the user. */
  denied: string[];
  unsafeRequests: Array<{ id: string; label: string }>;
  guidance: string | null;
}

const SEVERITY_ORDER: SafetyFlag[] = ['possible-crisis', 'self-harm', 'harm-to-others', 'medical-symptoms', 'severe-distress'];

function clauseAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + length + 60);
  return text.slice(start, end);
}

export function assessSafety(text: string): SafetyAssessment {
  const categories = new Set<Category>();
  const evidence: string[] = [];
  const denied: string[] = [];
  let currentIntent = false;

  for (const rule of RULES) {
    const global = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = global.exec(text)) !== null) {
      const clause = clauseAround(text, match.index, match[0].length);
      if (DENIALS.some((denial) => denial.test(clause))) {
        denied.push(match[0]);
        continue;
      }
      categories.add(rule.category);
      evidence.push(match[0]);
      if (rule.category === 'immediate-danger') currentIntent = true;
      // "right now / tonight / plan / going to" inside a self-harm or harm clause is an immediacy cue.
      if (rule.category === 'self-harm' || rule.category === 'harm-to-others') {
        if (/\b(right now|tonight|today|now|about to|going to|plan(?:ning)?|ready|nearby|with me|goodbye|bought|stockpil\w*|wrote a (?:suicide|goodbye))\b/i.test(clause)) currentIntent = true;
        if (DIRECT_INTENT.some((direct) => direct.test(clause))) currentIntent = true;
      }
      if (match[0].length === 0) global.lastIndex += 1;
    }
  }

  const unsafeRequests = UNSAFE_REQUESTS
    .filter((item) => item.re.test(text))
    .map(({ id, label }) => ({ id, label }));

  const flags = new Set<SafetyFlag>();
  if (categories.has('self-harm')) flags.add('self-harm');
  if (categories.has('harm-to-others')) flags.add('harm-to-others');
  if (categories.has('medical-symptoms')) flags.add('medical-symptoms');
  if (categories.has('severe-distress')) flags.add('severe-distress');
  const immediateRisk = currentIntent && (categories.has('self-harm') || categories.has('harm-to-others') || categories.has('immediate-danger'));
  if (immediateRisk || categories.has('self-harm') || categories.has('harm-to-others') || categories.has('immediate-danger')) flags.add('possible-crisis');

  const ordered = SEVERITY_ORDER.filter((flag) => flags.has(flag));
  return {
    flags: ordered,
    categories: [...categories],
    immediateRisk,
    evidence: [...new Set(evidence)].slice(0, 12),
    denied: [...new Set(denied)].slice(0, 6),
    unsafeRequests,
    guidance: immediateRisk ? crisisGuidance(categories.has('harm-to-others')) : unsafeRequestGuidance(unsafeRequests),
  };
}

function unsafeRequestGuidance(requests: SafetyAssessment['unsafeRequests']): string | null {
  if (!requests.length) return null;
  return [
    'This request cannot be supported.',
    ...requests.map((item) => `• ${item.label}: I will not help plan, locate, monitor, coerce or retaliate against another person.`),
    'If you are in conflict with someone, the useful focus is distance, safety and your own boundaries. Consider contacting a trusted person or a qualified professional for support with the situation.',
  ].join('\n');
}

function crisisGuidance(harmToOthers: boolean): string {
  const lines = [
    'I am pausing the usual reflection because your message may describe a current safety concern.',
    '',
    'Please focus on the next few minutes rather than analysing the whole situation:',
    harmToOthers
      ? '• Move physically away from the person you are thinking about harming, and away from any weapon or other means.'
      : '• Move away from anything you could use to harm yourself, and ask someone to be with you.',
    '• Contact a trusted person who can be physically present, and tell them plainly what is happening.',
    '• Contact your local emergency number or go to the nearest emergency department if you might act on these thoughts.',
    '• If you can, put distance between yourself and the situation that is escalating.',
    '',
    CRISIS_MESSAGE,
    '',
    'I will not ask you to describe traumatic details, and I will not assign you a numerical prediction. When you are safe, you can return and decide what, if anything, you want to record.',
  ];
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Backwards-compatible helpers used by the API pipeline              */
/* ------------------------------------------------------------------ */

export function detectSafetyFlags(text: string): SafetyFlag[] {
  return assessSafety(text).flags;
}

export function crisisSupplement(flags: SafetyFlag[]): string | null {
  if (!flags.includes('possible-crisis') && !flags.includes('self-harm') && !flags.includes('harm-to-others')) return null;
  return `\n\n${CRISIS_MESSAGE}`;
}

const DIAGNOSTIC_PATTERN = /\b(you (?:have|are diagnosed with|suffer from)|this (?:proves|means) you have|your (?:depression|bipolar|adhd|ptsd|schizophrenia|ocd|autism))\b/i;

export function containsDiagnosticClaim(text: string): boolean {
  return DIAGNOSTIC_PATTERN.test(text);
}

export function safetyWarnings(flags: SafetyFlag[]): string[] {
  if (!flags.length) return [];
  return ['Safety-related language was detected. The response includes general support guidance and is not a crisis service.'];
}

/**
 * Added to an ordinary analysis when historical or non-immediate safety language appears.
 * It does not block the reflection, but it must never be omitted.
 */
export function safetySupportNote(assessment: SafetyAssessment): string | null {
  if (!assessment.categories.includes('self-harm') && !assessment.categories.includes('harm-to-others')) return null;
  return [
    'A note before anything else: some of what you described involves safety-related thoughts.',
    'If any of it is current, please contact a trusted person who can be with you, or your local emergency services, rather than continuing alone with the analysis.',
    CRISIS_MESSAGE,
  ].join(' ');
}

/** Used by tests and the client to confirm that no predictive risk category is ever emitted. */
export function containsRiskLabel(text: string): boolean {
  return /\b(low|medium|moderate|high)[-\s]?risk\b|\brisk (?:score|level|category)\b|\bsuicide (?:risk|probability)\b/i.test(text);
}
