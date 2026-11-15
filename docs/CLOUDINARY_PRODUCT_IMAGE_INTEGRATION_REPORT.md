# Cloudinary product image integration report

This is the pre-Phase 2 snapshot. For the approved local database changes and current verification, see [Cloudinary Phase 2 execution report](CLOUDINARY_PHASE2_EXECUTION_REPORT.md).

Date: 2026-11-15. Database changes: **none**.

## Target and method

The inspected development configuration points to the local PostgreSQL database `coffee_shop` on `localhost`. The catalog below came from a read-only transaction using the backend's PostgreSQL pool configuration. No staging database was selected or queried, and the staging target still needs explicit identification and approval before any update there. Product IDs and current images were read from the actual local database, not inferred from seed order. All current images are the existing Unsplash seed URLs; none were changed.

The existing `products.image` field is the single image source. Public and admin product APIs return it unchanged. The management portal retains admin authorization on create and update. The Flutter repository uses API products when available and its separate offline catalog when the API is unavailable; offline fallback images are not evidence of a backend update.

## Cloudinary inventory

Cloud: `dr5o7ft6`. The Cloudinary asset listing returned all 20 specified public IDs and exact secure URLs, including the decomposed accented `vanilla_frappé` ID and URL-encoded `frappe%CC%81` delivery path. Every original URL returned HTTP 200 with `image/png` to a HEAD request on 2026-11-15. All assets were listed as 1254 × 1254 PNG files. PNG header range requests confirmed an RGBA color type for all 20 originals.

| # | Image | Exact public ID | Asset folder | Exact secure URL | Delivery check |
|---:|---|---|---|---|---|
| 1 | Iced Milk Tea | `01_iced_milk_tea` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704214/01_iced_milk_tea.png) | 200, image/png |
| 2 | Cappuccino | `02_cappuccino` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png) | 200, image/png |
| 3 | Café Latte | `03_cafe_latte` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704050/03_cafe_latte.png) | 200, image/png |
| 4 | Orange Bubble Tea | `04_orange_bubble_tea` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/04_orange_bubble_tea.png) | 200, image/png |
| 5 | Strawberry Smoothie | `05_strawberry_smoothie` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704080/05_strawberry_smoothie.png) | 200, image/png |
| 6 | Iced Coffee | `06_iced_coffee` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/06_iced_coffee.png) | 200, image/png |
| 7 | Lemon Iced Tea | `07_lemon_iced_tea` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/07_lemon_iced_tea.png) | 200, image/png |
| 8 | Iced Matcha Latte | `08_iced_matcha_latte` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png) | 200, image/png |
| 9 | Chocolate Frappé | `09_chocolate_frappe` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704053/09_chocolate_frappe.png) | 200, image/png |
| 10 | Brown Sugar Boba | `10_brown_sugar_boba` | `Drink_Images/brew_boba_drinks_transparent` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/10_brown_sugar_boba.png) | 200, image/png |
| 11 | Iced Green Tea | `iced_green_tea_brew_boba_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704370/iced_green_tea_brew_boba_transparent.png) | 200, image/png |
| 12 | Caramel Macchiato | `caramel_macchiato_with_caramel_lattice_foam_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png) | 200, image/png |
| 13 | Peach Fruit Tea | `brew_boba_peach_fruit_tea_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704414/brew_boba_peach_fruit_tea_transparent.png) | 200, image/png |
| 14 | Mango Smoothie | `brew_boba_mango_smoothie_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704415/brew_boba_mango_smoothie_transparent.png) | 200, image/png |
| 15 | Flat White | `brew_boba_flat_white_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704413/brew_boba_flat_white_transparent.png) | 200, image/png |
| 16 | Cookies and Cream Shake | `cookies_and_cream_brew_boba_shake_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704417/cookies_and_cream_brew_boba_shake_transparent.png) | 200, image/png |
| 17 | Espresso | `brew_boba_espresso_elegance_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704412/brew_boba_espresso_elegance_transparent.png) | 200, image/png |
| 18 | Vanilla Frappé | `vanilla_frappé_with_whipped_cream_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704418/vanilla_frappe%CC%81_with_whipped_cream_transparent.png) | 200, image/png |
| 19 | Hot Chocolate | `brew_boba_hot_chocolate_delight_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704346/brew_boba_hot_chocolate_delight_transparent.png) | 200, image/png |
| 20 | Taro Boba | `taro_boba_bliss_at_brew_boba_transparent` | `Drink_Images/drinks` | [HTTPS original](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704416/taro_boba_bliss_at_brew_boba_transparent.png) | 200, image/png |

## Actual database catalog and proposed mapping

The current image links below are the exact stored values. A proposed link is for review only; it has **not** been written to PostgreSQL. Availability was read only and will remain unchanged.

| Product ID | Product name | Category | Available | Current image | New Cloudinary image | Match confidence / disposition |
|---:|---|---|:---:|---|---|---|
| 1 | Iced Americano | Coffee | Yes | [Current image](https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Iced Coffee is not specifically an Americano. |
| 2 | Iced Latte | Coffee | Yes | [Current image](https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Café Latte image does not establish an iced drink. |
| 3 | Cappuccino | Coffee | Yes | [Current image](https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80) | [02_cappuccino](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png) | High; proposed, not applied |
| 4 | Caramel Macchiato | Coffee | Yes | [Current image](https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80) | [caramel_macchiato_with_caramel_lattice_foam_transparent](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png) | High; proposed, not applied |
| 5 | Spanish Latte | Coffee | Yes | [Current image](https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80) | — | No suitable identity match; unchanged |
| 6 | Classic Milk Tea | Milk Tea | Yes | [Current image](https://images.unsplash.com/photo-1558857563-b37cf5a1334c?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Iced Milk Tea may not represent the classic recipe. |
| 7 | Brown Sugar Boba Milk Tea | Milk Tea | Yes | [Current image](https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Brown Sugar Boba image does not establish milk tea ingredients. |
| 8 | Taro Milk Tea | Milk Tea | Yes | [Current image](https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Taro Boba asset does not establish the milk tea recipe. |
| 9 | Thai Milk Tea | Milk Tea | Yes | [Current image](https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Orange Bubble Tea does not establish Thai tea. |
| 10 | Passion Fruit Jasmine Tea | Fruit Tea | Yes | [Current image](https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80) | — | No suitable identity match; unchanged |
| 11 | Peach Oolong Tea | Fruit Tea | Yes | [Current image](https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Peach Fruit Tea does not establish an oolong base. |
| 12 | Lychee Rose Green Tea | Fruit Tea | Yes | [Current image](https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80) | — | No suitable identity match; unchanged |
| 13 | Mango Coconut Smoothie | Smoothies | Yes | [Current image](https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Mango Smoothie does not establish coconut. |
| 14 | Strawberry Banana Smoothie | Smoothies | Yes | [Current image](https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80) | — | Ambiguous; unchanged — Strawberry Smoothie does not establish banana. |
| 15 | Avocado Coffee Frappe | Smoothies | Yes | [Current image](https://images.unsplash.com/photo-1577805947697-89e18249d767?w=600&auto=format&fit=crop&q=80) | — | No suitable identity match; unchanged |
| 16 | Iced Matcha Latte | Matcha | Yes | [Current image](https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80) | [08_iced_matcha_latte](https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png) | High; proposed, not applied |
| 17 | Dirty Matcha | Matcha | Yes | [Current image](https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80) | — | No suitable identity match; unchanged |
| 18 | Strawberry Matcha Latte | Matcha | Yes | [Current image](https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=80) | — | No suitable identity match; unchanged |

### Matched for approval

- Product 3, Cappuccino → `02_cappuccino`.
- Product 4, Caramel Macchiato → `caramel_macchiato_with_caramel_lattice_foam_transparent`.
- Product 16, Iced Matcha Latte → `08_iced_matcha_latte`.

These are exact drink-identity matches. If approved for the **local development database**, each can be changed with an image-only, parameterized `UPDATE products SET image = $1 WHERE id = $2 AND image = $3` using its current stored URL as the comparison value. Re-read the rows before execution and stop on any changed current image. No update script was run or staged for automatic execution.

### Ambiguous and unmatched

The nine ambiguous rows in the table have possible visual or ingredient overlap but lack a trustworthy exact identity match. They stay unchanged. Products 5, 10, 12, 15, 17, and 18 have no suitable image by name or ingredients. The 17 assets without an exact approved mapping remain available in the manifest: `01_iced_milk_tea`, `03_cafe_latte`, `04_orange_bubble_tea`, `05_strawberry_smoothie`, `06_iced_coffee`, `07_lemon_iced_tea`, `09_chocolate_frappe`, `10_brown_sugar_boba`, `iced_green_tea_brew_boba_transparent`, `brew_boba_peach_fruit_tea_transparent`, `brew_boba_mango_smoothie_transparent`, `brew_boba_flat_white_transparent`, `cookies_and_cream_brew_boba_shake_transparent`, `brew_boba_espresso_elegance_transparent`, `vanilla_frappé_with_whipped_cream_transparent`, `brew_boba_hot_chocolate_delight_transparent`, `taro_boba_bliss_at_brew_boba_transparent`.

## Local implementation

- Backend: added optional HTTPS image URL validation; retained the existing image field, API response shape, parameterized SQL, and admin authorization. Added an API test for image-only update, public readback, unchanged price, and rejection of a non-HTTPS scheme.
- Management portal: Cloudinary thumbnails use a bounded derivative and contain styling; broken thumbnails use the existing fallback. The image preview reports a loading error. Product editing now sends only changed fields, so an image edit does not resend price, category, or availability.
- Customer website: catalog cards use bounded Cloudinary thumbnails with contain styling, a loading placeholder, and the existing error fallback; the customization image uses a smaller derivative. Product alt text remains the product name. Other image hosts retain their original URLs.
- Flutter: existing cached network images now request bounded Cloudinary derivatives for cards and cart, and use contain sizing for transparent cups. The detail hero centers the complete cup on its existing navy background with a loading indicator and missing-image fallback. Home and Menu use the shared product card. Existing order screens show item names and status rather than product photos; no order image field or API contract was added.
- Cloudinary transforms: `c_limit,w_160|320|400|800,q_auto,f_auto` are inserted only for this cloud's versioned original image URLs. The originals are untouched. A sample 320 px and 800 px transformed URL returned HTTP 200 and `image/png`; the 320 px PNG retained a transparency chunk (`tRNS`). Arbitrary existing product image URLs are passed through. The Cloudinary API secret is not used.

## Files changed for this integration

`backend/src/utils/adminCatalogValidation.js`, `backend/src/routes/admin/products.js`, `backend/test/api.test.js`, `management-portal/src/pages/ProductsPage.tsx`, `management-portal/src/styles.css`, `management-portal/src/lib/productImage.ts`, `frontend/src/components/product/ProductCard.tsx`, `frontend/src/components/product/CustomizationModal.tsx`, `frontend/src/styles/storefront.css`, `frontend/src/utils/productImage.ts`, `mobile_app/lib/core/utils/product_image_url.dart`, `mobile_app/lib/ui/features/menu/widgets/product_card.dart`, `mobile_app/lib/ui/features/menu/widgets/drink_hero_artwork.dart`, `mobile_app/lib/ui/features/cart/widgets/cart_item_tile.dart`, `docs/cloudinary-product-image-manifest.ts`, and this report. Pre-existing uncommitted work was preserved.

## Verification

| Check | Result |
|---|---|
| Cloudinary original URLs | 20/20 HTTP 200, image/png, RGBA PNG headers |
| Cloudinary sample derivatives | 320 px and 800 px HTTP 200, image/png |
| Development database catalog | 18 rows read in a read-only transaction |
| Post-change database check | 18 products; 0 Cloudinary image URLs stored |
| Backend tests | 124 passed; isolated in-memory test database |
| Management portal tests | Default command: 82 passed, 1 failed in pre-existing untracked light mode test (`globalThis.localStorage.setItem is not a function` under Node 24). With `NODE_OPTIONS=--no-experimental-webstorage`: 83 passed. |
| Management portal build | Passed |
| Customer frontend tests | Passed |
| Customer frontend build | Passed |
| Customer frontend lint | Passed with three existing warnings outside image integration files |
| Flutter analyze | No issues |
| Flutter tests | Passed |

No screenshots were captured. Browser and device rendering still require the requested manual review after database images are approved and applied; current API responses still contain the previous Unsplash URLs, so live Cloudinary rendering cannot yet be claimed.

## Remaining actions and approvals

1. Review the three exact mappings above and identify the database environment to update. **Explicit approval is required before any database mutation.**
2. Provide identity confirmation or additional assets for ambiguous and unmatched products if broader coverage is wanted. Do not substitute a visually similar drink for a different recipe.
3. After an approved update, re-read the API catalog and manually review the management page, customer site, Flutter screens, and responsive layouts. Deployment also requires separate approval.
