# Codex task — Implement Brew & Boba Café welcome screen from supplied assets

You are a senior Flutter/Dart engineer and mobile UI designer. Your task is a **UI-only** welcome screen matching the approved Brew & Boba Café blue welcome mockup. Implement the actual Flutter code; do not merely propose a plan.

PROJECT ROOT: `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`
APP: `mobile_app/`

## Asset kit
The user downloaded and extracted `Brew_Boba_Welcome_Assets.zip`. Find and copy from its `assets/welcome/` folder into `mobile_app/assets/welcome/` as appropriate:
- `welcome_mascot.png` (transparent, walking young man holding coffee)
- `welcome_wordmark_cream.png` (transparent cream `BREW & / BOBA / café` wordmark)
- `welcome_wordmark_cobalt.png` (optional light-background variant)
- `app_icon_candidate_1024.png` (OPTIONAL; do not apply as launcher icon without user approval)
- `reference/approved_welcome_mockup.png`, `reference/welcome_layout_preview.png` are visual references, **never use the full screenshot as an in-app background or UI asset**.

If the assets aren't found, STOP and tell the user the required paths rather than fabricating replacements.

## Visual target
- Full-bleed cobalt `#1345A3` background, minimal and clean.
- Large cream `BREW & BOBA` title near the upper section; small `café` underneath, ideally using the supplied optional wordmark PNG for exact fidelity. Use `Semantics(label: 'Brew and Boba Café')` for the image logo.
- Main center: large walking Brew & Boba man holding takeaway cup, transparent asset, `Image.asset` with `BoxFit.contain` (no stock or mascot swap).
- Tagline centered below: `Come for the brew,` / `stay for the vibes.`; live Flutter `Text` for accessibility.
- Two pill-outline buttons aligned near the bottom: `Bookings` and `Menu`. White/cream outline and readable labels, optional `Icons.calendar_month_outlined` / `Icons.local_cafe_outlined`. Adapt to narrow widths.
- Palette: Cobalt `#1345A3`; Cream `#FFF8DF`; Butter `#F5E4AD` only as tiny accent; Navy `#17294D` if needed; White `#FFFFFF`.
- No dark mode variants for this screen.

## Typography
Preferred Google Fonts if a compatible package is available or safe to add:
- `Fredoka` weight 700/800 for playful display headings (if using live title text).
- `Patrick Hand` for handwritten tagline, or use Fredoka Medium for consistency.
- `Plus Jakarta Sans` weight 600 for buttons and supporting labels.
Inspect current `pubspec.yaml` and assets first. Add only a compatible licensed dependency when necessary. If package installation is unavailable, use already bundled font families or Flutter system fallbacks. Do not embed font binaries without a valid license. For exact logo rendering without font files, use the included wordmark PNG.

## Work plan
1. Read AGENTS.md, inspect `git status -sb`, inspect the actual local app; preserve uncommitted work and existing `mobile_app/assets/brand/` folder.
2. Inspect `mobile_app/lib/main.dart`, `ui/navigation/main_screen.dart`, `providers/`, `core/theme/`, `pubspec.yaml` and current route/auth flows. The version in GitHub starts with `home: const MainScreen()` but **inspect current local code**, which may differ.
3. Add only welcome assets in `pubspec.yaml`; confirm `Image.asset` loads without exceptions.
4. Implement a clean `WelcomeScreen` in an appropriate new UI file under `mobile_app/lib/ui/features/welcome/` with `SafeArea`, `LayoutBuilder` and an adaptive `SingleChildScrollView`/flex layout. Do not hardcode device dimensions; keep title, mascot, tagline and buttons on screen at 320dp, 360dp, 390dp, 430dp and with larger text scale.
5. Integrate welcome as a safe entry point without breaking app initialization, Provider repositories, authenticated users, cart persistence, deep links or existing navigation. Do not modify backend/auth business logic. Decide whether to show once or at launch based on current app conventions; document chosen behavior.
6. `Menu` must navigate to the actual existing `MainScreen` with Menu selected, without stacking duplicate roots or resetting Provider state.
7. `Bookings` must work ONLY if a real existing booking feature/route exists. Otherwise show it as visually consistent but **clearly marked `Coming soon` and disabled**. Never invent a booking API, fake reservation confirmation, or a dead-end working-looking button.
8. Keep title and buttons as separate accessible widgets where possible; mascot and wordmark remain separate transparent images. Never use the reference screenshot as a whole-screen background.
9. Add small focused widget tests for logo/mascot loading, Menu navigation, Bookings honest state, layout at small sizes and large text scales. No automatic screenshot capturing.
10. Run `dart format` only on edited Dart files; `flutter analyze`, `flutter test` and an available non-destructive iOS/Android build/run. Report device/simulator checks actually performed.
11. Review `git diff --check`, `git diff --stat`, all changed files and keep edits limited to `mobile_app/` UI and asset registration. Do not touch database, network contracts, provider business logic, payment/order calculations, customer website or management portal.

## Non-negotiable
No auto commits/pushes/deploys. No migrations. No fake booking feature, fake products or fake payments. No replacing brand artwork. Do not distribute font files. Do not take screenshots automatically; the user will take them manually.

## Completion
Provide: paths changed, exact asset registration, UI behavior and route behavior, test/build results, any gaps, and manual visual QA instructions. The result must visibly match the approved cobalt welcome design with the supplied walking man, brand wordmark, tagline and Bookings/Menu controls while keeping existing customer flows intact.
