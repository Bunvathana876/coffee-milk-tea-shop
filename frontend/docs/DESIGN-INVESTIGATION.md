# Brew & Boba storefront investigation

Inspected 2026-11-08. This is a local frontend transformation. No commit, deployment, database change, or backend change is authorized by this work.

## Method and limits

REA MCP tools are not exposed in this session. The supplied [REA repository](https://github.com/morluto/rea) was consulted, but REA was **not run**. Browser inspection was attempted through the installed computer-use browser; its host returned “unavailable.” Findings below come from HTTP retrieval of public HTML, CSS, and the published Webflow JavaScript, not live browser observations. No private Webflow project or original source was recovered. No reference branding, photographs, copy, or testimonials are reused.

Evidence sources:

- [Public homepage](https://danngood.webflow.io/), retrieved successfully with curl; 56,655 bytes.
- [Published stylesheet](https://cdn.prod.website-files.com/6610c4fb8d400b1408858d2e/css/danngood.webflow.1dd9834bf.min.css), 83,066 bytes.
- [Published JavaScript](https://cdn.prod.website-files.com/6610c4fb8d400b1408858d2e/js/webflow.35f39d942.js), approximately 217 KiB. Interaction evidence is the JSON passed to `Webflow.require('ix2').init(...)` near the end of this file.

## Findings and evidence

“Verified” below means present in retrieved public files. Runtime behavior has not been observed.

| Finding / observed declaration | Evidence / selector | Likely implementation | Confidence / unknowns |
| --- | --- | --- | --- |
| Warm cream, dark ink, orange and teal system | CSS `:root`: foam `#f4ece8`, black `#140e13`, orange `#c06522`, light teal `#369392`, dark teal `#006764` | Shared CSS custom properties | High, declarations verified; rendered color/contrast not measured |
| Oversized compact headings and uppercase buttons | `body` uses `roc-grotesk`; `h1` and `.heading-style-h1` use 5.5rem, 700, line-height 1; `.button` uppercase 1.125rem with .05rem tracking | Adobe Typekit script plus CSS hierarchy | High; actual downloaded font and fallback timing unknown |
| Long editorial homepage | HTML: `.section_header30`, `.section_home_feature`, benefits, services, team, testimonial, gallery, FAQ, footer | Static sections, alternating two-column compositions | High; precise viewport fold positions unobserved |
| Centered hero over a photograph | `.header30_content`: 50rem max width, 80svh min height; `.header30_background-image`: absolute, object-fit cover | Background image and overlay behind centered copy/CTAs | High; actual crop and overlay appearance unobserved |
| Header changes early in page scroll | `PAGE_SCROLL` events `e-17`/`e-20`, action lists `a-10`/`a-17`: keyframes 0 and 2 change `.navigation` transparency to foam; desktop links change color, logo width 6rem→4rem and logo opacity swaps | Webflow continuous scroll interpolation, smoothing 50 | High for configuration; runtime timing and page-relative threshold unverified |
| Mobile/tablet navigation changes layout | CSS max-width 991px changes `.navbar3_menu` to a positioned cream panel. Actions `a`/`a-2` fade `.navbar3_menu-background` over 400ms; `a-11`/`a-12` transform menu icon lines | Webflow navbar state dispatches open/close actions | High for declarations; keyboard focus, touch behavior, and actual panel opening unverified. Some dropdown actions may be unused template code |
| Selected images slide into view | Event `e-21`: `SCROLL_INTO_VIEW`, target `.is-scroll`, action `slideInBottom`; opacity 0→1 and translateY 100px→0, 1000ms `outQuart`. HTML applies class to feature, benefits, gallery images | Webflow visibility-triggered preset | High; repetition, exact perceived easing, and frame rate unobserved |
| FAQ answers expand and icon rotates | HTML `.home_faq_question`/`.home_faq_answer`; actions `a-7`/`a-8` change height 0↔AUTO, rotate `.home_faq_icon-wrapper` 0↔180° over 400ms | Click/second-click paired events | High; runtime accessibility/focus behavior unverified |
| Buttons and navigation have restrained hover feedback | `.button:hover` changes orange to light teal; 200ms color/border/background transitions. `.navbar3_link:hover` adds orange border; logo hover opacity .7 | CSS hover selectors | High; touch/stylus experience unknown |
| Spacious, rounded editorial sections | `.padding-section-large` 7rem vertical; feature/benefits grids use 4rem gaps; benefits/gallery image radii 2rem; gallery aspect-ratio 1 and object-fit cover | CSS grid and shared spacing/radius tokens | High; no evidence of morphing section transitions |
| Responsive type and layout | CSS breakpoints at 991, 767, 479px. Heading tiers 5.5→4→3rem; vertical spacing 7→6→4rem; benefits/services collapse to one column; feature image has negative top margin | Standard media queries | High for CSS; desktop/tablet/mobile rendering and overflow not observed |
| Hero is eager, later imagery lazy and responsive | Hero `loading="eager"`, WebP `srcset` 500–2560w; other main photos use lazy loading and srcsets. CDN preconnect, external Typekit, jQuery, Webflow JS in HTML | Native browser image selection and deferred offscreen media | High for markup; LCP, CLS, cache behavior, waterfall and Core Web Vitals unmeasured |
| No verified staggered hero headline or parallax | No such animation in the inspected ix2 event/action payload; `.is-scroll` is a slide-in preset | Additional hero motion would be an original design choice | Medium; other runtime effects cannot be ruled out without browser observation |
| Reduced motion support is uncertain | Published Webflow runtime contains `prefers-reduced-motion`; presence alone does not prove the site's effective behavior | Runtime may gate eligible motion | Low for actual outcome; user preference handling was not observed |

## Existing frontend compatibility

- `src/main.tsx` mounts React StrictMode; `src/App.tsx` uses BrowserRouter, AuthProvider and CartProvider, with shared Layout. Existing routes: `/`, `/menu`, `/rewards`, `/profile`, `/cart`, `/checkout`, `/receipt/:orderId`, wildcard. There is no existing web `/orders` page or order-history UI.
- Home uses `useProducts`, `useCategories`, shared `ProductCard` and `CustomizationModal`. Menu already supports URL-based categories/search, sort, favorites and the same customization flow. These hooks and business rules can remain untouched while presentation changes.
- Cart context/reducer/storage, `features/products/customization.ts` and `config/currency.ts` own customization estimates, persistence, totals and USD/KHR formatting. Keep their behavior unchanged. Backend remains authoritative for final order prices.
- `features/auth/AuthContext.tsx` preserves JWT/session state and login/register API calls. Navbar must continue mounting AuthModal, SearchModal, MiniCartDrawer and CustomizationModal.
- `services/api.ts` reads and normalizes `VITE_API_URL`; `/api/orders` calls attach the stored customer JWT. Keep this client and configuration unchanged.
- Checkout validates login, uses an idempotency key, submits to the server, clears cart only on confirmed creation and routes to receipt. Receipt reads server payment state and offers order refresh. KHQR is explicitly a demo. These modules remain unchanged.
- Automated tests currently cover cart/customization/storage/currency and payment status, using `jiti`. The build runs TypeScript then Vite. No browser integration suite is installed.
- Prior home/footer copy included unsupported reviews/statistics, sourcing claims, hardcoded “online” status and payment claims. New home copy avoids them. Existing store config is static rather than a verified live business directory; do not repeat its address/hours as verified facts. The configured pickup phone can be linked as a project-provided contact, with provenance recorded here.

Read-only staging inspection: `/api/health` returned healthy/staging; `/api/categories?active_only=true` returned four categories; `/api/products?is_available=true` returned six products. Only GET requests were used. No login, account creation, order submission, or private order reads were made against staging.

## Original implementation plan

1. Define espresso `#2E1D17`, teal `#2F9793`, cream `#F8F2E9`, orange `#DB7429`, gold `#E7BE75`, ink `#191714`. Use ink on teal/orange/gold and cream on espresso; reserve darker accent tones for small text.
2. Retain existing Google-hosted Fraunces and Plus Jakarta Sans with swap. Use expressive large Fraunces headings, compact uppercase labels, generous section spacing, arched imagery, circular motifs and substantial outlined buttons.
3. Transform shared navigation and home layout; retain auth/search/cart controls and all routes. Add `/about` as an anchor redirect to `/#story` and an authenticated `/orders` view using the existing JWT-protected lookup and receipt routes. No new backend identity or order contract.
4. Use real API products/categories with honest loading, empty, error and retry states; keep customization as the add-to-cart entry point, preserving choices and calculated prices.
5. Add original story, category index, lifestyle photography, FAQ, rewards entry and mobile web entry. Avoid invented provenance, customer statistics, business hours and payment confirmation.
6. Use CSS entrance/hover transitions and a small IntersectionObserver reveal wrapper; support dynamic reduced-motion preferences and no-observer fallback. No continuous parallax, 3D library, or new animation dependency.
7. Run existing tests, TypeScript/build and whitespace checks. Browser host is unavailable: live responsive/accessibility/end-to-end checks require manual testing and user-supplied screenshots; never capture local screenshots automatically.

## Asset provenance

New local WebP assets are independent Unsplash stock photographs, **not photographs of Brew & Boba's actual premises**. They illustrate café mood and brewing. [Unsplash license](https://unsplash.com/license) permits free commercial use; verified on inspection date. Product and category images continue to come from the existing API.

| Local asset | Public source |
| --- | --- |
| `public/images/cafe-{640,1200,1800}.webp` | `https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb` (also used by prior home) |
| `public/images/coffee-900.webp` | `https://images.unsplash.com/photo-1442512595331-e89e73853f31` |
| `public/images/slow-moments-1200.webp` | `https://images.unsplash.com/photo-1445116572660-236099ec97a0` |
| `public/images/boba-900.webp` | `https://images.unsplash.com/photo-1579954115545-a95591f28bfc` (also used by staging catalog for Brown Sugar Boba) |

Files were downloaded as compressed WebP at bounded widths. Attribution is recorded by source ID; photographer identity has not been independently verified. No reference-site assets are bundled.
