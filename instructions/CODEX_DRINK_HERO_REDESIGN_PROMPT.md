# BREW & BOBA CAFÉ — PREMIUM DRINK DETAILS HERO REDESIGN (CODEX)

## Role
You are a senior Flutter mobile engineer and UI/UX designer. Implement the actual code; do not produce only a plan.

## Repository
`/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`
Target Flutter app: `mobile_app/`
Approved visual reference: `mobile_app/design_references/approved_drink_hero.png`
Optional background asset: `mobile_app/assets/drink_details/navy_cafe_pattern.png`

## Exact task
Redesign the existing **Drink Details / product customization UI** to feel like the approved reference. The current local screenshot has a large, tilted, square cream photo frame with a rectangular coffee photo inside. **Remove that Polaroid/photo-card treatment**: the reference shows an oversized angled takeaway cup floating naturally in a richly dark-blue hero section above a rounded cream customization sheet.

Do not change the product, product identity, pricing or actual customization logic. This is a presentation-only change.

### Step 0 — Inspect and protect the repository
1. Read `AGENTS.md` and applicable project instructions.
2. Run `git status --short --branch`, and preserve all ongoing/uncommitted work.
3. Locate the latest local Flutter Drink Details implementation (likely `mobile_app/lib/ui/features/menu/widgets/product_detail_sheet.dart` and related screens/widgets); **discover rather than assuming** the architecture.
4. Inspect actual `ProductModel`, image URL handling, `ShopProvider`, `CartProvider`, customization controls, size calculation, and USD/KHR formatting.
5. Examine `approved_drink_hero.png` directly to understand design, but do NOT display the full screenshot as a screen background.
6. Record baseline `flutter analyze` and `flutter test` results.

### Step 1 — Redesign the navy hero
- Use navy `#17294D` and Brew & Boba cobalt `#1345A3`, with cream `#FFF8DF` and white details. Optional original pattern asset is provided; use at very low contrast only if it improves readability.
- Provide a top-left back control that works with the existing navigation. Use adequate SafeArea and tap target.
- Center the **actual selected product image** with a dominant visual hierarchy, ample breathing room, subtle drop shadow and, where tasteful, a slight visual angle.
- Remove the tilted *square outer cream photo card*, rectangular double-framed photo, and opaque image background from the current UI. Do not tilt the entire image frame as a substitute for the reference.
- IMPORTANT image constraints: many catalog product images are opaque rectangular photographs, not transparent cup cutouts. Flutter cannot magically turn them into isolated realistic takeaway cups. Implement two honest cases:
  1. For a VERIFIED transparent cutout PNG/WebP of the same real catalog product, show it large on the navy background using `BoxFit.contain`, a subtle shadow and optional slight tilt.
  2. If the current product image is an ordinary opaque photograph, show a high-quality, tastefully rounded photo presentation without fake cutout edges or misleading replacement artwork. Do not crop off the beverage, do not use an unrelated coffee cup in place of a different drink, and do not synthesize products or substitute stock items. Note any asset gaps in the report.
- Do not hardcode Iced Americano, Hot Cappuccino, or a 5.0 review badge. Show ratings ONLY when authentic ratings exist in the actual product model and would be accurate; otherwise omit the rating entirely.
- If the approved mockup's cup logo is not an available branded transparent product asset, do not fake it on an unrelated photo.

### Step 2 — Rounded cream lower sheet
- Reproduce a naturally overlapping rounded-top cream panel (top corner radius roughly 28–36 dp) below the hero.
- Place the existing dynamic product category, name, description and favorite button (only if favorites already work) within this panel.
- Maintain clear separation between the hero and the sheet. Use navy headings, cobalt accents, fine separators, generous horizontal margins (approximately 20–24 dp) and legible descriptions.
- Keep current size selections (with the existing cup icons if available), temperature/ice, sugar/sweetness, toppings and other options **only where the real product/API supports them**. Do not create hypothetical milk or preference-saving features.
- Retain selection states and current pricing adjustments; support scrolling to options below the fold.
- The sheet must be keyboard- and SafeArea-aware if applicable.

### Step 3 — Persistent pricing and CTA
- Keep the bottom price/CTA visible but avoid covering customization fields.
- Use the real cart calculation, live totals and current currency formatter; USD and KHR should match application rules. Do NOT hardcode `$2.30`, `9,430៛`, or any prices from reference images.
- Large cobalt/blue `Add to Cart` button with white text and working existing onTap behavior. Respect disabled/loading state and stock availability.
- Don't show or fake a successful Add to Cart operation until the real cart action succeeds.

### Step 4 — Code quality and responsiveness
- Refactor minimally to a reusable presentation widget for the hero if it improves readability; keep the business providers untouched.
- Avoid fixed heights that cause clipping and layout shifts. Test around 320, 360, 390, 430 dp widths and common screen heights; portrait iPhone and Android.
- Allow scrolling for all available customization options, maintain accessible tap targets, correct text scales and legible contrast.
- Ensure loaded, missing-image, network-error and loading states are visually intentional and never crash.
- Avoid unnecessary new packages, giant shadows, heavy animations or fake customer/product data.

### Step 5 — Validation
Run within `mobile_app`:
```
dart format lib/ui/features/menu test
flutter analyze
flutter test
```
If an iOS simulator is available, run/build the screen and check Flutter build logs. Do not automatically capture screenshots: the operator will provide manual screenshots for visual review. Add focused widget tests for display, image fallback, selection state, cart action and safe scrolling where appropriate.

### Scope and safety
- Do NOT modify `backend/`, `frontend/` or `management-portal/`.
- Do NOT alter API contracts, authentication, database, product identity, cart totals, inventory, payment, checkout or order state.
- Do NOT automatically `git add`, commit, push, deploy, reset or rewrite another contributor's changes.
- Do NOT auto-capture screenshots.

### Deliverable
Implement all relevant UI changes and write `mobile_app/docs/DRINK_HERO_REDESIGN_REPORT.md` with changed files, reference comparison, any opaque-photo limitations, test/analyze/build outputs, and manual QA items.

**Success condition:** the top no longer resembles a rotated square Polaroid; it resembles the supplied dramatic navy product showcase, with an appropriately displayed *real* drink photo, overlapping cream panel, readable customization and preserved live pricing/functional Add to Cart.
