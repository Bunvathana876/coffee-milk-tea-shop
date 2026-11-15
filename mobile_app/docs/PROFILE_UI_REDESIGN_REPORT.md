# Brew & Boba Café — Profile Screen V2: Pixel-Accurate Redesign Report

## 1. Pixel-Accurate V2 Improvements

- **Full Cobalt-Blue Canvas**: The main screen background is now solid Brew & Boba cobalt blue (`AppColors.primary`), matching `REFERENCE_TARGET_PROFILE.png`. Cobalt blue is visible behind the cards, between cards, and surrounding the floating dark-navy navigation pill.
- **Compact Header with Layered Wave**:
  - Centered cream café wordmark (`welcome_wordmark_cream.png`).
  - Left-aligned Profile outline icon (`icon_profile.png`) and bold **Profile** title matching the reference card alignment.
  - Decorative layered wave transition (`_ProfileWavePainter`) featuring cobalt, golden-yellow (`#F5E4AD`), white, and cream curves.
  - Correct top safe-area padding with no excess vertical dead space.
- **Overlapping Profile Card**:
  - Overlaps the bottom of the header wave using `Transform.translate(offset: Offset(0, -18))`.
  - Circular avatar (`profile_avatar.png`, 54×54).
  - Customer name and phone for authenticated users with a Member pill and working circular edit button (`icon_edit_button.png`, 32×32).
  - Compact rounded pill actions for guests (**Sign In** with `icon_sign_in.png` and **Register** with `icon_register.png`, 36 dp height, borderRadius 18).
- **Streamlined Your Orders Card**:
  - Compact single-row layout (52 dp height).
  - `icon_orders.png` (24×24), bold deep navy **Your Orders** text, and chevron `icon_arrow_right.png`.
  - Removed bulky subtitle descriptions to keep the card compact and uncluttered.
- **Horizontal Café Punch Card**:
  - Compact horizontal layout matching the reference.
  - Left: cute boba illustration (`loyalty_boba.png`, 54×68).
  - Top: **Café Punch Card** title and small cobalt progress pill (`0 / 10` or `$stamps / 10`).
  - Right: two compact rows of 5 circular stamps (stamps 1–5 in row 1, stamps 6–9 and star reward in row 2).
  - Thin golden stamp outlines (`#D4AF37`) with deep navy numbers and star icon (`icon_star.png`).
  - Connects to real confirmed stamps from `UserProvider` / `customer_users.loyalty_stamps`.
- **Horizontal Store Information Card**:
  - Correct horizontal arrangement matching the reference.
  - Left: storefront illustration (`cafe_storefront.png`, 88×80) without a full-width banner.
  - Center: thin golden vertical divider.
  - Right: compact 3-row layout with store name, `icon_location.png` + address, `icon_phone.png` + hotline, and `icon_hours.png` + opening hours, separated by subtle dividers.
  - Reads verified values from `AppConfig`.
- **Streamlined Settings Card**:
  - Compact single-row layout (52 dp height).
  - `icon_settings.png` (24×24), bold deep navy **Settings** text, and chevron `icon_arrow_right.png`.
  - Removed diagnostic subtitle from the card, preserving clean navigation to `SettingsScreen`.
- **Dark-Navy Floating Navigation**:
  - Floating dark-navy pill (`AppColors.bobaPearl`) over the cobalt-blue background.
  - Profile tab features the active cream circular highlight (`AppColors.secondaryLight`).

## 2. Assets Used

From `mobile_app/assets/images/profile/`:
- `profile_avatar.png` (circular avatar)
- `loyalty_boba.png` (boba loyalty illustration)
- `cafe_storefront.png` (storefront illustration)
- `icon_profile.png` (header profile outline icon)
- `icon_edit_button.png` (profile card edit button)
- `icon_sign_in.png` (guest sign-in action icon)
- `icon_register.png` (guest register action icon)
- `icon_orders.png` (your orders card icon)
- `icon_settings.png` (settings card icon)
- `icon_location.png` (store location row icon)
- `icon_phone.png` (store hotline row icon)
- `icon_hours.png` (store hours row icon)
- `icon_star.png` (punch card 10th slot star)
- `icon_arrow_right.png` (navigation chevron)

From `mobile_app/assets/welcome/`:
- `welcome_wordmark_cream.png` (centered café branding)

## 3. Files Changed

- `mobile_app/lib/ui/features/profile/screens/profile_screen.dart`: Pixel-accurate V2 redesign with cobalt background, compact cards, horizontal storefront, and streamlined actions.
- `mobile_app/lib/ui/navigation/main_screen.dart`: Cobalt blue background for Profile tab (`currentIndex == 3`) with light status bar overlay.
- `mobile_app/test/profile_screen_ui_test.dart`: Updated and verified 10/10 widget tests for the V2 layout.
- `mobile_app/docs/PROFILE_UI_REDESIGN_REPORT.md`: Updated documentation.

## 4. Verification

- `dart format`: Formatted cleanly.
- `flutter analyze`: **0 issues found** (Clean).
- `flutter test test/profile_screen_ui_test.dart`: **10 / 10 passed**.
- Full test suite (`flutter test`): **87 / 87 passed** (0 regressions).
- `git diff --check`: Passed with 0 whitespace issues.
- `graphify update .`: Knowledge graph updated.
