import { useEffect, useState, useCallback, useRef } from 'react';
import { ApiError, getProducts, type ProductFilters } from '../services/api';
import {
  buildProductsCacheKey,
  fetchWithDedup,
  readCachedCatalog,
  shouldPersistProductsKey,
  writeCachedCatalog,
} from '../services/catalogCache';
import type { Product } from '../types';

const SLOW_LOAD_THRESHOLD_MS = 4000;

export function useProducts(filters?: ProductFilters) {
  const categoryId = filters?.categoryId;
  const category = filters?.category;
  const search = filters?.search;
  const isAvailable = filters?.isAvailable;

  const cacheKey = buildProductsCacheKey({ categoryId, category, search, isAvailable });
  const allowPersist = shouldPersistProductsKey({ categoryId, category, search, isAvailable });
  const initialCache = readCachedCatalog<Product[]>(cacheKey, allowPersist);

  const [prevCacheKey, setPrevCacheKey] = useState<string>(cacheKey);
  const [products, setProducts] = useState<Product[]>(() => initialCache?.data ?? []);
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
      setProducts(initialCache.data);
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
  const productsRef = useRef<Product[]>(products);
  const errorRef = useRef<string | null>(error);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

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
      signal,
      bypassInFlight = false,
    }: {
      background?: boolean;
      signal?: AbortSignal;
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
            getProducts(
              { categoryId, category, search, isAvailable },
              {
                signal,
                onRetry: info => {
                  onRetry(info);
                },
              },
            ),
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

        writeCachedCatalog(cacheKey, data, allowPersist);
        productsRef.current = data;
        errorRef.current = null;
        setProducts(data);
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
          const message = err instanceof Error ? err.message : 'Failed to load drinks';
          errorRef.current = message;
          setError(message);
          setLoading(false);
          setIsSlowLoading(false);
        }
        setIsRevalidating(false);
      }
    },
    [allowPersist, cacheKey, category, categoryId, clearSlowTimer, isAvailable, search],
  );

  useEffect(() => {
    const hasActiveSearch = Boolean(search?.trim());
    const cached = readCachedCatalog<Product[]>(cacheKey, allowPersist);

    if (cached?.isFresh) {
      return;
    }

    const controller = hasActiveSearch ? new AbortController() : undefined;
    void runRequest({
      background: Boolean(cached),
      signal: controller?.signal,
      bypassInFlight: hasActiveSearch,
    });

    return () => {
      requestIdRef.current += 1;
      clearSlowTimer();
      controller?.abort();
    };
  }, [allowPersist, cacheKey, clearSlowTimer, runRequest, search]);

  const refetch = useCallback(() => {
    const background = productsRef.current.length > 0 && !errorRef.current;
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
    products,
    loading,
    isSlowLoading,
    isRevalidating,
    retryAttempt,
    error,
    refetch,
  };
}
