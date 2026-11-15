# Flutter menu and Cloudinary image fix

Date: 2026-11-15. Scope: local Flutter development and read-only verification.

## Confirmed root cause

The booted iPhone 16e Simulator had `flutter.custom_api_url` saved as `http://localhost:8000`. The existing `main.dart` and `UserProvider` gave that value priority over the configured API URL. The generated iOS build configuration had no `BREW_BOBA_API_URL` define. Port 8000 belongs to a different service: its `GET /api/categories?active_only=true` returned HTTP 200 with a JSON object containing `data`, `message`, and `success`. Flutter's catalog parser expected a JSON list, so category loading failed and the Menu showed “Menu unavailable.” The API-only repository correctly did not substitute the removed sample menu.

The café backend at `http://127.0.0.1:8003` returned HTTP 200 for `/api/health`. From the booted Simulator, a read-only request to the same health endpoint also returned HTTP 200. Its categories and products endpoints returned the expected JSON lists. The recent 20-drink catalog parsed successfully in Flutter; it did not introduce the observed failure.

## API URL before and after

| State | Effective URL | Evidence |
|---|---|---|
| Existing simulator build, before fix | `http://localhost:8000` | Saved preference was present; startup code selected it; no explicit build define was present. |
| Updated simulator run with explicit define | `http://127.0.0.1:8003` | `flutter run --dart-define=BREW_BOBA_API_URL=http://127.0.0.1:8003` logged the resolved URL on iPhone 16e. |
| New iOS Simulator debug default when no saved URL exists | `http://127.0.0.1:8003` | URL priority tests passed. |

Development priority is now explicit `BREW_BOBA_API_URL`, then a syntactically valid saved custom URL, then the platform default. Android Emulator defaults to `http://10.0.2.2:8003`. Release builds still require an explicit URL. Invalid saved URLs are ignored without deleting them; invalid explicit URLs fail safely. No path silently selects port 8001.

The saved port 8000 preference remains intact, as requested. **Future simulator launches without the explicit define will still select that valid saved URL.** To keep using the café backend while retaining the preference, launch with:

```bash
cd mobile_app
flutter run -d 83E3BE32-6CE5-424B-9E8E-5668F3A7F732 --dart-define=BREW_BOBA_API_URL=http://127.0.0.1:8003
```

## Catalog and image verification

Read-only calls to the live backend returned **7 active categories** and **20 available products**. All 20 available product records currently contain Cloudinary image URLs. Product details for IDs 3 (Cappuccino), 4 (Caramel Macchiato), and 16 (Iced Matcha Latte) returned their Cloudinary URLs. Their 320 px card and 800 px detail derivatives each returned HTTP 200 with `image/png` (six checks total).

The existing product card reads `product.image`, requests a bounded Cloudinary derivative through `productImageUrl`, and uses `BoxFit.contain` with loading and error placeholders. Home and Menu share this card. Drink Details receives the same `product.image` and uses a cached network image provider with `BoxFit.contain` for Cloudinary cutouts. No product image URL was hard-coded in a widget or changed in the database. Actual visual appearance on the Simulator was not inspected.

Catalog requests now log the request URL and underlying error in debug mode. A wrong-backend JSON envelope produces a clear format diagnostic instead of an opaque cast error. Network and timeout messages identify the target API origin. The Menu displays the diagnostic and its Retry button issues both catalog GET requests again. A successful empty list remains an empty menu without a network error. Each refresh clears old catalog records while loading, and an older response cannot replace a newer refresh.

## Files changed

- `mobile_app/lib/core/config/app_config.dart` — URL validation, priority, and simulator defaults.
- `mobile_app/lib/main.dart` and `mobile_app/lib/providers/user_provider.dart` — use the same resolved URL at startup without rewriting saved preferences.
- `mobile_app/lib/data/services/api_service.dart` — catalog response checks and debug request diagnostics.
- `mobile_app/lib/providers/shop_provider.dart` and `mobile_app/lib/ui/features/menu/screens/menu_screen.dart` — clear stale catalog data, retain latest refresh, and show the actual error with Retry.
- `mobile_app/test/unit/api_url_priority_test.dart`, `catalog_api_test.dart`, and `live_catalog_smoke_test.dart` — focused URL, storage, response, retry, widget, image, and live API checks.
- `mobile_app/test/unit/order_reliability_test.dart` — expected iOS debug default.
- `mobile_app/README.md` — updated development URL and explicit override instructions.

The API-only `ShopRepository` and Cloudinary image widgets were inspected and needed no further changes for this fix.

## Tests and limits

| Check | Outcome |
|---|---|
| `flutter analyze` | No issues. |
| `flutter test` | 70 passed, 1 intentionally skipped live smoke test. Cart and checkout tests passed. |
| URL priority test with explicit `--dart-define` | Passed; saved URL, cart, and account preferences remained intact. |
| Live Flutter catalog smoke test, enabled explicitly | Passed; loaded 7 categories and 20 products, including IDs 3, 4, and 16 with Cloudinary URLs. |
| Booted iPhone 16e Simulator | Updated app built and launched; Flutter logged `http://127.0.0.1:8003`. Simulator network request to backend health returned HTTP 200. |
| Cloudinary delivery | Six card/detail derivative HEAD requests returned HTTP 200 PNG. |

The remaining manual check is to open Home, Menu, and Drink Details on the running Simulator and inspect cup sizing and transparency. No screenshots were captured and no visual verification is claimed. PostgreSQL, Neon, Cloudinary assets, product records, prices, authentication, and payment code were not changed. No commit, push, or deployment was performed.
