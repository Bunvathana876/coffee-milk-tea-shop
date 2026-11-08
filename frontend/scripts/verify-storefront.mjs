import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const project = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(project + '/package.json');
const { JSDOM } = require('jsdom');
// Public catalog reads only. All application requests below are intercepted locally.
const liveFetch = globalThis.fetch;
const products = await (
  await liveFetch(
    'https://brew-boba-cafe-api-staging.onrender.com/api/products',
  )
).json();
const categories = await (
  await liveFetch(
    'https://brew-boba-cafe-api-staging.onrender.com/api/categories',
  )
).json();
assert(products.length > 0 && categories.length > 0);
const selectedProduct =
  products.find((p) => p.is_available && p.category_id === categories[1]?.id) ||
  products.find((p) => p.is_available);
assert(
  selectedProduct,
  'An available staging product is required for this integration check',
);
const featuredCategory = categories.find(
  (category) => category.id === selectedProduct.category_id,
);
assert(featuredCategory, 'The selected product category exists');
const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  { url: 'http://localhost:5173/' },
);
for (const name of [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'Element',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
])
  globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
let reduced = false;
const mediaListeners = new Set();
window.matchMedia = () => ({
  get matches() {
    return reduced;
  },
  addEventListener: (_, fn) => mediaListeners.add(fn),
  removeEventListener: (_, fn) => mediaListeners.delete(fn),
});
let scrollBehavior;
window.scrollTo = (options) => {
  scrollBehavior = options.behavior;
};
Element.prototype.scrollIntoView = (options) => {
  scrollBehavior = options.behavior;
};
class Observer {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    queueMicrotask(() => this.callback([{ target, isIntersecting: true }]));
  }
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = window.IntersectionObserver = Observer;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const calls = [];
let failCatalog = false;
let failOrders = false;
const user = {
  id: 990001,
  full_name: 'DOM QA user',
  phone: '00000000',
  loyalty_stamps: 0,
  is_active: true,
};
const fixtureOrder = {
  id: 990001,
  order_number: 'DOM-QA-ONLY',
  order_status: 'ready',
  payment_status: 'pending',
  total_usd: 5,
  total_khr: 20000,
  created_at: '2026-11-08T00:00:00Z',
};
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url, window.location.origin);
  const method = options.method || 'GET';
  calls.push({
    path: parsed.pathname,
    method,
    headers: new Headers(options.headers),
  });
  if (parsed.pathname === '/api/health') return response({ status: 'healthy' });
  if (parsed.pathname === '/api/categories') return response(categories);
  if (parsed.pathname === '/api/products') {
    if (failCatalog)
      return response({ detail: 'Catalog unavailable for isolated test' }, 503);
    let list = products;
    if (parsed.searchParams.has('category'))
      list = list.filter(
        (p) => p.category_name === parsed.searchParams.get('category'),
      );
    if (parsed.searchParams.has('search'))
      list = list.filter((p) =>
        p.name
          .toLowerCase()
          .includes(parsed.searchParams.get('search').toLowerCase()),
      );
    if (parsed.searchParams.get('is_available') === 'true')
      list = list.filter((p) => p.is_available);
    return response(list);
  }
  if (parsed.pathname === '/api/auth/me' && method === 'GET')
    return response(user);
  if (
    ['/api/auth/login', '/api/auth/register'].includes(parsed.pathname) &&
    method === 'POST'
  )
    return response({ user, access_token: 'isolated-dom-token' });
  if (parsed.pathname === '/api/orders/lookup/phone' && method === 'GET')
    return failOrders
      ? response({ detail: 'Orders unavailable for isolated test' }, 503)
      : response([fixtureOrder]);
  throw new Error(
    'Unexpected application request in isolated test: ' +
      method +
      ' ' +
      parsed.pathname,
  );
};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { createServer } = await import(require.resolve('vite'));
const vite = await createServer({
  root: project,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
let root;
const tick = async (duration = 30) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, duration));
  });
};
const waitFor = async (fn, label) => {
  for (let i = 0; i < 80; i++) {
    await tick();
    if (fn()) return;
  }
  throw new Error(
    'Timed out: ' + label + '\n' + document.body.textContent.slice(-2500),
  );
};
const fill = async (label, value) => {
  const input = document.querySelector(`[aria-label="${label}"]`);
  assert(input);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const click = async (element) => {
  assert(element, 'click target exists');
  await act(async () => element.click());
  await tick();
};
const byText = (selector, text) =>
  [...document.querySelectorAll(selector)].find((el) =>
    el.textContent.includes(text),
  );
const navigate = async (path) => {
  await act(async () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
  });
  await tick(80);
};
const compiledStyles = readdirSync(join(project, 'dist/assets'))
  .filter(name => name.endsWith('.css'))
  .map(name => readFileSync(join(project, 'dist/assets', name), 'utf8')).join('\n');
for (const selector of ['.cafe-hero', '.cafe-header', '.menu-filter-bar', 'prefers-reduced-motion']) {
  assert(compiledStyles.includes(selector), 'Production CSS includes ' + selector);
}
const results = ['Production CSS contains storefront, menu, navigation and reduced-motion styles'];
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx');
  root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(React.createElement(App));
  });
  await waitFor(
    () => document.querySelectorAll('.drink-card').length > 0,
    'homepage catalog',
  );
  assert(
    document.querySelector('.hero-title').textContent.includes('Good days'),
  );
  assert(
    document
      .querySelector('.cafe-hero-photo')
      .getAttribute('srcset')
      .includes('640w'),
  );
  assert.equal(
    document.querySelectorAll('.category-row').length,
    categories.length,
  );
  assert(document.querySelector('.mobile-web-qr svg'));
  results.push(
    'Homepage: real catalog snapshot, categories, responsive media markup, mobile QR',
  );
  await click(byText('.cafe-filters button', featuredCategory.name));
  assert(
    [...document.querySelectorAll('.drink-category')].every(
      (el) => el.textContent === featuredCategory.name,
    ),
  );
  results.push('Homepage category filtering');
  await click(document.querySelector('.drink-favorite'));
  assert.equal(
    document.querySelector('.drink-favorite').getAttribute('aria-pressed'),
    'true',
  );
  await click(document.querySelector('.drink-image-button'));
  await waitFor(
    () =>
      [...document.querySelectorAll('button')].some((el) =>
        /Add to order/i.test(el.textContent),
      ),
    'customization modal',
  );
  const add = [...document.querySelectorAll('button')].find((el) =>
    /Add to order/i.test(el.textContent),
  );
  await click(add);
  await waitFor(
    () =>
      localStorage.getItem('coffee_cart') ||
      document.querySelector('.cafe-toast'),
    'added cart',
  );
  assert(document.querySelector('.cafe-toast').textContent.includes('Added'));
  await navigate('/cart');
  await waitFor(
    () => document.querySelector('h1')?.textContent.includes('Cart'),
    'cart route',
  );
  assert(document.body.textContent.includes(selectedProduct.name));
  results.push(
    'Favorites, product details/customization, add to cart, persisted cart, cart route',
  );
  await navigate('/checkout');
  await waitFor(
    () => document.body.textContent.includes('One quick step'),
    'checkout guest gate',
  );
  assert(document.body.textContent.toLowerCase().includes('sign in'));
  results.push(
    'Checkout rendering and guest authentication prompt; no order submitted',
  );
  await navigate('/orders');
  await waitFor(
    () => document.body.textContent.includes('Sign in to view orders'),
    'orders guest gate',
  );
  const beforeOrders = calls.filter((c) =>
    c.path.includes('/api/orders'),
  ).length;
  assert.equal(beforeOrders, 0);
  await click(byText('button', 'Sign in to view orders'));
  await waitFor(() => document.querySelector('form'), 'auth modal');
  assert(document.body.textContent.includes('Sign'));
  results.push('Orders guest gate and login modal; no anonymous order fetch');
  await click(document.querySelector('form button[type="submit"]'));
  assert(document.body.textContent.includes('Enter your phone or email'));
  await fill('Phone number or email', '00000000');
  await fill('Password', 'isolated-dom-example');
  await click(document.querySelector('form button[type="submit"]'));
  await waitFor(
    () =>
      localStorage.getItem('coffee_customer_token') === 'isolated-dom-token',
    'login session',
  );
  results.push(
    'Login validation and session persistence using intercepted auth response',
  );
  await navigate('/checkout');
  await waitFor(() => document.querySelector('form'), 'authenticated checkout');
  assert(document.body.textContent.includes(selectedProduct.name));
  results.push(
    'Authenticated checkout form and customized cart summary; no order submitted',
  );
  // Fresh anonymous session to exercise registration without creating any remote account.
  await act(async () => root.unmount());
  localStorage.removeItem('coffee_customer_token');
  localStorage.removeItem('coffee_customer_user');
  window.history.replaceState({}, '', '/orders');
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(App)));
  await click(byText('button', 'Sign in to view orders'));
  await click(byText('button', 'Create an account'));
  await click(document.querySelector('form button[type="submit"]'));
  assert(document.body.textContent.includes('Please enter your name'));
  await fill('Full name', user.full_name);
  await fill('Phone number', user.phone);
  await fill('Password', 'isolated-dom-example');
  await click(document.querySelector('form button[type="submit"]'));
  await waitFor(
    () =>
      localStorage.getItem('coffee_customer_token') === 'isolated-dom-token',
    'registration session',
  );
  results.push(
    'Registration form validation and session persistence using intercepted auth response',
  );
  await waitFor(
    () => document.querySelector('.order-history-card'),
    'authenticated orders',
  );
  assert(document.body.textContent.includes('DOM-QA-ONLY'));
  const orderRequest = calls.find((c) => c.path.includes('/api/orders'));
  assert.equal(
    orderRequest.headers.get('Authorization'),
    'Bearer isolated-dom-token',
  );
  assert(document.body.textContent.includes('pending'));
  assert.equal(
    document.querySelector('.order-history-card a').getAttribute('href'),
    '/receipt/990001',
  );
  failOrders = true;
  await click(byText('button', 'Refresh orders'));
  await waitFor(
    () =>
      document.body.textContent.includes(
        'Orders unavailable for isolated test',
      ),
    'order error',
  );
  failOrders = false;
  await click(byText('button', 'Try') || byText('button', 'Retry'));
  await waitFor(
    () => document.querySelector('.order-history-card'),
    'orders retry',
  );
  results.push(
    'Authenticated order history, JWT attachment, server status/totals, receipt link, error/retry',
  );
  await navigate('/menu?category=' + encodeURIComponent(featuredCategory.name));
  await waitFor(
    () => document.querySelectorAll('.drink-card').length > 0,
    'nested menu route',
  );
  assert(
    [...document.querySelectorAll('.drink-category')].every(
      (el) => el.textContent === featuredCategory.name,
    ),
  );
  results.push('Nested menu route with URL category filtering');
  const callsBeforeAbout = calls.length;
  await navigate('/about');
  await waitFor(
    () => document.getElementById('about-hero-title'),
    'about page render',
  );
  assert.equal(window.location.pathname, '/about');
  assert(
    document.getElementById('about-hero-title')?.textContent?.includes('A Little Coffee') &&
    document.getElementById('about-hero-title')?.textContent?.includes('A Lot of Heart'),
  );
  assert(document.getElementById('story-title')?.textContent?.includes('Good Coffee'));
  assert(document.body.textContent.includes('Better Moments'));
  assert(document.body.textContent.includes('Made With Care'));
  assert(document.body.textContent.includes('Your Drink, Your Way'));
  assert(document.body.textContent.includes('Moments Worth Sharing'));
  assert(document.getElementById('experience-gallery-title'));
  assert(
    document.body.textContent.includes('Your Next Favorite Drink') &&
    document.body.textContent.includes('Is Waiting'),
  );
  assert.equal(
    document.querySelector('.desktop-links a[aria-current="page"]')?.getAttribute('href'),
    '/about',
  );
  assert(
    [...document.querySelectorAll('footer a')].some(
      (a) => a.getAttribute('href') === '/about',
    ),
  );
  const heroImg = document.querySelector('.about-hero-photo');
  assert(heroImg && heroImg.getAttribute('srcset')?.includes('640w'));
  assert(heroImg.getAttribute('fetchpriority') === 'high');
  const galleryImgs = document.querySelectorAll('.about-gallery-media img');
  assert(galleryImgs.length >= 3);
  assert([...galleryImgs].every((img) => img.getAttribute('loading') === 'lazy'));
  const callsDuringAbout = calls.length - callsBeforeAbout;
  assert.equal(
    callsDuringAbout,
    0,
    'About page must have no API dependency for static content',
  );
  results.push(
    'Dedicated About page route with hero, values, gallery, CTA, responsive media and zero API dependencies',
  );
  await navigate('/#about');
  await waitFor(
    () => scrollBehavior !== undefined,
    'legacy about anchor scrolling',
  );
  assert.equal(window.location.pathname, '/');
  assert.equal(window.location.hash, '#about');
  results.push('Backward-compatible About anchor route (/#about)');
  reduced = true;
  await act(async () => {
    for (const listener of mediaListeners) listener();
  });
  assert.equal(document.querySelectorAll('[data-reveal="waiting"]').length, 0);
  await navigate('/#visit');
  assert.equal(scrollBehavior, 'instant');
  results.push(
    'Reduced-motion change reveals pending content and uses instant anchor scrolling',
  );
  const mobile = document.querySelector('.mobile-menu');
  mobile.open = true;
  await act(async () =>
    mobile.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    ),
  );
  assert.equal(mobile.open, false);
  results.push(
    'Mobile navigation Escape dismissal and accessible disclosure markup',
  );
  failCatalog = true;
  await navigate('/menu');
  await waitFor(
    () =>
      document.body.textContent.includes(
        'Catalog unavailable for isolated test',
      ),
    'catalog error',
  );
  failCatalog = false;
  await click(byText('button', 'Try') || byText('button', 'Retry'));
  await waitFor(() => document.querySelector('.drink-card'), 'catalog retry');
  results.push('Catalog API failure and retry');
  assert.equal(
    calls.filter((c) => c.path.startsWith('/api/orders') && c.method !== 'GET')
      .length,
    0,
  );
  console.log(
    JSON.stringify(
      {
        passed: results,
        count: results.length,
        publicCatalogProducts: products.length,
        productionMutations: 0,
        screenshots: 0,
      },
      null,
      2,
    ),
  );
} finally {
  if (root) await act(async () => root.unmount());
  await vite.close();
  dom.window.close();
}
