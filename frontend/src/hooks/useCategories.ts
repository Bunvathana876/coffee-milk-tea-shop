import { useEffect, useState, useCallback, useRef } from 'react';
import { ApiError, getCategories } from '../services/api';
import {
  buildCategoriesCacheKey,
  fetchWithDedup,
  readCachedCatalog,
  writeCachedCatalog,
} from '../services/catalogCache';
import type { Category } from '../types';

const SLOW_LOAD_THRESHOLD_MS = 4000;

export function useCategories(activeOnly: boolean = true) {
  const cacheKey = buildCategoriesCacheKey(activeOnly);
  const initialCache = readCachedCatalog<Category[]>(cacheKey, true);

  const [prevCacheKey, setPrevCacheKey] = useState<string>(cacheKey);
  const [categories, setCategories] = useState<Category[]>(() => initialCache?.data ?? []);
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [isSlowLoading, setIsSlowLoading] = useState<boolean>(false);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(() =>
    Boolean(initialCache && !initialCache.isFresh),
  );
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  if (cacheKey !== prevCacheKey) {
    setPrevCacheKey(cacheKey);
    if (initialCache) {
      setCategories(initialCache.data);
      setError(null);
      setLoading(false);
      setIsRevalidating(!initialCache.isFresh);
      setIsSlowLoading(false);
      setRetryAttempt(0);
    } else {
      setLoading(true);
      setError(null);
      setIsRevalidating(false);
      setIsSlowLoading(false);
      setRetryAttempt(0);
    }
  }

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesRef = useRef<Category[]>(categories);
  const errorRef = useRef<string | null>(error);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current !== null) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearSlowTimer();
    };
  }, [clearSlowTimer]);

  const runRequest = useCallback(
    async ({
      background = false,
      bypassInFlight = false,
    }: {
      background?: boolean;
      bypassInFlight?: boolean;
    } = {}) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      clearSlowTimer();
      if (!background) {
        slowTimerRef.current = setTimeout(() => {
          if (mountedRef.current && requestId === requestIdRef.current) {
            setIsSlowLoading(true);
          }
        }, SLOW_LOAD_THRESHOLD_MS);
      }

      try {
        const data = await fetchWithDedup(
          cacheKey,
          onRetry =>
            getCategories(activeOnly, {
              onRetry: info => {
                onRetry(info);
              },
            }),
          info => {
            if (mountedRef.current && requestId === requestIdRef.current && !background) {
              setIsSlowLoading(true);
              setRetryAttempt(info.attempt);
            }
          },
          bypassInFlight,
        );

        clearSlowTimer();
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        writeCachedCatalog(cacheKey, data, true);
        categoriesRef.current = data;
        errorRef.current = null;
        setCategories(data);
        setError(null);
        setLoading(false);
        setIsRevalidating(false);
        setIsSlowLoading(false);
        setRetryAttempt(0);
      } catch (err) {
        clearSlowTimer();
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        if (err instanceof ApiError && err.code === 'ABORTED') return;

        if (!background) {
          const message = err instanceof Error ? err.message : 'Failed to load categories';
          errorRef.current = message;
          setError(message);
          setLoading(false);
          setIsSlowLoading(false);
        }
        setIsRevalidating(false);
      }
    },
    [activeOnly, cacheKey, clearSlowTimer],
  );

  useEffect(() => {
    const cached = readCachedCatalog<Category[]>(cacheKey, true);

    if (cached?.isFresh) {
      return;
    }

    void runRequest({
      background: Boolean(cached),
    });

    return () => {
      requestIdRef.current += 1;
      clearSlowTimer();
    };
  }, [cacheKey, clearSlowTimer, runRequest]);

  const refetch = useCallback(() => {
    const background = categoriesRef.current.length > 0 && !errorRef.current;
    if (background) {
      setIsRevalidating(true);
    } else {
      errorRef.current = null;
      setLoading(true);
      setError(null);
      setIsSlowLoading(false);
      setRetryAttempt(0);
    }
    return runRequest({
      background,
      bypassInFlight: true,
    });
  }, [runRequest]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }

    const handleOnline = () => {
      if (errorRef.current) {
        void refetch();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [refetch]);

  return {
    categories,
    loading,
    isSlowLoading,
    isRevalidating,
    retryAttempt,
    error,
    refetch,
  };
}
