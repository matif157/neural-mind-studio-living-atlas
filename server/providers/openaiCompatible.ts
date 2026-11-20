import { config } from '../config';
import type { AiProvider, ProviderRequest, ProviderResult } from './types';

type CompatibleId = 'openrouter' | 'deepseek' | 'local';

const SETTINGS: Record<Exclude<CompatibleId, 'local'>, { key: string; model: string; url: string }> = {
  openrouter: { key: config.openrouter.apiKey, model: config.openrouter.model, url: config.openrouter.baseUrl },
  deepseek: { key: config.deepseek.apiKey, model: config.deepseek.model, url: config.deepseek.baseUrl },
};

const ROUGH_PRICES: Record<string, [number, number]> = {
  'deepseek-chat': [0.27, 1.1],
  'deepseek/deepseek-chat': [0.27, 1.1],
};

function estimate(model: string, promptChars: number, completionChars: number): number | null {
  const price = ROUGH_PRICES[model];
  if (!price) return null;
  return ((promptChars / 4) * price[0] + (completionChars / 4) * price[1]) / 1_000_000;
}

function body(request: ProviderRequest, model: string, stream: boolean) {
  return JSON.stringify({
    model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    temperature: request.temperature,
    max_tokens: request.maxOutputTokens,
    response_format: { type: 'json_object' },
    stream,
  });
}

function headers(id: CompatibleId): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (id === 'local') {
    if (config.local.apiKey) base.Authorization = `Bearer ${config.local.apiKey}`;
    return base;
  }
  base.Authorization = `Bearer ${SETTINGS[id].key}`;
  if (id === 'openrouter') {
    base['HTTP-Referer'] = 'https://github.com/matif157/neural-mind-studio-living-atlas';
    base['X-Title'] = 'Neural Mind Studio — Living Mind Atlas';
  }
  return base;
}

export function createOpenAICompatibleProvider(id: CompatibleId, modelOverride?: string): AiProvider {
  const isLocal = id === 'local';
  const model = modelOverride?.trim() || (isLocal ? config.local.model : SETTINGS[id].model);
  const url = isLocal ? `${config.local.baseUrl}/chat/completions` : SETTINGS[id].url;

  const requestInit = (request: ProviderRequest, stream: boolean): RequestInit => ({
    method: 'POST',
    headers: headers(id),
    body: body(request, model, stream),
    signal: AbortSignal.timeout(request.timeoutMs),
  });

  return {
    id,
    model,
    available: isLocal || Boolean(SETTINGS[id].key),
    async generate(request): Promise<ProviderResult> {
      const response = await fetch(url, requestInit(request, false));
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('Provider returned an empty response');
      return {
        text, model, offline: false, warnings: [],
        estimatedCostUsd: estimate(model, request.userPrompt.length + request.systemPrompt.length, text.length),
      };
    },
    async stream(request, onChunk): Promise<ProviderResult> {
      const response = await fetch(url, requestInit(request, true));
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      if (!response.body) throw new Error('Streaming is not supported by this endpoint');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const piece = parsed.choices?.[0]?.delta?.content ?? '';
            if (piece) {
              text += piece;
              onChunk(piece);
            }
          } catch {
            // Ignore malformed keep-alive frames from proxies.
          }
        }
      }
      if (!text) throw new Error('Provider returned an empty stream');
      return {
        text, model, offline: false, warnings: [],
        estimatedCostUsd: estimate(model, request.userPrompt.length + request.systemPrompt.length, text.length),
      };
    },
  };
}
