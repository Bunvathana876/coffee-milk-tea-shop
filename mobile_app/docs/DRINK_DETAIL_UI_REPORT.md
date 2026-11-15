# Drink Detail UI implementation

## Changed files

- `lib/ui/features/menu/widgets/product_detail_sheet.dart`: rebuilt the existing customization view as a full-screen route with a navy hero, floating product image, rounded cream content, scrollable supported options, and a safe-area footer.
- `pubspec.yaml`: registered `assets/drink_detail/size_icons/` while retaining existing asset declarations.
- `test/drink_detail_ui_test.dart`: added focused detail-screen tests.
- `test/widget_test.dart` and `test/home_ui_test.dart`: updated the expected button text to **Add to Cart**.

The supplied cup PNGs in `assets/drink_detail/size_icons/` are used as-is. Existing product image URLs load through `CachedNetworkImage` with `BoxFit.contain`; missing or failed images show a café icon fallback.

## Actual customization and cart flow

The current app supports Small, Medium, and Large sizes; ice levels; sugar percentages; four optional toppings; quantity; and favorites. Size and topping surcharges come from `AppConfig`. The footer total comes from `CartItemModel.subtotalUsd` and displays USD and KHR through `CurrencyFormatter`. Add to Cart sends one `CartItemModel` through the existing callback, which `MenuScreen` connects to `CartProvider` and its existing success message. Unavailable products cannot be submitted, and the button locks after a successful tap.

The visual reference's milk, warm/cold temperature, cup capacities, and saved-preference toggle were omitted because the current product and cart contracts do not support them. No sample prices from the reference were used.

## Responsive behavior

The cream options scroll independently of the anchored total and Add to Cart footer. Cup choices use two columns at narrow widths or increased text scale, and three columns when space allows. The header image scales with screen width, while the total scales down for unusually large amounts. Widget tests cover 320, 360, 390, and 430 logical pixel widths, a short 560-pixel height, increased text scale, and a long product name.

## Verification

- Baseline: `flutter analyze --no-pub` clean; 52 Flutter tests passed.
- `flutter pub get`: passed.
- Scoped `dart format` on touched Dart files: passed.
- Final `flutter analyze --no-pub`: clean.
- Final `flutter test --no-pub`: 58 tests passed.
- `flutter build ios --simulator --no-codesign --no-pub`: passed.
- Built app installed and launched on an iPhone 17 Pro simulator.
- `git diff --check`: passed; `git diff --stat` reviewed. The repository had substantial pre-existing uncommitted changes, which were preserved.
- `graphify update .`: completed.

## Manual review

No screenshot was captured. The simulator launched at the normal app entry point; the detail route was exercised in widget tests, but its final appearance with a live product photo still needs manual device review. Check the navy-to-cream boundary, real product image framing, size-icon scale, large-text readability, scroll reachability, and footer clearance. Only the kit's `drink_detail_visual_reference.png` was available in the local reference folder; the prompt's other three screenshots were not present there.

No commit, push, or deployment was made.
