import { aiResponseJsonSchema } from '../../shared/aiJsonSchema';
import type { AiAnalysis, AnalysisRequest, AnalysisResponse } from '../../shared/schemas';
import { config } from '../config';
import { getProvider, isAllowed } from '../providers/registry';
import { safeErrorMessage } from '../security';
import { buildUserPrompt, SYSTEM_PROMPT } from './systemPrompt';
import { assessSafety, safetySupportNote, safetyWarnings, type SafetyAssessment } from './safety';
import { validateAnalysis } from './validate';

export class AnalysisError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/**
 * Safety-gate response: no provider call, no graph proposals, no interpretation.
 * Used when the conversation may describe a current safety concern.
 */
function safetyOnlyAnalysis(assessment: SafetyAssessment): AiAnalysis {
  const hasHarmToOthers = assessment.categories.includes('harm-to-others');
  return {
    response_to_user: assessment.guidance ?? 'Your message may describe a safety concern. Please focus on immediate human support before any further reflection.',
    conversation_summary: hasHarmToOthers
      ? 'Safety gate engaged: the message may describe current intent to harm another person. Ordinary analysis was paused.'
      : 'Safety gate engaged: the message may describe a current risk of self-harm. Ordinary analysis was paused.',
    situation: [],
    emotions: [],
    thoughts: [],
    cognitive_patterns: [],
    possible_needs: [],
    reported_behaviours: [],
    alternative_perspectives: [],
    suggested_exercises: [],
    professional_support_considerations: [
      'Contact local emergency services or a crisis line if there is any immediate danger.',
      'A trusted person who can be physically present is more useful right now than further analysis.',
    ],
    proposed_graph_nodes: [],
    proposed_graph_edges: [],
    clarifying_questions: ['Are you safe right now, and is there someone who can be with you?'],
    safety_flags: assessment.flags,
  };
}

export async function runAnalysis(
  request: AnalysisRequest,
  onChunk?: (chunk: string) => void,
): Promise<AnalysisResponse> {
  const joined = request.messages.map((message) => message.text).join('\n');
  const assessment = assessSafety(joined);

  // Immediate safety interrupts ordinary analysis. It never becomes a graph update.
  if (assessment.immediateRisk) {
    const analysis = safetyOnlyAnalysis(assessment);
    const text = analysis.response_to_user;
    onChunk?.(text);
    return {
      analysis,
      meta: {
        provider: 'offline',
        model: 'safety-gate-v1',
        latencyMs: 0,
        offline: true,
        warnings: [
          'Safety gate engaged. No AI provider was called and no graph proposal was generated.',
          ...safetyWarnings(assessment.flags),
        ],
        promptChars: joined.length,
        completionChars: text.length,
        estimatedCostUsd: 0,
      },
    };
  }

  const providerId = request.provider ?? config.defaultProvider;
  if (!isAllowed(providerId)) throw new AnalysisError('This AI provider is disabled by the server configuration.', 403);
  const provider = getProvider(providerId, request.model);
  if (!provider.available) throw new AnalysisError('The selected provider has no server-side credentials configured.', 503);

  const userPrompt = buildUserPrompt({
    messages: request.messages,
    context: request.context,
    maxChars: config.maxContextChars,
  });
  const providerRequest = {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    jsonSchema: aiResponseJsonSchema,
    temperature: 0.35,
    maxOutputTokens: 2600,
    timeoutMs: config.requestTimeoutMs,
  };

  const started = Date.now();
  let output;
  try {
    output = request.stream && provider.id !== 'offline'
      ? await provider.stream(providerRequest, onChunk ?? (() => undefined))
      : await provider.generate(providerRequest);
    if (onChunk && provider.id === 'offline') onChunk(output.text);
  } catch (error) {
    throw new AnalysisError(`The AI provider could not complete the request: ${safeErrorMessage(error)}`, 502);
  }

  let validated;
  try {
    validated = validateAnalysis(output.text, request);
  } catch (error) {
    throw new AnalysisError(safeErrorMessage(error), 422);
  }

  // Non-immediate safety language still receives an explicit support note.
  const supportNote = safetySupportNote(assessment);
  const analysis = supportNote
    ? { ...validated.analysis, response_to_user: `${supportNote}\n\n${validated.analysis.response_to_user}` }
    : validated.analysis;

  return {
    analysis,
    meta: {
      provider: provider.id,
      model: output.model,
      latencyMs: Date.now() - started,
      offline: output.offline,
      warnings: [...output.warnings, ...validated.warnings, ...safetyWarnings(assessment.flags)],
      promptChars: userPrompt.length + SYSTEM_PROMPT.length,
      completionChars: output.text.length,
      estimatedCostUsd: output.estimatedCostUsd,
    },
  };
}
