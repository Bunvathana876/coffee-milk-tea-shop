# BREW & BOBA CAFÉ — DRINK DETAIL CUSTOMIZATION SCREEN

You are a senior Flutter engineer and mobile UI/UX designer. Implement an actual, functional Flutter Drink Detail / Product Customization screen matching the visual reference at:
`mobile_app/design_references/drink_detail_visual_reference.png`.

PROJECT ROOT: `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`
TARGET: `mobile_app/` ONLY

## Phase 0 — Protect and inspect
1. Read AGENTS.md, inspect `git status -sb`, and preserve every existing local change.
2. Locate the CURRENT product detail implementation (historically `mobile_app/lib/ui/features/menu/widgets/product_detail_sheet.dart`), product models, ShopProvider, CartProvider, image handling and theme. Discover current files; do not rely on an outdated GitHub snapshot.
3. Inspect current supported selections: sizes, ice/temperature, sugar/sweetness, toppings, and any milk options. Map data flow from product through selected options to cart item and server price.
4. Run baseline `flutter analyze` and `flutter test` and note results.
5. Inspect all three user reference screenshots and the kit visual reference. The reference layout is the target, not its sample prices or unsupported options.

## Phase 1 — Visual design: follow the image closely
Match this hierarchy:
- A full-width NAVY (#17294D) upper background, status-bar-safe region, minimalist back arrow and `Menu` label.
- A large authentic PRODUCT PHOTO centered in the navy upper section, floating across the boundary onto the cream panel. Use existing product `image` URL, `CachedNetworkImage` or current image loader, and a clean fallback for missing images. Keep aspect ratio, avoid cropping off the drink.
- Rounded-top CREAM (#FFF8DF) scrollable lower panel with generous space above the title to accommodate the floating product image.
- Left-aligned product name (bold navy) and short description where available.
- `Size options` row of 3 outline cup graphics; visually emphasize the currently selected available size using a light-blue selected tile, cobalt stroke, small dot, and strong label.
- Thin subtle dividers between option sections.
- `Temperature` section, `Milk` section, `Sweetness` section only IF the current product/backend actually supports those concepts; render supported `Ice`, `Sugar`, and `Toppings` under their correct actual labels otherwise. Do not fabricate modifiers.
- For exclusive choices, use a radio/segmented selection pattern (not multiple conflicting checkboxes). Use checkboxes only for genuinely combinable choices.
- Prices or surcharges on each row aligned right, from the EXISTING authoritative pricing/option model, not the screenshot's sample numbers.
- Optional `Save preferences for this drink?` toggle ONLY if the app already has real persistence support; otherwise omit it, not a fake switch.
- Bottom summary showing REAL total (existing currency formatting including KHR when supported) plus one large cobalt Add to Cart button with a small bag icon.

## Phase 2 — Exact brand color treatment
- Navy header: #17294D
- Cobalt interactive states: #1345A3
- Cream panel: #FFF8DF
- Butter accents: #F5E4AD
- White and subtle blue-grey dividers.
- Typography: use existing brand design tokens/typography. Avoid inventing unrelated fonts.
- Keep compact premium editorial style; spacious but not giant gaps.

## Phase 3 — Cup-size icons
Use the supplied files (already in `mobile_app/assets/drink_detail/size_icons/`):
- `cup_small.png`
- `cup_medium.png`
- `cup_large.png`

These are transparent PNGs with cobalt vector-like outlines. Their SVG originals are also provided but Flutter should use PNGs unless an existing SVG runtime is already installed. Register the new asset path in pubspec.yaml **without removing existing assets**.

IMPORTANT: Map the 3 illustrations to the actual available product size choices by their ordered semantic meaning, NOT blindly hard-code capacities, backend IDs or prices. If size choices differ from 3, adapt gracefully: show a compatible cup glyph for additional choices or fewer choices without fake values. Labels and prices must come from live product data. The visual example `Small 250 ml / Medium 350 ml / Large 500 ml` is not canonical backend truth.

## Phase 4 — Interaction/functionality
- Back navigates correctly to the real Menu, preserves current navigation state.
- Changing the selected size, ice, sugar or topping updates UI and real price correctly using existing provider/calculation code. Do not change price algorithms.
- Defaults match the current product's valid defaults.
- Disabled options/sold-out items are visibly disabled and impossible to submit.
- Prevent repeated Add to Cart taps or duplicate cart entries while submitting, and preserve existing cart contract.
- Add to Cart triggers the existing cart action, shows success feedback using current conventions, does not claim an order or payment was completed.
- No fake upsells, no fake delivery tracking, no fabricated milk options, no mock prices.

## Phase 5 — Scrolling/responsive behavior
- Treat the entire cream content as vertically scrollable.
- Place the main CTA in an anchored, safe-area-aware bottom footer, leaving enough scroll padding that the last setting is never hidden behind it.
- Ensure floating image does not block tappable options or overlap headings.
- Test 320dp, 360dp, 390dp, 430dp widths; small heights, notches, text scales, Android and iOS.
- Handle image loading/error, long product names, large numbers, and no supported modifiers.
- Do not introduce overflow and do not make screenshot-sized fixed pixel assumptions.

## Phase 6 — Scope and safety
- Only edit `mobile_app/` presentation/widgets/assets and focused tests as necessary.
- Do NOT modify backend, database, web frontend, management portal, migrations, API contracts, Provider business logic, order, checkout, authentication, or payment calculations.
- Preserve current menu, cart and navigation behavior.
- Do not flatten the reference screenshot as the UI background; build real accessible Flutter widgets.
- Do not auto-capture screenshots: I will take and upload screenshots manually.
- Do not auto-commit, auto-push or deploy.

## Phase 7 — Verify
Run (from `mobile_app/`):
- `flutter pub get`
- `dart format lib test` (limit formatting to touched files if broader formatting creates unrelated diffs)
- `flutter analyze`
- `flutter test`

Add focused tests as appropriate for size selection, total price display, product image fallback, scroll/CTA visibility, and Add to Cart with selected options. Test iPhone simulator launch if available. Inspect `git diff --check` and `git diff --stat`.

## Phase 8 — Deliver
Write `mobile_app/docs/DRINK_DETAIL_UI_REPORT.md` including changed files, real options present, any reference-only options intentionally omitted, responsive notes, test results, and manual screen-review checklist.

SUCCESS: a visually faithful Brew & Boba drink details screen with a navy upper hero, beautiful product image floating above the curved cream customization panel, tasteful cup-size choices, real product options, accurate total, scrollable settings and functional Add to Cart — WITHOUT touching existing business logic.
