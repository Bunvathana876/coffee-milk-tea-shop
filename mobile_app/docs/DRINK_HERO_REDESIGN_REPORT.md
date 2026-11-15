# Drink Details UI fix

## Files changed in this pass

- `lib/ui/features/menu/widgets/drink_hero_artwork.dart`: removed the oversized cream photo frame. Verified transparent product images still float over the navy hero. Opaque product photos now fill the hero with `BoxFit.cover` and a subtle navy gradient. Both paths use the selected product's image provider; missing or failed images retain the neutral fallback.
- `lib/ui/features/menu/widgets/product_detail_sheet.dart`: layered the real photo behind the back control, kept the rounded cream details panel, and added scroll clearance after the last customization option above the separate SafeArea footer.
- `test/drink_detail_ui_test.dart`: added an opaque-image rendering test and checked that the last option scrolls clear of the footer at 320, 360, 390, and 430 dp. Existing tests cover size selection, live USD/KHR totals, Add to Cart, availability, navigation, and larger text.

## Behavior preserved

The screen still uses the selected product's name, category, description, image URL, availability, favorites, and supported choices. The existing `CartItemModel` calculates size and topping totals; `CurrencyFormatter` displays USD and KHR. The Add to Cart callback and disabled state are unchanged. No backend, API, pricing, authentication, checkout, or payment code changed.

## Verification

- `dart format` passed.
- `flutter analyze --no-pub` passed with no issues.
- `flutter test --no-pub` passed: 60 tests.
- `flutter build ios --simulator --no-codesign --no-pub` passed.
- The built app installed and launched on the iPhone 17 Pro simulator.

## Manual review

No screenshot was captured. The simulator launched the app's normal entry point; the Drink Details route with a live catalog image still needs visual review. Check one transparent product image and one ordinary photo, particularly their crop and contrast. Ordinary photos will not have the isolated takeaway-cup appearance of a transparent product cutout; those products need real transparent assets if that appearance is desired. Existing uncommitted work was preserved. No commit, push, or deployment was made.
