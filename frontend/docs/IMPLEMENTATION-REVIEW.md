# Brew & Boba implementation and verification

Completed local implementation on 2026-11-08. Reference evidence, confidence levels, uncertainties, architecture assessment, and stock-photo provenance are in [DESIGN-INVESTIGATION.md](DESIGN-INVESTIGATION.md).

## Delivered experience

- Responsive shared header with Home, Menu, About, Orders, search, login/profile, cart drawer, and mobile navigation. Mobile disclosure supports Escape; pickup selection, rewards and saved drinks remain reachable.
- Full-width café hero, original three-line headline and CTAs, teal brand ribbon, four featured API products with category filtering, editorial café story, real category index, lifestyle section, account/rewards entry, FAQ and footer.
- Product cards use actual API names, images, descriptions, availability and prices. Native, separate buttons support details/customization, favorites and adding. Add opens the existing customization flow before any cart mutation.
- `/orders` adds the web history view that was absent from the baseline. Signed-in identity supplies the phone for the existing JWT-protected lookup. Displayed order/payment statuses and USD/KHR totals come from returned server records; receipt links use the existing `/receipt/:orderId` route. Refresh is explicit. No order or payment state is fabricated by runtime code.
- `/about` provides a dedicated, premium About Us experience with a cinematic photographic hero, editorial two-column storytelling, three core belief value cards with Lucide icons, an asymmetric experience gallery, and a high-impact menu call-to-action. Backward compatibility for `/#about` anchor navigation is preserved.
- Existing mobile QR capability is retained as a link to this website, with honest mobile-web copy. It does not claim an app-store download, banking connection or push notification capability.

## Design system

Tokens live in `src/index.css`; reusable storefront styles live in `src/styles/storefront.css`.

| Token | Color | Use |
| --- | --- | --- |
| `--color-espresso` | `#2E1D17` | Type, primary controls, footer |
| `--color-teal` | `#2F9793` | Brand ribbon, hero stamp, experience panel |
| `--color-cream` | `#F8F2E9` | Page ground and reversed text |
| `--color-orange` | `#DB7429` | Story seal |
| `--color-gold` | `#E7BE75` | Hero accent and warm interaction fills |
| `--color-ink` | `#191714` | Body text |
| `--color-caramel` | `#A34E1D` | Accessible small accent text |

Existing Fraunces and Plus Jakarta Sans are retained with font swapping. Heading sizes use fluid clamps, desktop content is bounded at 1200px, and navigation/content layouts adapt at 1279, 1000, 640 and 380px. Solid espresso text contrast ratios: cream 14.47:1, teal 4.58:1, orange 5.02:1, gold 9.22:1. Caramel on cream is 5.15:1. These are calculated color-pair checks, not a full rendered accessibility audit. Photo-overlay text and focus visibility still require visual review.

## Motion and performance

- Original staggered hero entrance: 24px translation/opacity, 700–750ms, 100ms line staggering. This is an original addition, not a recovered reference effect.
- One-time section/card reveals: IntersectionObserver, 24px translation, 650ms, observer disconnect after entry. No continuous scroll listener or parallax loop.
- Buttons use short lift/arrow transitions; pointer-capable product image hover scales to 1.045. Touch users receive visible actions without relying on hover.
- Native FAQ disclosures rotate the plus icon. Answers use native expansion rather than scripted height interpolation.
- Reduced-motion CSS disables entrance motion, hover transforms and smooth scrolling. A dynamic preference change reveals waiting content. Without IntersectionObserver, content remains visible.
- Hero uses a local WebP srcset at 640/1200/1800px, high fetch priority and fixed image dimensions. Offscreen photography and product images are lazy loaded. The maximum hero file is approximately 203 kB. Stock café photos are illustrative, not a claim to depict actual Brew & Boba premises.
- Secondary routes are lazy loaded inside the shared layout's Suspense boundary. Main emitted entry changed from approximately 866 kB to 298 kB (89.5 kB gzip); an additional shared coffee/QR chunk is approximately 52 kB. Receipt/PDF dependencies are deferred. This is build-size evidence, not an LCP or frame-rate measurement.

## Preserved contracts

The API client, `VITE_API_URL`, JWT/session implementation, catalog hooks, customization calculator/modal, cart reducer/storage, currency conversion, checkout submission/idempotency, server-authoritative totals, receipt refresh and payment-status rules are unchanged. KHQR remains a demo. No backend, management portal, mobile app, database, production configuration or security changes were made. No staging accounts or orders were created.

Old unsupported home testimonials, customer counts, live status, sourcing claims and real-KHQR claims were removed from the redesigned surface. Existing static store selection data remains untouched; the footer contact link comes from `src/config/stores.ts` and should be confirmed with the business before publication. This work does not validate pre-existing marketing claims on other pages.

## Changed files

Modified:

- `index.html`: title/description without unsupported payment and sourcing claims.
- `package.json`, `package-lock.json`: jsdom development dependency and `test:storefront` command; no new production dependency.
- `src/App.tsx`: lazy secondary routes, Orders and About routes.
- `src/index.css`: compatible brand tokens and storefront stylesheet import.
- `src/components/layout/Layout.tsx`: full-width home, skip link, shared route loading state.
- `src/components/layout/Navbar.tsx`: responsive navigation, existing modal integrations, reduced-motion-aware anchor scrolling.
- `src/components/layout/Footer.tsx`: customer links, project-configured contact and back-to-top.
- `src/components/product/ProductCard.tsx`: shared card presentation and accessible independent actions.
- `src/components/home/MobileAppSection.tsx`: retained QR with accurate website messaging.
- `src/pages/HomePage.tsx`: complete homepage composition with real data and retry/empty states.
- `src/pages/MenuPage.tsx`: updated title, header offset and live cart notification; filtering/customization behavior retained.

Created:

- `src/components/common/Reveal.tsx`
- `src/pages/OrdersPage.tsx`
- `src/pages/AboutPage.tsx`
- `src/styles/storefront.css`
- `scripts/verify-storefront.mjs`
- `public/images/cafe-640.webp`, `cafe-1200.webp`, `cafe-1800.webp`, `coffee-900.webp`, `slow-moments-1200.webp`, `boba-900.webp`
- `docs/DESIGN-INVESTIGATION.md`, this review.

`graphify update .` regenerated the repository's local code graph using AST extraction. The graph tool reported its existing SQL-parser and mobile-header extraction limitations; no semantic API calls were made. Pre-existing untracked `.agents/` and `skills-lock.json` were left alone.

## Verification results

| Check | Result / scope |
| --- | --- |
| `npm test` | 7 passed: customization, dual currency, cart changes/persistence/corruption recovery, payment status. Corrupted-storage warnings are expected fixtures. |
| `npm run test:storefront` | Passed build plus 15 grouped production-asset/DOM integration checks. Uses real read-only staging catalog snapshots, then intercepts all application requests locally. Login/registration/order responses are isolated test fixtures, not real transactions or accounts. |
| TypeScript / `npm run build` | Passed. Build invokes `tsc -b` and Vite; all emitted chunks are under 500 kB. |
| `npm run lint` | Exit 0; three existing warnings in unchanged AuthContext and unused legacy GooeyNav. No warnings in changed application files. |
| `git diff --check` | Passed. |
| Public API reads | Healthy staging endpoint, 4 categories and 6 available products at inspection time. No writes. |
| Local production preview | HTTP 200 with SPA entry for `/`, `/menu?category=Coffee`, `/orders`, `/about`, `/cart`, `/checkout`, `/profile`, `/rewards`, `/receipt/990001`; local image/bundle requests checked. |
| Code graph | Updated with `graphify update .`, AST-only. |

The DOM suite verifies: compiled storefront CSS presence; homepage/category rendering; homepage category filter; favorites; customization/add/persistence/cart; guest checkout gate; Orders login gate without anonymous order requests; login validation/session; authenticated checkout rendering; registration validation/session; history/JWT/server-state rendering/error/retry/receipt link; nested category URL; About redirect; dynamic reduced-motion behavior; mobile menu Escape dismissal; catalog error/retry. It creates no orders and captures no screenshots. It needs network access to the supplied staging catalog and at least one available drink. Run from `frontend/`:

```sh
npm test
npm run test:storefront
npm run lint
```

## Remaining manual review

REA and the browser host were unavailable. No local application screenshots were captured. DOM simulation and HTTP checks do not prove desktop/tablet/mobile visual layout, touch gestures, focus rendering, actual image crops, native disclosure animation, real-browser performance, or deployed Vercel fallback behavior.

Recommended next steps:

1. Manually review at desktop, tablet and phone widths (for example 1440, 768, 390 and 320px). Upload screenshots of the homepage, mobile navigation, product customization and cart for visual refinement.
2. Check keyboard-only navigation and reduced-motion mode in a real browser. Confirm no clipping/overflow and legible hero contrast.
3. Confirm the configured business contact and replace illustrative stock photos with approved café photography when available.
4. In an explicitly disposable/authorized environment, exercise real login, registration, order submission and receipt refresh. These writes were intentionally not made against staging during this task.
5. After separate deployment approval, verify Vercel nested-route refreshes and measure LCP/CLS/performance. No commit, push or deployment was performed.
