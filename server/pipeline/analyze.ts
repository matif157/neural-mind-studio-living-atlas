import { aiResponseJsonSchema } from '../../shared/aiJsonSchema';
import type { AnalysisRequest, AnalysisResponse } from '../../shared/schemas';
import { config } from '../config';
import { getProvider, isAllowed } from '../providers/registry';
import { safeErrorMessage } from '../security';
import { buildUserPrompt, SYSTEM_PROMPT } from './systemPrompt';
import { safetyWarnings } from './safety';
import { validateAnalysis } from './validate';

export class AnalysisError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function runAnalysis(
  request: AnalysisRequest,
  onChunk?: (chunk: string) => void,
): Promise<AnalysisResponse> {
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

  return {
    analysis: validated.analysis,
    meta: {
      provider: provider.id,
      model: output.model,
      latencyMs: Date.now() - started,
      offline: output.offline,
      warnings: [...output.warnings, ...validated.warnings, ...safetyWarnings(validated.analysis.safety_flags)],
      promptChars: userPrompt.length + SYSTEM_PROMPT.length,
      completionChars: output.text.length,
      estimatedCostUsd: output.estimatedCostUsd,
    },
  };
}
