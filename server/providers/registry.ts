import { AI_PROVIDER_META, type AiProviderId } from '../../shared/domain';
import { config } from '../config';
import { createGeminiProvider } from './gemini';
import { createOpenAICompatibleProvider } from './openaiCompatible';
import { offlineProvider } from './offline';
import type { AiProvider } from './types';

export function getProvider(id: AiProviderId, model?: string): AiProvider {
  switch (id) {
    case 'gemini': return createGeminiProvider(model);
    case 'openrouter': return createOpenAICompatibleProvider('openrouter', model);
    case 'deepseek': return createOpenAICompatibleProvider('deepseek', model);
    case 'local': return createOpenAICompatibleProvider('local', model);
    case 'offline': return offlineProvider;
  }
}

export function isAllowed(id: AiProviderId): boolean {
  return config.allowedProviders.includes(id);
}

export function providerCatalogue(): Array<{
  id: AiProviderId; label: string; available: boolean; model: string; note: string; allowed: boolean;
}> {
  return (Object.keys(AI_PROVIDER_META) as AiProviderId[]).map((id) => {
    const provider = getProvider(id);
    return {
      id,
      label: AI_PROVIDER_META[id].label,
      note: AI_PROVIDER_META[id].note,
      available: provider.available && isAllowed(id),
      model: provider.model,
      allowed: isAllowed(id),
    };
  });
}
