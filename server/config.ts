import 'dotenv/config';
import { AI_PROVIDERS, type AiProviderId } from '../shared/domain';

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const parseProviders = (value: string | undefined): AiProviderId[] => {
  if (!value?.trim()) return [...AI_PROVIDERS];
  const allowed = value.split(',').map((item) => item.trim()).filter((item): item is AiProviderId =>
    (AI_PROVIDERS as readonly string[]).includes(item),
  );
  return allowed.length ? allowed : [...AI_PROVIDERS];
};

export const config = {
  port: int(process.env.PORT, 8787),
  apiToken: process.env.MIND_API_TOKEN?.trim() || '',
  allowedProviders: parseProviders(process.env.MIND_ALLOWED_PROVIDERS),
  defaultProvider: (AI_PROVIDERS.includes(process.env.MIND_AI_PROVIDER as AiProviderId)
    ? process.env.MIND_AI_PROVIDER
    : 'offline') as AiProviderId,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY?.trim() || '',
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || '',
    model: process.env.OPENROUTER_MODEL?.trim() || 'deepseek/deepseek-chat',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() || '',
    model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
  },
  local: {
    apiKey: process.env.LOCAL_AI_KEY?.trim() || '',
    model: process.env.LOCAL_AI_MODEL?.trim() || 'llama3.1',
    baseUrl: (process.env.LOCAL_AI_BASE_URL?.trim() || 'http://localhost:11434/v1').replace(/\/$/, ''),
  },
  rateLimit: int(process.env.MIND_RATE_LIMIT, 30),
  rateWindowMs: int(process.env.MIND_RATE_WINDOW_MS, 60_000),
  maxContextChars: int(process.env.MIND_MAX_CONTEXT_CHARS, 24_000),
  corsOrigin: process.env.MIND_CORS_ORIGIN?.trim() || 'http://localhost:5173',
  requestTimeoutMs: int(process.env.MIND_REQUEST_TIMEOUT_MS, 60_000),
};
