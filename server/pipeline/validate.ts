import { aiAnalysisSchema, type AiAnalysis, type AnalysisRequest } from '../../shared/schemas';
import type { MindNodeKind } from '../../shared/domain';
import { containsDiagnosticClaim, crisisSupplement, detectSafetyFlags } from './safety';

const ALLOWED_PROPOSAL_KINDS = new Set<MindNodeKind>([
  'emotion', 'thought', 'pattern', 'memory', 'belief', 'need', 'behavior',
  'context', 'body', 'goal', 'value', 'coping', 'social', 'situation',
]);

const INTENSITY_PATTERN = /(\b\d{1,3}\s*(\/10|%|out of (?:10|ten)|points?)\b|\b(?:rated?|intensity|scale of)\s*\w*\s*\d|\b(?:very|extremely|slightly)\s+intense\b)/i;

function stripFences(value: string): string {
  const trimmed = value.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  return start >= 0 && end > start ? withoutFences.slice(start, end + 1) : withoutFences;
}

function removeDiagnosticClaims(text: string): string {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => !containsDiagnosticClaim(sentence)).join(' ');
}

export function validateAnalysis(rawText: string, request: AnalysisRequest): { analysis: AiAnalysis; warnings: string[] } {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(rawText));
  } catch {
    throw new Error('The model response was not valid JSON. No graph changes were created.');
  }
  const result = aiAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`The model response did not match the analysis contract (${first?.path.join('.') || 'root'}). No graph changes were created.`);
  }
  const analysis = result.data;
  const userText = request.messages.filter((message) => message.role === 'user').map((message) => message.text).join('\n');
  const hasExplicitIntensity = INTENSITY_PATTERN.test(userText);

  if (!hasExplicitIntensity && analysis.emotions.some((emotion) => emotion.intensity !== null)) {
    analysis.emotions = analysis.emotions.map((emotion) => ({ ...emotion, intensity: null }));
    warnings.push('Intensity values were removed because the user did not explicitly state an intensity.');
  }

  const flags = new Set(analysis.safety_flags);
  for (const flag of detectSafetyFlags(userText)) flags.add(flag);
  analysis.safety_flags = [...flags];
  const supplement = crisisSupplement(analysis.safety_flags);
  if (supplement && !analysis.response_to_user.includes(CRISIS_MARKER)) {
    analysis.response_to_user = `${analysis.response_to_user}${supplement}`;
    warnings.push('Support guidance was appended because safety-related language was detected.');
  }

  const cleanedResponse = removeDiagnosticClaims(analysis.response_to_user);
  if (cleanedResponse !== analysis.response_to_user) warnings.push('Diagnostic wording was removed from the response.');
  analysis.response_to_user = cleanedResponse.trim() || 'I want to be careful not to draw conclusions I cannot support. Would you like to describe what happened in your own words?';

  const seen = new Set<string>();
  analysis.proposed_graph_nodes = analysis.proposed_graph_nodes.filter((node) => {
    if (!ALLOWED_PROPOSAL_KINDS.has(node.kind) || seen.has(node.tempId)) {
      warnings.push(`A proposed node was rejected because its kind or identifier was unsupported (${node.tempId}).`);
      return false;
    }
    seen.add(node.tempId);
    return true;
  }).map((node) => ({ ...node, confidence: Math.min(node.confidence, 0.95) }));

  const knownIds = new Set([...seen, ...request.context.approvedNodes.map((node) => node.id)]);
  analysis.proposed_graph_edges = analysis.proposed_graph_edges.filter((edge) => {
    const valid = knownIds.has(edge.source) && knownIds.has(edge.target) && edge.source !== edge.target;
    if (!valid) warnings.push(`A proposed relationship was rejected because an endpoint was unknown (${edge.source} -> ${edge.target}).`);
    return valid;
  }).map((edge) => ({ ...edge, weight: Math.min(edge.weight, 0.95) }));

  analysis.cognitive_patterns = analysis.cognitive_patterns.map((pattern) => ({ ...pattern, requires_confirmation: true }));
  return { analysis, warnings };
}

const CRISIS_MARKER = 'not a crisis-monitoring service';
