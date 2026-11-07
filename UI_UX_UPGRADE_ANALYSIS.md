# Brew & Boba Café — UI/UX Upgrade Analysis

> Analysis only. No application files were modified for this report.
> Everything below was checked against the source unless marked **(unverified)**.

---

## 1. Verified project architecture

| Part | Path | Verified stack |
|------|------|----------------|
| Web app | `frontend/` | React 19, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), React Router 7, Lucide icons, jsPDF, canvas-confetti, oxlint |
| API | `backend/src/` | Node (ESM), Express, `pg`, JWT, bcryptjs. Routes: `/api/categories`, `/api/products`, `/api/orders`, `/api/auth`, `/api/admin/{auth,categories,products,orders,dashboard,staff}` |
| Mobile | `mobile_app/lib/` | Flutter, Provider, layers `core/` · `data/` · `providers/` · `ui/features/{auth,menu,cart,orders,profile}` |

**Correction to the brief:** admin management exists **only as backend API routes** (`backend/src/routes/admin/*`). There is **no admin dashboard UI** in this repository (`frontend/` has no admin routes; no `admin-app/`). The admin UI cannot be analysed or upgraded until one exists.

Web entry: `frontend/src/main.tsx` → `App.tsx` (`BrowserRouter` → `AuthProvider` → `CartProvider` → `Layout` + routes).
State: `features/auth/AuthContext.tsx` (JWT in localStorage, shared sign-in modal state), `features/cart/*` (reducer + localStorage persistence, covered by `cart.test.ts`).
Currency: `config/currency.ts` (USD base, KHR derived) — must not change.

**Build / test commands (verified in `package.json`):**
- Web: `npm run dev` · `npm run build` (`tsc -b && vite build`) · `npm run lint` (oxlint) · `npm test` (only `src/features/cart/cart.test.ts`, 6 tests)
- Backend: `npm run dev` · `npm test` (`backend/test/api.test.js`, needs PostgreSQL)
- Mobile: `flutter test`

Latest state: web build passes; lint = 2 warnings (both in `AuthContext.tsx`).

---

## 2. Existing pages and responsibilities

Routes from `frontend/src/App.tsx`:

| Route | File (lines) | Responsibility |
|-------|--------------|----------------|
| `/` | `pages/HomePage.tsx` (204) | Photo hero, category tiles, popular drinks, loyalty stamps |
| `/menu` | `pages/MenuPage.tsx` (227) | Sticky search + sort + category pills, product grid, favorites filter |
| `/cart` | `pages/CartPage.tsx` (99) | Cart list + `CartSummary` |
| `/checkout` | `pages/CheckoutPage.tsx` (780) | Guest sign-in gate, pickup/delivery, contact, notes, KHQR/cash payment, place order |
| `/receipt/:orderId` | `pages/ReceiptPage.tsx` (540) | Order confirmation, status, PDF download/print |
| `/orders` | `pages/OrdersPage.tsx` (422) | Lookup by phone (auto for signed-in user), status progress, reorder |
| `*` | `pages/NotFoundPage.tsx` (32) | 404 |

**There is no product detail page.** Drink details and customization live in a modal: `components/product/CustomizationModal.tsx` (~400 lines). Sign-in/profile are modals (`components/auth/AuthModal.tsx`, `ProfileModal.tsx`), not routes.

Current customer flow: browse → customize (modal) → add to cart (guests allowed) → cart → "Continue to checkout" (opens sign-up modal for guests, then redirects) → checkout → receipt.

Mobile mirrors this: `menu_screen`, `product_detail_sheet`, `cart_screen`, `checkout_sheet`, `order_history_screen`, `order_tracking_screen`, `profile_screen`, `auth_screen`.

---

## 3. Current design problems

### 3.1 Two visual languages across the site (highest impact)
- **Upgraded** (neutral black + amber pills, rounded-full, large photos): `Navbar.tsx`, `Footer.tsx`, `HomePage.tsx`, `MenuPage.tsx`, `ProductCard.tsx`, `AuthModal.tsx`, `FloatingCartBar.tsx`, `CustomizationModal.tsx` header.
- **Older** (amber-900 buttons, `rounded-3xl` cards, heavy borders/shadows, tiny uppercase labels): `CheckoutPage.tsx` (37 `amber-` class uses), `OrdersPage.tsx` (16), `ReceiptPage.tsx` (14), `LoyaltyCard.tsx` (13), `ProfileModal.tsx` (8), `Button.tsx`, `CartItem.tsx`, `CartSummary.tsx`.
- Result: a customer moves from a clean storefront into a visibly different, denser checkout.

### 3.2 No design tokens
`frontend/src/index.css` defines only two font variables. Colors are raw Tailwind palette values (`stone-950`, `amber-400`, `amber-900`, hard-coded `#fbf9f5` in `Layout.tsx`, `Navbar.tsx`, `MenuPage.tsx`). Changing the brand colour means editing dozens of files.

### 3.3 Palette does not match the stated direction or the mobile app
- Web primary surfaces are near-black `stone-950` and `amber-900`; the brief asks for espresso brown + caramel.
- `mobile_app/lib/core/theme/app_colors.dart` **already** defines the target: espresso `#4A2C1D`, caramel `#D48C46`, cream `#FBF8F5`, text `#231812`, plus matcha green and status colours. The web should adopt these so web and mobile share one brand.

### 3.4 Duplicated / dead code
- `frontend/src/utils/cartStorage.ts` is a re-export of `features/cart/cartStorage.ts`; `hooks/useCart.ts` re-exports `features/cart/useCart`. Two import paths for the same thing.
- Toast markup is copy-pasted in `HomePage.tsx` and `MenuPage.tsx` (no shared `Toast`).
- Empty-state markup is repeated in `CartPage.tsx`, `CheckoutPage.tsx`, `MenuPage.tsx`, `OrdersPage.tsx`.
- Pill/chip classes are repeated inline (`MenuPage.tsx` has `pillClass`, others re-write it).
- `src/assets/hero.png`, `react.svg`, `vite.svg` are Vite-template leftovers, not used by the new Home page (**verify before deleting**).

### 3.5 Crowded, text-heavy screens
- `CheckoutPage.tsx` (780 lines) mixes everything in one file: fulfillment, contact, notes quick-chips, payment, summary, QR. Long explanatory copy, many badges.
- `OrdersPage.tsx` / `ReceiptPage.tsx` (400–540 lines) are dense with multiple sections and labels.
- 67 occurrences of `text-[10px]` / `text-[11px]` across 11 files (`Navbar`, `CartItem`, `CartSummary`, `CheckoutPage`, `OrdersPage`, `ReceiptPage`, `ProfileModal`, `LoyaltyCard`, `AbaKhqrPayment`, `CustomizationModal`, `Footer`) — below comfortable reading size, hurts mobile and accessibility.

### 3.6 Weak or inconsistent hierarchy
- Mixed heading fonts: some pages use `font-serif` (Fraunces) titles, others plain sans (e.g. checkout/order section headings).
- Prices appear in three styles (card, cart, modal button). KHR is rendered at several sizes/weights.
- `CustomizationModal.tsx` still has 4 numbered steps with uppercase labels and `*` required markers even though every option has a default.

### 3.7 Imagery
- Images come from remote Unsplash URLs stored in the DB seed (`backend/src/db/seed.js`) and one hard-coded hero URL in `HomePage.tsx`. Several drinks reuse the same photo (e.g. `photo-1558857563…`, `photo-1513558161…`, `photo-1536256263…`, `photo-1553530666…` each appear twice), so different drinks look identical.
- No local fallback if the network is down (only a coffee icon when `image` is empty; a broken URL shows a broken image).
- No `width`/`height` on images → layout shift risk; `ProductCard` uses `aspect-[4/5]` (good) but `CartItem` and checkout thumbnails use other sizes.

### 3.8 Customer-interaction issues
- Guests can add to cart, but sign-in is only discovered at checkout; the cart page does explain it, but the checkout "gate" replaces the entire form (no preview of fulfillment/payment).
- `OrdersPage` search is by phone only; order-number lookup is mentioned in the README for the old PWA — **verify** whether the web page supports it.
- Header shows both "Sign in" and "Sign up" on desktop but only "Sign in" on mobile.
- No "added to cart" feedback on the cart icon (only a toast, which each page implements separately).
- Product favorites rely on `useFavorites` (local only); fine, but no hint it is device-local.

---

## 4. Recommended premium café design system

Target: a calm, confident café brand. Warm, quiet, photo-led. Not decorative.

### 4.1 Colour tokens (add to `@theme` in `frontend/src/index.css`)

Aligned with `mobile_app/lib/core/theme/app_colors.dart`:

| Token | Value | Use |
|-------|-------|-----|
| `--color-cream` | `#FBF8F5` | Page background |
| `--color-cream-deep` | `#F3ECE4` | Muted panels, input fills |
| `--color-line` | `#E8DDD2` | Borders / dividers |
| `--color-espresso` | `#4A2C1D` | Primary surfaces, primary button, headings |
| `--color-espresso-dark` | `#2E190E` | Footer, hero overlay |
| `--color-ink` | `#231812` | Body text |
| `--color-ink-soft` | `#736357` | Secondary text |
| `--color-caramel` | `#D48C46` | Key action accents (Add, Checkout, active dots) |
| `--color-caramel-soft` | `#F1B77B` | Hover/tints |
| `--color-matcha` | `#5A8D5F` | Success / "ready" |

Status colours (pending, preparing, ready, completed, cancelled) already exist in the mobile palette — reuse them for web order tracking.

Contrast: caramel `#D48C46` on cream is only ~2.7:1 — use it for **fills with espresso text** or large accents, not for small text. Espresso on cream is ≈ 11:1.

### 4.2 Typography
- Keep the existing pair: **Fraunces** (headings, prices on hero/cards) + **Plus Jakarta Sans** (UI). Both already loaded in `index.html`.
- Scale: `display 48–64`, `h1 32–40`, `h2 24–28`, `h3 18–20`, `body 15–16`, `small 13`, **minimum 12**. Remove all `text-[10px]/[11px]`.
- Prices: sans, bold, tabular numbers (`tabular-nums`), KHR in `ink-soft` at one smaller step.

### 4.3 Spacing, shape, elevation
- 4-pt scale; page section gap 64–96 px desktop, 40–56 px mobile.
- Radii: cards `24px`, controls `9999px` (pills) or `16px` for inputs — pick one pair and stick to it.
- Elevation: one resting shadow (very soft) and one hover shadow; drop heavy borders+shadows combined.
- Container `max-w-6xl` (already used) with `px-4 sm:px-6`.

### 4.4 Components (primary set)
- **Button**: `primary` (espresso fill, cream text), `accent` (caramel fill, espresso text — only for the single main action per view), `secondary` (cream-deep), `ghost`. Min height 44 px. One implementation: update `components/common/Button.tsx`, stop hand-rolling buttons in pages.
- **Chip/Pill** (new shared component) for categories/filters.
- **Product card**: image `4/5`, name, one-line descriptor, price (USD bold, KHR soft), round add button. Already close in `ProductCard.tsx`; only re-token it.
- **Input**: 48 px height, visible label or `aria-label`, inline error text.
- **Toast** (new shared), **EmptyState** (new shared), **StatusBadge** (mirror mobile's `status_badge.dart`).
- **Sheet/Modal**: bottom sheet on mobile, centered on ≥ sm (already the pattern in `CustomizationModal` and `AuthModal`).

### 4.5 Motion
- 150–250 ms ease-out for hover/press; image zoom ≤ 1.05 on cards; fade/slide for toasts and sheets.
- Remove `animate-bounce` style effects (the old floating bar had one; the new one doesn't). Respect `prefers-reduced-motion` — currently **not handled anywhere**.

### 4.6 Imagery rules
- One image ratio per context: card `4:5`, category tile `3:2`, hero `16:9`/full-bleed, cart thumb `1:1`.
- Each drink gets a **unique** photo; add a neutral cream placeholder + `onError` fallback.
- Set `width`/`height` or aspect-ratio boxes; keep `loading="lazy"` except the hero (`fetchPriority="high"` already set).
- Consider hosting final photos locally (e.g. `frontend/public/img/`) or in the DB so the site doesn't depend on Unsplash availability. **Decision needed from owner** (licensing/source).

### 4.7 Copy rules
- Titles ≤ 3 words, one short supporting line max, no marketing paragraphs.
- Replace "Handcrafted…", "Artisan…" style filler with concrete info (size, price, pickup time).

---

## 5. Recommended improvements per page

**Home (`HomePage.tsx`)** — largely good. Re-token colours; hero text over a darker espresso gradient; give each category tile a unique photo; consider one "Pickup info" strip (hours, address) instead of repeating them in the footer; keep loyalty block but shorten.

**Menu (`MenuPage.tsx`)** — add result count only when searching; keep sticky bar but make filter pills 44 px tall; add a clear "no results" action (exists); surface a small "+" feedback on the nav cart icon after adding; keep URL-driven filters (`?category=`, `?search=`) — they are linked from Home.

**Customization modal (`CustomizationModal.tsx`)** — shorten to: Size (cards, with price delta) → Sweetness → Ice → Toppings; drop numbered badges and `*`; sticky bottom bar with quantity + one caramel "Add · $X.XX" button; show KHR as secondary. Preserve `calculateCustomizedPrice` usage exactly.

**Cart (`CartPage.tsx`, `CartItem.tsx`, `CartSummary.tsx`)** — 1:1 thumbnails, options as a single muted line, quantity stepper with 44 px targets, summary card with only Subtotal / Total (USD + KHR) and one primary button; drop the KHQR callout from the cart (belongs to checkout).

**Checkout (`CheckoutPage.tsx`)** — split into step sections/components (Pickup or delivery → Contact → Payment → Summary) with a sticky summary on desktop and a collapsible one on mobile; show the form even for guests with an inline "Sign in to place order" at the submit point (or keep the current gate but include the order summary beside it); trim copy; move quick-note chips to a single row; keep duplicate-submit guard (`isSubmittingRef`) and validation.

**Auth modal (`AuthModal.tsx`)** — already simplified; align tokens; add error-to-field association (`aria-describedby`).

**Orders (`OrdersPage.tsx`)** — card per order: number, status badge, items summary, total, "Reorder"; collapsible details; use shared status colours; keep reorder logic.

**Receipt (`ReceiptPage.tsx`)** — clear success header, order number with copy, status, items, totals, PDF button; keep print styles (`@media print` in `index.css`) and `receiptPdfGenerator.ts`.

**404, Loading, ErrorState** — re-token; add a "Back to menu" action (check existing).

**Mobile (`mobile_app/`)** — theme already matches target. Review only for parity (card ratios, status badges, empty states). No structural change recommended in the first phases.

**Admin** — nothing to upgrade (no UI). If wanted, it is a new project scope, not part of this upgrade.

---

## 6. Components to reuse or simplify

| Action | Item |
|--------|------|
| Reuse as-is | `ProductCard`, `FloatingCartBar`, `Skeleton`, `useFavorites`, cart reducer/storage, `currency.ts`, `AbaKhqrPayment` logic |
| Re-token / restyle | `Button`, `CartItem`, `CartSummary`, `LoyaltyCard`, `ProfileModal`, `ErrorState`, `Loading`, `NotFoundPage` |
| Extract (new, small) | `Toast`, `EmptyState`, `Chip`, `PageHeader`, `StatusBadge`, `PriceText` (USD + KHR) |
| Split | `CheckoutPage` (780 lines) into section components; `ReceiptPage` and `OrdersPage` likewise |
| Remove duplication | `utils/cartStorage.ts` and `hooks/useCart.ts` re-exports (update imports, then delete — keep tests green) |
| Clean up | unused Vite template assets in `src/assets/` after confirming no imports |

---

## 7. Accessibility and responsive improvements

**Already good:** semantic `<header>/<nav>/<main>/<footer>`, `aria-label` on icon buttons (cart, close, favorite), `role="dialog" aria-modal` on modals, Escape-to-close on both modals, focus ring on `Button`, `lang="en"`, mobile viewport meta, mobile drawer nav.

**To fix:**
1. Text below 12 px (67 occurrences) — raise to ≥ 12–13 px.
2. No focus trap or focus return in `CustomizationModal`/`AuthModal`/`ProfileModal`.
3. `prefers-reduced-motion` unsupported.
4. `ProductCard` is `role="button"` on an `<article>` containing another `<button>` (favorite) — nested interactive controls. Prefer a card with a real primary button/link.
5. Form errors not linked to inputs (`aria-describedby`, `aria-invalid`); error banners should be announced (`role="alert"` — added only in `AuthModal`).
6. Colour contrast: caramel/amber on cream and `text-stone-400/500` secondary text need checking against 4.5:1.
7. Touch targets: several icon buttons are 32–36 px; target ≥ 44 px.
8. Category pills are a horizontal scroller with hidden scrollbar (`scrollbar-none` is used in markup; **verify that the utility is defined** — `index.css` has no `.scrollbar-none` rule, so it may be a no-op and scrollbars may show).
9. Add skip-to-content link; ensure page `<title>` changes per route (currently one static title in `index.html`).
10. Responsive checks needed at 360, 390, 768, 1024, 1280 px for: sticky menu bar (`top-16` assumes a 64 px header), floating cart bar vs. footer (footer has `pb-24` on mobile), checkout two-column grid, receipt/PDF layout.

---

## 8. Risks and functionality that must be preserved

- **Auth:** token/user keys `coffee_customer_token`, `coffee_customer_user`; `isAuthenticated`, `openAuthModal`, `openAuthModalWith({mode, redirectTo})` used by Navbar, Cart, Checkout. Modal remount `key` in `Navbar.tsx` is intentional.
- **Cart:** reducer actions, merge of identical customizations, localStorage persistence and corrupted-data recovery (tested by `cart.test.ts`).
- **Pricing:** `calculateCustomizedPrice`, size/topping adjustments, `formatUsd`/`formatKhr`, `USD_TO_KHR_RATE`. Backend recalculates prices server-side — UI must keep sending the same payload (`CreateOrderPayload` in `types/index.ts`).
- **Checkout:** pickup/delivery notes prefixes (`[DELIVERY to: …]`, `[STORE PICKUP: …]`), validation rules, duplicate-submit lock, KHQR/cash modes, navigation to `/receipt/:id` with `state.order`.
- **Orders/receipts:** phone lookup via `getOrdersByPhone`, reorder mapping, PDF generation (`utils/receiptPdfGenerator.ts`), print CSS.
- **URLs:** `/menu?category=…&search=…` (linked from Home), `/receipt/:orderId`.
- **API contracts / DB schema:** untouched. `types/openapi.generated.ts` and `generate:api` script point at `../backend/venv/bin/python …` (a stale Python path) — do not rely on it.
- **Tooling note:** `frontend` tests only cover the cart. A visual refactor has **no automated UI safety net**, so each phase needs manual checks (Section 10) or new component tests.
- **Images:** changing seed image URLs changes DB content only on re-seed; do not alter the schema.
- **Known gaps (unverified):** real-device behaviour, actual contrast ratios, screen-reader testing, Safari/Firefox rendering — none were run.

---

## 9. Prioritized implementation roadmap

**Phase 0 — Safety net (small)**
- Confirm `npm run build`, `npm test`, backend tests pass; note baseline lint warnings (2).
- Optionally add a couple of render tests for `ProductCard` and `Button`.

**Phase 1 — Design tokens + Button (highest leverage, low risk)**
- Add colour/radius/shadow tokens to `@theme` in `index.css`; add `.scrollbar-none` and a reduced-motion rule.
- Restyle `Button.tsx` to espresso/caramel variants; replace hard-coded `#fbf9f5`.
- Visual effect: whole site shifts to the café palette consistently.

**Phase 2 — Storefront polish (Home, Menu, ProductCard, Navbar, Footer)**
- Re-token, unique photos per drink/category, image fallback, 44 px controls, remove tiny text.

**Phase 3 — Customization modal and Cart**
- Simplify steps, sticky add bar, restyle `CartItem`/`CartSummary`/`CartPage`.

**Phase 4 — Checkout**
- Section split, calmer layout, shorter copy, guest preview + sign-in at submit. Highest functional risk → do after tokens are stable.

**Phase 5 — Orders, Receipt, Profile/Loyalty**
- Shared `StatusBadge`, simplified cards, restyle `LoyaltyCard`/`ProfileModal`.

**Phase 6 — Accessibility pass**
- Focus trap, aria wiring, contrast fixes, per-route titles, skip link, full responsive sweep.

**Phase 7 — Cleanup**
- Remove duplicate re-exports and unused assets; extract shared `Toast`/`EmptyState`/`Chip`.

**Phase 8 (optional) — Mobile parity and Admin**
- Compare Flutter screens to the web system; decide separately whether to build an admin UI.

---

## 10. Testing checklist (run after every phase)

**Always**
- [ ] `cd frontend && npm run build` — 0 TypeScript errors
- [ ] `npm test` — 6/6 cart tests pass
- [ ] `npm run lint` — no new warnings
- [ ] Backend running (`npm run dev`), `GET /api/health` OK; `cd backend && npm test` unchanged
- [ ] No console errors in browser on every route

**Phase 1 (tokens/Button)**
- [ ] Every page still readable; no unstyled/black-on-black text
- [ ] All button variants: hover, focus ring, disabled, loading
- [ ] Print preview of a receipt still white/black

**Phase 2 (storefront)**
- [ ] Home hero, category tiles, popular grid load with and without network (fallback images)
- [ ] Menu: search, sort, category pills, Saved filter, URL params, empty state
- [ ] Cards: consistent ratio, keyboard focus + Enter/Space opens customizer, heart toggles without opening it
- [ ] Mobile nav drawer, 360 px width, no horizontal scroll

**Phase 3 (customization/cart)**
- [ ] Price in modal = price in cart = server total for size × toppings × quantity (USD and KHR)
- [ ] Add same drink with same options merges; different options separate
- [ ] Cart persists after refresh; corrupted localStorage doesn't crash
- [ ] Quantity ±, remove, clear-all confirm

**Phase 4 (checkout)**
- [ ] Guest: sign-up/sign-in from cart and checkout returns to `/checkout`; cart kept
- [ ] Validation errors (name, phone ≥ 8 digits, delivery address)
- [ ] Pickup and delivery notes sent correctly; KHQR and cash both place an order
- [ ] Double-click on place order creates only one order
- [ ] Redirects to receipt; cart cleared; stamp count updates

**Phase 5 (orders/receipt)**
- [ ] Signed-in user sees own orders automatically; guest phone lookup works; no-results state
- [ ] Reorder adds correct items/options
- [ ] PDF download and print produce correct totals

**Phase 6 (accessibility)**
- [ ] Full keyboard walk-through of browse → order, focus trapped/returned in modals
- [ ] Screen-reader spot check (VoiceOver) on menu, modal, checkout form
- [ ] Contrast ≥ 4.5:1 for text, 3:1 for UI components
- [ ] `prefers-reduced-motion` disables animations
- [ ] Zoom to 200% without loss of function

**Responsive sweep (each UI phase)**
- [ ] 360 · 390 · 768 · 1024 · 1280 px; floating cart bar never covers footer links or the submit button

**Phase 7 (cleanup)**
- [ ] No broken imports after removing re-exports; build + tests green

---

## Recommended first page to upgrade

**Start with the shared foundation (Phase 1: design tokens + `Button`), then upgrade the Menu page (`/menu`).**

Why the Menu page first:
1. It is where customers spend most of their time and where the photo-led, product-card style matters most.
2. It already uses the newer layout, so moving it to the espresso/caramel tokens is low risk and establishes the final look quickly.
3. It exercises the shared pieces (`ProductCard`, `Chip`, `Button`, toast, customization modal) that Home, Cart and Checkout will reuse.
4. It has no payment or order-creation logic, so a mistake cannot affect orders.
5. Checkout is the biggest inconsistency, but also the riskiest — it should follow once the system is proven on Menu.

---

*Awaiting your approval before any application files are modified.*
