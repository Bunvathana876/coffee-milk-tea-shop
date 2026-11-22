import { getBaseUrl, type ProductFilters, type RetryInfo } from './api';

const STORAGE_PREFIX = 'brew_boba_catalog_v1:';
const FRESH_TTL_MS = 60_000;
const MAX_PERSISTED_AGE_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  updatedAt: number;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  listeners: Set<(info: RetryInfo) => void>;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, InFlightEntry<unknown>>();

function getScopedKey(key: string): string {
  return `${getBaseUrl()}|${key}`;
}

export function buildProductsCacheKey(filters?: ProductFilters): string {
  const normalized = {
    categoryId: filters?.categoryId ?? null,
    category: filters?.category?.trim() || null,
    search: filters?.search?.trim() || null,
    isAvailable: filters?.isAvailable ?? null,
  };
  return `products:${JSON.stringify(normalized)}`;
}

export function buildCategoriesCacheKey(activeOnly: boolean): string {
  return `categories:active=${String(activeOnly)}`;
}

export function shouldPersistProductsKey(filters?: ProductFilters): boolean {
  return (
    !filters?.search?.trim() &&
    !filters?.category?.trim() &&
    filters?.categoryId === undefined
  );
}

export function readCachedCatalog<T>(
  key: string,
  allowPersisted: boolean,
): { data: T; updatedAt: number; isFresh: boolean } | null {
  const scopedKey = getScopedKey(key);
  const now = Date.now();
  const inMemory = memoryCache.get(scopedKey) as CacheEntry<T> | undefined;

  if (inMemory) {
    const age = now - inMemory.updatedAt;
    if (age >= -60_000 && age <= MAX_PERSISTED_AGE_MS) {
      return {
        data: inMemory.data,
        updatedAt: inMemory.updatedAt,
        isFresh: age < FRESH_TTL_MS,
      };
    }
    memoryCache.delete(scopedKey);
  }

  if (!allowPersisted || typeof localStorage === 'undefined') {
    return null;
  }

  const storageKey = `${STORAGE_PREFIX}${scopedKey}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEntry<T>>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.data) ||
      typeof parsed.updatedAt !== 'number' ||
      !Number.isFinite(parsed.updatedAt)
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const age = now - parsed.updatedAt;
    if (age > MAX_PERSISTED_AGE_MS || age < -60_000) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const entry: CacheEntry<T> = {
      data: parsed.data as T,
      updatedAt: parsed.updatedAt,
    };
    memoryCache.set(scopedKey, entry);

    return {
      data: entry.data,
      updatedAt: entry.updatedAt,
      isFresh: age < FRESH_TTL_MS,
    };
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore storage cleanup failures
    }
    return null;
  }
}

export function writeCachedCatalog<T>(key: string, data: T, persist: boolean): void {
  const scopedKey = getScopedKey(key);
  const entry: CacheEntry<T> = {
    data,
    updatedAt: Date.now(),
  };

  memoryCache.set(scopedKey, entry);

  if (!persist || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${scopedKey}`, JSON.stringify(entry));
  } catch {
    // ignore storage quota or privacy-mode errors
  }
}

export async function fetchWithDedup<T>(
  key: string,
  fetcher: (onRetry: (info: RetryInfo) => void) => Promise<T>,
  onRetry?: (info: RetryInfo) => void,
  bypassInFlight: boolean = false,
): Promise<T> {
  if (bypassInFlight) {
    return fetcher(info => {
      onRetry?.(info);
    });
  }

  const scopedKey = getScopedKey(key);
  const existing = inFlightRequests.get(scopedKey) as InFlightEntry<T> | undefined;

  if (existing) {
    if (onRetry) {
      existing.listeners.add(onRetry);
    }
    try {
      return await existing.promise;
    } finally {
      if (onRetry) {
        existing.listeners.delete(onRetry);
      }
    }
  }

  const listeners = new Set<(info: RetryInfo) => void>();
  if (onRetry) {
    listeners.add(onRetry);
  }

  const promise = fetcher(info => {
    for (const listener of listeners) {
      listener(info);
    }
  }).finally(() => {
    inFlightRequests.delete(scopedKey);
    listeners.clear();
  });

  inFlightRequests.set(scopedKey, { promise, listeners });
  return promise;
}

export function clearCatalogCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();

  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore storage errors
  }
}
