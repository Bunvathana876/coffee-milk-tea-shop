# Brew & Boba Café Home UI implementation

## Files changed for this work

- `lib/ui/features/menu/screens/menu_screen.dart`: cobalt Home layout, live search, greeting, carousel, category shortcuts, product list, and catalog actions.
- `lib/ui/features/menu/widgets/product_card.dart`: compact cream cards with image, name, description, backend price, favorite control, customization button, and sold-out state.
- `lib/ui/features/menu/widgets/product_detail_sheet.dart`: allowed section headings to wrap on narrow phones; customization and pricing logic are unchanged.
- `lib/ui/navigation/main_screen.dart`: floating navy navigation for the existing Home, Orders, Bag, and Profile destinations.
- `pubspec.yaml`: registered the supplied Home banners and PNG icons.
- `test/home_ui_test.dart`: focused Home interaction and layout tests.
- `docs/HOME_UI_IMPLEMENTATION_REPORT.md`: this report.

The repository had other uncommitted edits before this work. They were preserved.

## Assets

Registered `assets/home/banners/banner_01_boba_art.png`, `banner_02_coffee_art.png`, and `banner_03_treats_art.png`. Registered `assets/home/icons/png/` for category, search, avatar, and navigation artwork. These supplied files were already present in the working tree. The centered wordmark reuses `assets/welcome/welcome_wordmark_cream.png`. No SVG dependency was added.

## Components and behavior

- The carousel uses `PageView`, three live text and CTA overlays, and accessible page controls. Explore Coffee selects an existing coffee category when present; the other actions open the full catalog.
- Category tiles come from active `ShopProvider.categories`, scroll horizontally, and select the existing category filter. View all resets search and category filters.
- The search field updates the existing `ShopProvider` query. Products come from the existing repository and provider; no example names, prices, ranks, or discounts were added to the Home UI. Because the catalog has no popularity rank, the heading says **Featured Drinks**.
- Product plus buttons open the existing customization sheet, which continues to apply its current size, ice, sugar, topping, and cart logic. Sold-out products cannot be opened. The existing favorite action remains available.
- The profile avatar selects the existing Profile tab. The floating bar retains all four destinations and the bag quantity badge.
- The existing offline catalog fallback remains part of the app. When it is used, its sample products are a preview rather than confirmed backend inventory.

## Verification

- Baseline: `flutter analyze` and `flutter test` passed.
- Final: `flutter analyze` passed with no issues; `flutter test` passed (43 tests).
- Focused tests cover carousel pagination and coffee action, search and category filters, customization opening, four-tab navigation, widths of 320/360/390/430 dp, and 1.3× text scaling.
- The app built and launched in the iPhone 17 Pro simulator. No screenshots were captured.
- `git diff --check` passed. `graphify update .` refreshed the project graph.

## Remaining manual visual checks

On the simulator, open Home and compare the artwork, wordmark, banner copy, category row, card image crops, and floating bar with the approved reference. Repeat with a connected catalog and an offline catalog, and inspect 320/360/390/430 dp devices plus larger accessibility text. Screenshots are left to the project owner.
