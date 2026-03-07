/**
 * Lightweight session cache for solve results.
 * Avoids duplicate API calls for repeated problems within the same session.
 * Separate caches for LLM results and symbolic results.
 */

interface CachedSolve {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 20;

const solveCache = new Map<string, CachedSolve>();
const symbolicCache = new Map<string, CachedSolve>();

function makeKey(input: string, hasImage: boolean, isPremium: boolean, solveMode: string): string {
  return `${input}|${hasImage}|${isPremium}|${solveMode}`;
}

function isExpired(entry: CachedSolve): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL;
}

function evictOldest(cache: Map<string, CachedSolve>) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

export function getCachedSolve(input: string, hasImage: boolean, isPremium: boolean, solveMode: string): any | null {
  const key = makeKey(input, hasImage, isPremium, solveMode);
  const entry = solveCache.get(key);
  if (!entry || isExpired(entry)) {
    if (entry) solveCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedSolve(input: string, hasImage: boolean, isPremium: boolean, solveMode: string, data: any) {
  const key = makeKey(input, hasImage, isPremium, solveMode);
  evictOldest(solveCache);
  solveCache.set(key, { data, timestamp: Date.now() });
}

export function getCachedSymbolic(expr: string): string | null {
  const entry = symbolicCache.get(expr);
  if (!entry || isExpired(entry)) {
    if (entry) symbolicCache.delete(expr);
    return null;
  }
  return entry.data;
}

export function setCachedSymbolic(expr: string, result: string) {
  evictOldest(symbolicCache);
  symbolicCache.set(expr, { data: result, timestamp: Date.now() });
}
