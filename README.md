# Brew & Boba Café — Your Orders V4 Asset Kit

This ZIP contains **real, separate transparent PNG artwork** and a matching icon set, **not** a flattened phone screenshot. Use the provided reference to implement the UI with responsive Flutter widgets.

## Contents

- `mobile_app/assets/images/orders_v4/illustrations/orders_header_barista_512.png` — optimized header character (512×512)
- `mobile_app/assets/images/orders_v4/illustrations/orders_header_barista.png` — full-resolution 1024×1024 character
- `mobile_app/assets/images/orders_v4/illustrations/no_orders_illustration_800.png` — optimized empty order art (800×640)
- `mobile_app/assets/images/orders_v4/illustrations/no_orders_illustration.png` — full-resolution 1280×1024
- `mobile_app/assets/images/orders_v4/icons/` — individually rendered transparent icons at 48, 96, and 192 px; additional white versions for the dark header/navigation
- `svg_sources/` — editable vector originals for every icon (do not need Flutter SVG plugin to use included PNGs)
- `docs/AGY_YOUR_ORDERS_V4_PROMPT.md` — copy-paste implementation prompt for Antigravity (AGY)
- `REFERENCE_TARGET_ORDERS.png` — your target screen
- `ORDERS_V4_ASSETS_PREVIEW.png` — contact sheet for checking asset visuals

## Install

1. Unzip. Copy the folder `mobile_app/assets/images/orders_v4` into the **same relative location** inside your existing `coffee-milk-tea-shop/mobile_app` project.
2. Under the **existing** `flutter:` key in `mobile_app/pubspec.yaml`, add the following entries to the **existing** `assets:` list. Keep all existing assets.

```yaml
flutter:
  assets:
    - assets/images/orders_v4/illustrations/
    - assets/images/orders_v4/icons/
```

3. In the `mobile_app` directory, run `flutter pub get` once. Then open the project in VS Code and use **F5** with your existing debug configuration.
4. Attach `REFERENCE_TARGET_ORDERS.png` when you send the text from `docs/AGY_YOUR_ORDERS_V4_PROMPT.md` to AGY.

### Flutter image snippets

```dart
Image.asset('assets/images/orders_v4/illustrations/orders_header_barista_512.png', fit: BoxFit.contain);
Image.asset('assets/images/orders_v4/illustrations/no_orders_illustration_800.png', fit: BoxFit.contain);
Image.asset('assets/images/orders_v4/icons/status_pending_96.png', width: 32, height: 32);
```

For the navy navbar, `nav_orders_white_96.png` is white and `nav_orders_96.png` is cobalt for use over a cream selection circle.

## Notes

- Icons are normal PNG files, ready for Flutter `Image.asset`. SVG is included as an editable source only.
- The tracker progress, waves, card backgrounds, button, and navbar must be **drawn with Flutter widgets / CustomPainter**, not with the provided reference screenshot.
- No changes have been made to your local repository, backend or databases.
- Do not use the illustrative empty state when a customer has orders or when an API fetch failed.
