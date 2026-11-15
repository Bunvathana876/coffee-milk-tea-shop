# Brew & Boba Café — Welcome Screen Asset Kit

## Included

- `assets/welcome/welcome_mascot.png` — **transparent PNG**, walking café man, no embedded text. Use as the welcome screen hero artwork.
- `assets/welcome/welcome_wordmark_cream.png` — cream typographic logo graphic on transparent background for cobalt backgrounds.
- `assets/welcome/welcome_wordmark_cobalt.png` — cobalt typographic logo graphic on transparent background for cream backgrounds.
- `assets/welcome/app_icon_candidate_1024.png` — optional square icon mockup; do NOT replace an existing launcher icon without review.
- `reference/welcome_layout_preview.png` — approximate layout guidance, not an app asset.
- `reference/approved_welcome_mockup.png` — prior AI-generated welcome reference; contains phone frame and must **never** be used as a full screen background.

## Flutter integration
Copy `assets/welcome/` to `mobile_app/assets/welcome/`. Add only the appropriate assets to `mobile_app/pubspec.yaml`, e.g.:

```yaml
flutter:
  assets:
    - assets/welcome/welcome_mascot.png
    - assets/welcome/welcome_wordmark_cream.png
    - assets/welcome/welcome_wordmark_cobalt.png
```

Use Image.asset('assets/welcome/welcome_mascot.png') with BoxFit.contain. Prefer real Flutter Text for the tagline and button labels so they scale and are accessible.

## Color and font guide
- Background/primary: Cobalt `#1345A3`
- Secondary heading: Navy `#17294D`
- Brand lettering and buttons on cobalt: Cream `#FFF8DF`
- Accent: Butter `#F5E4AD`
- White `#FFFFFF`

Recommended font families to obtain through licensed means / a compatible Flutter package:
- Brand heading: **Fredoka Bold/Black** (or **Baloo 2 ExtraBold** for more rounded lettering).
- Tagline: **Patrick Hand** for handwritten character, or Fredoka Medium for a simpler build.
- Buttons: **Plus Jakarta Sans SemiBold**, or Fredoka SemiBold for a playful UI.

No font binaries are included. The wordmark PNG was rendered as an illustration and is independent of Flutter font installation.

## Feature safety
Bookings should navigate to a REAL existing booking route only; otherwise show a clearly marked Coming Soon disabled state (not a fake booking). Menu routes to the current Menu/MainScreen. Preserve existing auth/session, cart, API and payments.
