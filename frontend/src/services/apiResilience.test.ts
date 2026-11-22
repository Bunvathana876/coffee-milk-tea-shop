import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiError,
  getCategories,
  getProducts,
  createOrder,
  request,
  setApiBaseUrl,
  type RetryInfo,
} from './api';
import {
  buildCategoriesCacheKey,
  buildProductsCacheKey,
  clearCatalogCache,
  fetchWithDedup,
  readCachedCatalog,
  shouldPersistProductsKey,
  writeCachedCatalog,
} from './catalogCache';

const originalFetch = globalThis.fetch;
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test.beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createStorageMock(),
    configurable: true,
    writable: true,
  });
  setApiBaseUrl('https://api.brewboba.test');
  clearCatalogCache();
});

test.afterEach(() => {
  clearCatalogCache();
  setApiBaseUrl(null);
  globalThis.fetch = originalFetch;
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor);
  } else {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

test('1. GET /api/products retries automatically after a cold-start timeout and succeeds', async () => {
  let attempts = 0;
  const retryEvents: RetryInfo[] = [];

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise<never>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('Expected signal'));
          return;
        }
        const onAbort = () => {
          reject(signal.reason instanceof Error ? signal.reason : new DOMException('Timed out', 'TimeoutError'));
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }

    return new Response(
      JSON.stringify([
        {
          id: 1,
          category_id: 1,
          name: 'Brown Sugar Boba',
          base_price_usd: 3.5,
          is_available: true,
        },
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }) as typeof fetch;

  const products = await getProducts(undefined, {
    timeoutMs: 25,
    retries: 2,
    retryDelayMs: 5,
    onRetry: info => retryEvents.push(info),
  });

  assert.equal(attempts, 2);
  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Brown Sugar Boba');
  assert.deepEqual(retryEvents, [{ attempt: 2, maxAttempts: 3, reason: 'timeout' }]);
});

test('2. Safe GET retries on Render/proxy gateway responses (502, non-JSON 503, 504) and network errors', async () => {
  let attempts = 0;
  const reasons: RetryInfo['reason'][] = [];

  globalThis.fetch = (async () => {
    attempts += 1;
    if (attempts === 1) {
      return new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (attempts === 2) {
      return new Response('<html>Service Unavailable</html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (attempts === 3) {
      throw new TypeError('Failed to fetch');
    }
    return new Response(
      JSON.stringify([{ id: 1, name: 'Coffee', is_active: true, product_count: 4 }]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }) as typeof fetch;

  const categories = await getCategories(true, {
    retries: 3,
    retryDelayMs: 5,
    onRetry: info => reasons.push(info.reason),
  });

  assert.equal(attempts, 4);
  assert.equal(categories[0].name, 'Coffee');
  assert.deepEqual(reasons, ['gateway', 'gateway', 'network']);
});

test('3. Explicit JSON 503 fails immediately without retrying and preserves detail message', async () => {
  let attempts = 0;

  globalThis.fetch = (async () => {
    attempts += 1;
    return new Response(JSON.stringify({ detail: 'Catalog unavailable for isolated test' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  await assert.rejects(
    () => getProducts(undefined, { retries: 2, retryDelayMs: 5 }),
    err => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 503);
      assert.equal(err.code, 'HTTP');
      assert.equal(err.retryable, false);
      assert.equal(err.message, 'Catalog unavailable for isolated test');
      return true;
    },
  );

  assert.equal(attempts, 1);
});

test('4. POST /api/orders/ does not auto-retry on timeout and preserves order-safety wording', async () => {
  let attempts = 0;

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    attempts += 1;
    await new Promise<never>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('Expected signal'));
        return;
      }
      const onAbort = () => {
        reject(signal.reason instanceof Error ? signal.reason : new DOMException('Timed out', 'TimeoutError'));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    });
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  const origTimeoutRequest = request;
  assert.ok(origTimeoutRequest);

  await assert.rejects(
    () =>
      request('/api/orders/', {
        method: 'POST',
        body: JSON.stringify({ customer_name: 'Test', customer_phone: '012345678', items: [] }),
        timeoutMs: 20,
      }),
    err => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, 'TIMEOUT');
      assert.equal(err.retryable, true);
      assert.equal(
        err.message,
        'Network timeout: The café server did not respond in time. Your order was not confirmed; please retry.',
      );
      return true;
    },
  );

  assert.equal(attempts, 1);
  assert.equal(typeof createOrder, 'function');
});

test('5. Exhausted GET timeout returns menu wake-up guidance without misleading order-confirmation copy', async () => {
  let attempts = 0;

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    attempts += 1;
    await new Promise<never>((_resolve, reject) => {
      const signal = init?.signal;
      const onAbort = () => {
        reject(signal?.reason instanceof Error ? signal.reason : new DOMException('Timed out', 'TimeoutError'));
      };
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, { once: true });
    });
    return new Response('[]', { status: 200 });
  }) as typeof fetch;

  await assert.rejects(
    () => getProducts(undefined, { timeoutMs: 20, retries: 2, retryDelayMs: 5 }),
    err => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, 'TIMEOUT');
      assert.equal(err.retryable, true);
      assert.ok(!err.message.includes('Your order was not confirmed'));
      assert.match(err.message, /Try Again/i);
      return true;
    },
  );

  assert.equal(attempts, 3);
});

test('6. GET requests omit Content-Type header to avoid CORS preflight while POST includes it', async () => {
  const capturedHeaders: Headers[] = [];

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders.push(new Headers(init?.headers));
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  await getProducts();
  await request('/api/orders/', {
    method: 'POST',
    body: JSON.stringify({ items: [] }),
  });

  assert.equal(capturedHeaders[0].has('Content-Type'), false);
  assert.equal(capturedHeaders[0].get('Accept'), 'application/json');
  assert.equal(capturedHeaders[1].get('Content-Type'), 'application/json');
});

test('7. Caller AbortController aborts immediately without retrying', async () => {
  let attempts = 0;
  const controller = new AbortController();

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    attempts += 1;
    await new Promise<never>((_resolve, reject) => {
      const signal = init?.signal;
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, { once: true });
      setTimeout(() => controller.abort(), 5);
    });
    return new Response('[]', { status: 200 });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      getProducts(undefined, {
        signal: controller.signal,
        timeoutMs: 200,
        retries: 2,
        retryDelayMs: 5,
      }),
    err => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, 'ABORTED');
      assert.equal(err.retryable, false);
      return true;
    },
  );

  assert.equal(attempts, 1);
});

test('8. catalogCache scopes entries by origin, ignores corrupted/expired entries, and deduplicates in-flight fetches', async () => {
  const key = buildProductsCacheKey({ isAvailable: true });
  assert.equal(shouldPersistProductsKey({ isAvailable: true }), true);
  assert.equal(shouldPersistProductsKey({ search: 'latte', isAvailable: true }), false);

  writeCachedCatalog(key, [{ id: 1, name: 'Iced Latte' }], true);
  const hitA = readCachedCatalog<{ id: number; name: string }[]>(key, true);
  assert.ok(hitA);
  assert.equal(hitA.isFresh, true);
  assert.equal(hitA.data[0].name, 'Iced Latte');

  // Origin isolation
  setApiBaseUrl('https://other-origin.brewboba.test');
  assert.equal(readCachedCatalog(key, true), null);

  // Corrupted and expired persisted entries are safely evicted
  const catKey = buildCategoriesCacheKey(true);
  localStorage.setItem(
    `brew_boba_catalog_v1:https://other-origin.brewboba.test|${catKey}`,
    '{invalid-json',
  );
  assert.equal(readCachedCatalog(catKey, true), null);
  assert.equal(
    localStorage.getItem(`brew_boba_catalog_v1:https://other-origin.brewboba.test|${catKey}`),
    null,
  );

  localStorage.setItem(
    `brew_boba_catalog_v1:https://other-origin.brewboba.test|${catKey}`,
    JSON.stringify({ data: [{ id: 9 }], updatedAt: Date.now() - 25 * 60 * 60 * 1000 }),
  );
  assert.equal(readCachedCatalog(catKey, true), null);

  // In-flight deduplication and shared retry listener fan-out
  let calls = 0;
  const listenerA: RetryInfo[] = [];
  const listenerB: RetryInfo[] = [];

  const [resA, resB] = await Promise.all([
    fetchWithDedup(
      key,
      async onRetry => {
        calls += 1;
        await new Promise(resolve => setTimeout(resolve, 5));
        onRetry({ attempt: 2, maxAttempts: 3, reason: 'timeout' });
        await new Promise(resolve => setTimeout(resolve, 10));
        return ['shared'];
      },
      info => listenerA.push(info),
    ),
    fetchWithDedup(
      key,
      async () => {
        calls += 1;
        return ['should-not-run'];
      },
      info => listenerB.push(info),
    ),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(resA, ['shared']);
  assert.deepEqual(resB, ['shared']);
  assert.deepEqual(listenerA, [{ attempt: 2, maxAttempts: 3, reason: 'timeout' }]);
  assert.deepEqual(listenerB, [{ attempt: 2, maxAttempts: 3, reason: 'timeout' }]);
});
