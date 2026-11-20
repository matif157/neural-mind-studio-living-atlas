import type { AnalysisRequest, AnalysisResponse } from '@shared/schemas';
import type { AiProviderId } from '@shared/domain';

const TOKEN_KEY = 'neural-mind-atlas-api-token';

export function getApiToken(): string {
  try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}

export function setApiToken(token: string): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* session storage unavailable */ }
}

function headers(): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getApiToken();
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  } catch {
    throw new Error('The local API is not reachable. Start it with `npm run dev:api` or `npm run dev`.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? `API request failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function analyzeMessage(request: AnalysisRequest): Promise<AnalysisResponse> {
  return apiFetch<AnalysisResponse>('/analyze', { method: 'POST', body: JSON.stringify(request) });
}

export interface StreamHandlers {
  onToken?: (chunk: string) => void;
  onStatus?: (message: string) => void;
}

export async function streamAnalysis(request: AnalysisRequest, handlers: StreamHandlers = {}): Promise<AnalysisResponse> {
  let response: Response;
  try {
    response = await fetch('/api/analyze/stream', { method: 'POST', headers: headers(), body: JSON.stringify({ ...request, stream: true }) });
  } catch {
    throw new Error('The local API is not reachable. Start it with `npm run dev:api` or `npm run dev`.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? `Streaming failed (HTTP ${response.status}).`);
  }
  if (!response.body) throw new Error('Streaming is not supported by this browser.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AnalysisResponse | null = null;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const event = frame.match(/^event:\s*(.+)$/m)?.[1] ?? '';
      const data = frame.match(/^data:\s*(.+)$/m)?.[1];
      if (!data) continue;
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (event === 'token' && typeof payload.chunk === 'string') handlers.onToken?.(payload.chunk);
      if (event === 'status' && typeof payload.message === 'string') handlers.onStatus?.(payload.message);
      if (event === 'result') result = payload as unknown as AnalysisResponse;
      if (event === 'error') streamError = String(payload.error ?? 'Streaming failed.');
    }
  }
  if (streamError) throw new Error(streamError);
  if (!result) throw new Error('The stream ended before a validated analysis was produced.');
  return result;
}

export interface ProviderInfo {
  id: AiProviderId;
  label: string;
  available: boolean;
  model: string;
  note: string;
  allowed: boolean;
}

export function fetchProviders(): Promise<{ providers: ProviderInfo[] }> {
  return apiFetch('/providers');
}

export function fetchHealth(): Promise<{ ok: boolean; defaultProvider: string; authRequired: boolean; schemaVersion: number }> {
  return apiFetch('/health');
}

export async function testConnection(provider: AiProviderId, model?: string): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  return apiFetch('/test-connection', { method: 'POST', body: JSON.stringify({ provider, model }) });
}
