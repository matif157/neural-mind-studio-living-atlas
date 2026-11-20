import type { NextFunction, Request, Response } from 'express';
import { config } from './config';

/** Constant-time-ish comparison for the local development bearer token. */
function tokenMatches(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function requireApiToken(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiToken) {
    next();
    return;
  }
  const header = req.header('authorization') ?? '';
  const supplied = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!supplied || !tokenMatches(supplied, config.apiToken)) {
    res.status(401).json({ error: 'Unauthorized. Configure the local API token in Settings.' });
    return;
  }
  next();
}

interface Bucket { times: number[] }
const buckets = new Map<string, Bucket>();

/** Small in-process limiter suitable for a local single-user server. */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = `${req.ip ?? 'unknown'}:${(req.header('authorization') ?? '').slice(-12)}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { times: [] };
  bucket.times = bucket.times.filter((time) => now - time < config.rateWindowMs);
  if (bucket.times.length >= config.rateLimit) {
    res.setHeader('Retry-After', Math.ceil(config.rateWindowMs / 1000));
    res.status(429).json({ error: 'Too many requests. Please wait before sending another message.' });
    return;
  }
  bucket.times.push(now);
  buckets.set(key, bucket);
  if (buckets.size > 2000) buckets.delete(buckets.keys().next().value ?? '');
  next();
}

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /AIza[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
  /api[_-]?key["'\s:=]+[A-Za-z0-9_-]{16,}/gi,
];

export function redact(message: string): string {
  let output = message;
  for (const pattern of SECRET_PATTERNS) output = output.replace(pattern, '[REDACTED]');
  return output.slice(0, 800);
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return redact(error.message);
  return 'The request could not be completed.';
}

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : 500;
  res.status(status).json({ error: safeErrorMessage(error) });
}
