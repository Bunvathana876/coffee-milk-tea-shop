# Brew & Boba Café — Flutter UI redesign report

## Website design analysis

The customer website uses a Cozy Retro Blue palette: cobalt actions and category accents, warm cream page backgrounds, white and cream cards, butter highlights, navy headings, and warm borders. Its home page combines friendly oversized copy with the Brew & Boba cup and mascot artwork. Drink cards show a real catalog image, category, price in USD and KHR, a favorite action, and a sold-out state. The mobile redesign follows these patterns with native scrolling, sheets, and bottom navigation.

The website uses Fredoka and Plus Jakarta Sans. No licensed font files were present in the project, so Flutter keeps its system font fallback. No font package or download was added.

## Existing Flutter architecture

`main.dart` wires repositories and Provider state. `MainScreen` retains its IndexedStack with Menu, Orders, Bag, and Profile destinations. Catalog filtering and favorites remain in `ShopProvider`; cart state and persistence remain in `CartProvider`; auth and session state remain in `UserProvider`; order submission, lookup, and retry remain in `OrderProvider`. The existing Express API service, models, and request payloads were not changed.

## Design tokens applied

The existing `AppColors`, `AppTypography`, and `AppTheme` files now use cobalt `#1345A3`, dark cobalt `#0F3682`, light cobalt `#E8F0FE`, cream `#FFF8DF`, cream card `#FFFDF5`, butter `#F5E4AD`, navy `#17294D`, secondary ink `#3D4F75`, white, and warm border `#ECDCB9`. Material 3 buttons, fields, cards, chips, dialogs, sheets, progress indicators, and navigation share the updated palette and rounded shapes. Status colors remain distinct for order and payment feedback.

## Screens redesigned

- **Menu:** Brand header and cart access, mascot hero with working Explore Drinks scroll action, search, live category filters, responsive product grid, explicit offline notice, and catalog error retry.
- **Product cards:** Rounded image area, loading/error fallback, favorite control, category, USD/KHR prices, clear Customize action, and sold-out treatment.
- **Product customization:** Existing size, sugar, ice, topping, and quantity controls retained, with a per-cup price breakdown and sticky add action.
- **Bag and checkout:** Shared card and typography styling, larger quantity controls, sticky subtotal action, item-by-item checkout review, estimated total wording, and explicit `KHQR · DEMO ONLY` choice.
- **Orders:** Fulfillment badges remain separate from a new payment badge; order cards retain reference, date, item summary, total, detail and reorder actions. Tracking pickup and payment text now wrap safely. History errors offer retry.
- **Profile and authentication:** Brand-colored account area and headings, system-wide form styling, and the real Brew & Boba cup artwork on the sign-in screen.
- **Navigation:** Same four IndexedStack destinations, cobalt selected state, separated white surface, and live bag badge.

## Shared widgets and assets

The existing `ProductCard`, `CategoryChip`, `CartItemTile`, and `StatusBadge` were improved. `PaymentStatusBadge` was added to the shared status widget file. The app now bundles `brew-boba-cup-icon.webp` and `brew-boba-primary.webp` copied from `frontend/public/brand/`, registered in `pubspec.yaml`. Product photography remains sourced from the existing catalog image URLs; no products, prices, or unrelated stock imagery were added.

## Functionality preserved

No backend, website, management portal, database, API path, auth contract, business model, Provider calculation, order payload, or idempotency code was changed. Checkout still clears the cart only after a parsed server order response. Offline order previews are still not represented as confirmed orders. KHQR remains a demonstration option and does not imply paid status. The existing offline catalog fallback in `ShopRepository` was left intact.

## Verification

| Check | Result |
| --- | --- |
| Baseline `flutter analyze` | Passed, no issues |
| Baseline `flutter test` | Passed, 25 tests |
| `flutter pub get` | Passed, no new dependencies |
| Final `flutter analyze` | Passed, no issues |
| Final `flutter test` | Passed, 27 tests; no final failures or skips |
| Layout widget tests | Passed at 320, 360, 390, 430, and 600 logical pixels for drink cards, plus 1.3× text scaling at 360 pixels |
| iPhone 17 Pro simulator startup | App built and launched; Dart VM service became available |
| Full `dart format --output=none --set-exit-if-changed lib test` | Reports the pre-existing generated `lib/data/models/openapi_models.g.dart` as unformatted; it was not edited |
| UI and test formatting | Passed, 0 changes across `lib/core`, `lib/ui`, and `test` |

## Accessibility and responsiveness

The menu grid changes column count for narrow phones and wider devices, and its card extent grows with text scaling. Cards provide readable price tiers and sold-out text. Search clear, favorite, cart, and quantity controls have tooltips or semantic labels. Category animation respects reduced-motion settings. The bottom navigation remains safe-area aware through Flutter's `NavigationBar`. Widget layout tests caught and helped fix card overflow at representative widths and larger text.

## Remaining UI issues and validation limits

No screenshot was captured. The simulator launch establishes startup and build health, but does not prove every route, keyboard state, image URL, large text setting, or checkout gesture visually. Live authenticated checkout requires a running café API and a test customer account; it was not submitted during this UI task. Device-specific contrast and screen-reader review remain manual checks. The bundled system fallback differs from the website's Fredoka and Plus Jakarta Sans until properly licensed font files are supplied.

## Manual device verification checklist

1. On a small phone and a wider phone, review the header, hero, category scroll, product cards, sold-out treatment, and image fallbacks.
2. Increase system text size and confirm no clipping in the menu, customization sheet, bag, checkout, and order cards.
3. Search, clear search, change categories, save a favorite, customize a drink, add it to the bag, change quantity, remove it, and restore a persisted bag after restart.
4. Open checkout with the keyboard visible; confirm form labels, validation messages, item review, and submit action remain reachable.
5. Confirm KHQR says DEMO ONLY and that payment remains unconfirmed unless the server reports paid.
6. With a disposable customer account and test API, place an order once, open its detail page, refresh its fulfillment and payment statuses, and verify order history and retry behavior.
7. Test VoiceOver or TalkBack navigation labels and reduced-motion settings.
