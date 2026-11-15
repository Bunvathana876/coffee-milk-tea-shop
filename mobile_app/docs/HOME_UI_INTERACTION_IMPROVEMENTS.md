# Home UI interaction improvements

## Files changed

- `lib/ui/features/menu/screens/menu_screen.dart`
- `lib/ui/features/menu/widgets/brand_banner_carousel.dart`
- `lib/ui/navigation/main_screen.dart`
- `test/home_ui_test.dart`

## Home layout and categories

Removed the Home greeting and offline-preview paragraph and reduced the search-to-banner gap. Offline detection, order validation, and checkout behavior remain in their existing layers.

The category row now includes an All Drinks reset tile and highlights the selected category with a cobalt border, butter fill, stronger label, and active dot. Taps still pass the backend category ID to `ShopProvider.selectCategory`; `ShopProvider.filteredProducts` supplies the resulting real products. The product heading names the selected category, and an empty category shows a friendly empty state with an All Drinks action. The catalog scroll leaves the category row in view. Existing loading and retry states remain.

## Carousel behavior

The three existing banner images and `BoxFit.contain` layout are unchanged. A single scheduled timer advances after five seconds, animates for 450 milliseconds, and wraps from banner 3 to banner 1. A manual swipe or dot tap cancels the pending advance and schedules the next one after eight seconds. The timer pauses during pointer interaction, when the Home tab is inactive, when the app is not resumed, and when reduced-motion settings are enabled. It resumes when the relevant state becomes active and is canceled on disposal. Pagination dots track page changes, including swipes.

`MainScreen` passes Home tab activity to the carousel through `MenuScreen`; the existing four destinations and cart badge are unchanged. No new navigation route was added.

## Validation

- `dart format lib test`: completed; the formatter's unrelated generated model change was restored.
- `flutter analyze --no-pub`: passed with no issues.
- `flutter test --no-pub`: passed, 52 tests.
- iPhone 17 Pro simulator: debug build, install, and app launch succeeded with a Dart VM Service. No runtime error appeared at launch.
- `git diff --check`: passed.

## Manual review

No screenshots were captured. The simulator launched at the app's normal entry flow; Home's final visual appearance, large-text category styling, and live catalog content still need your manual review on the device. Existing uncommitted work was preserved. No commit, push, or deployment was made.
