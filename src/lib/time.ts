export const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MIN_TTL_SECONDS = 5 * 60;
export const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;

export function nowIso(): string {
  return new Date().toISOString();
}

export function ttlConfig(env: {
  DEFAULT_TTL_SECONDS?: string;
  MIN_TTL_SECONDS?: string;
  MAX_TTL_SECONDS?: string;
}) {
  return {
    defaultTtl: positiveInt(env.DEFAULT_TTL_SECONDS, DEFAULT_TTL_SECONDS),
    minTtl: positiveInt(env.MIN_TTL_SECONDS, MIN_TTL_SECONDS),
    maxTtl: positiveInt(env.MAX_TTL_SECONDS, MAX_TTL_SECONDS)
  };
}

export function normalizeTtlSeconds(value: unknown, env: {
  DEFAULT_TTL_SECONDS?: string;
  MIN_TTL_SECONDS?: string;
  MAX_TTL_SECONDS?: string;
}): number | null {
  const { defaultTtl, minTtl, maxTtl } = ttlConfig(env);
  if (value === undefined || value === null || value === "") return defaultTtl;
  const ttl = Number(value);
  if (!Number.isInteger(ttl) || ttl < minTtl || ttl > maxTtl) return null;
  return ttl;
}

export function addSecondsIso(seconds: number, from = Date.now()): string {
  return new Date(from + seconds * 1000).toISOString();
}

export function isExpired(expiresAt: string, at = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= at;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
