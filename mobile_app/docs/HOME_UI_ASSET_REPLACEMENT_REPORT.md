# Home UI asset replacement

## Changes

- `lib/ui/features/menu/screens/menu_screen.dart`: replaced the old banner Stack and its duplicate text/buttons with `BrandBannerCarousel`; used `BrandCategoryIcon` with each category's backend name while retaining category ID filtering; tightened header and section spacing; added scroll clearance below the final product card and the optional bag button.
- `lib/ui/features/menu/widgets/brand_banner_carousel.dart`: retained the supplied three-image PageView, cream backing, rounded corners, and `BoxFit.contain`; added working, accessible pagination dots and stable test keys.
- `lib/ui/features/menu/widgets/brand_category_icon.dart`: retained the supplied name-to-asset mapping and formatted its fallback logic.
- `lib/ui/navigation/main_screen.dart`: set light status-bar icons over cobalt Home and dark icons over cream tabs. Existing four tabs and cart badge remain.
- `pubspec.yaml`: registered both new asset directories while keeping all existing entries.
- `test/home_ui_test.dart`: covered image-only banners, dot taps and swipes, category asset mapping and filtering, product clearance above navigation, and narrow/large-text layouts.

## Asset mapping

| Backend category name | Image |
| --- | --- |
| Coffee | `assets/home_refresh/categories/coffee.png` |
| Milk Tea | `assets/home_refresh/categories/milk_tea.png` |
| Fruit Tea | `assets/home_refresh/categories/fruit_tea.png` |
| Smoothies | `assets/home_refresh/categories/smoothies.png` |
| Matcha | `assets/home_refresh/categories/matcha.png` |

The carousel uses `assets/home_refresh/banners/banner_01.png`, `banner_02.png`, and `banner_03.png` in that order. Unknown categories retain a generic fallback icon; their backend IDs still drive filtering.

## Validation

- `flutter pub get`: passed.
- `flutter analyze --no-pub`: passed with no issues.
- `flutter test --no-pub`: passed, 45 tests.
- `flutter build ios --simulator --no-codesign --no-pub`: passed; produced `build/ios/iphonesimulator/Runner.app`.
- `git diff --check`: passed.
- `graphify update .`: completed.

## Manual visual review

No screenshots were captured. The iOS simulator build succeeded, but the UI was not launched for visual inspection. Please review banner legibility, category spacing, status icons, and final-card clearance on your preferred device and send your manual screenshots. Banner 3 is wider than 2:1, so `BoxFit.contain` may show slim cream bands; its artwork remains complete.

The repository had extensive uncommitted work before this repair. That work was preserved. No commit, push, or deployment was made.
