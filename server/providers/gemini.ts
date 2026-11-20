import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import type { AiProvider, ProviderRequest, ProviderResult } from './types';

const PRICES: Record<string, [number, number]> = {
  'gemini-2.5-flash': [0.3, 2.5],
  'gemini-2.0-flash': [0.1, 0.4],
  'gemini-2.5-pro': [1.25, 10],
};

function estimate(model: string, promptChars: number, completionChars: number): number | null {
  const price = PRICES[model];
  if (!price) return null;
  return ((promptChars / 4) * price[0] + (completionChars / 4) * price[1]) / 1_000_000;
}

export function createGeminiProvider(modelOverride?: string): AiProvider {
  const model = modelOverride?.trim() || config.gemini.model;
  const client = new GoogleGenAI({ apiKey: config.gemini.apiKey });

  const params = (request: ProviderRequest) => ({
    model,
    contents: request.userPrompt,
    config: {
      systemInstruction: request.systemPrompt,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      responseMimeType: 'application/json',
      responseJsonSchema: request.jsonSchema,
      abortSignal: AbortSignal.timeout(request.timeoutMs),
    },
  });

  return {
    id: 'gemini',
    model,
    available: Boolean(config.gemini.apiKey),
    async generate(request): Promise<ProviderResult> {
      const response = await client.models.generateContent(params(request));
      const text = response.text ?? '';
      return {
        text,
        model,
        offline: false,
        warnings: [],
        estimatedCostUsd: estimate(model, request.userPrompt.length + request.systemPrompt.length, text.length),
      };
    },
    async stream(request, onChunk): Promise<ProviderResult> {
      const stream = await client.models.generateContentStream(params(request));
      let text = '';
      for await (const chunk of stream) {
        const piece = chunk.text ?? '';
        if (piece) {
          text += piece;
          onChunk(piece);
        }
      }
      return {
        text,
        model,
        offline: false,
        warnings: [],
        estimatedCostUsd: estimate(model, request.userPrompt.length + request.systemPrompt.length, text.length),
      };
    },
  };
}
