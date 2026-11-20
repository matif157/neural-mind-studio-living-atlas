import type { AiProviderId } from '../../shared/domain';

export interface ProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface ProviderResult {
  text: string;
  model: string;
  offline: boolean;
  warnings: string[];
  estimatedCostUsd: number | null;
}

export interface AiProvider {
  id: AiProviderId;
  model: string;
  available: boolean;
  generate(request: ProviderRequest): Promise<ProviderResult>;
  stream(request: ProviderRequest, onChunk: (chunk: string) => void): Promise<ProviderResult>;
}
