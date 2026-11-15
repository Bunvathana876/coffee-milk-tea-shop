# Brew & Boba Café — FIX ACTUAL FLUTTER HOME UI (Uploaded Assets)

You are a senior Flutter UI engineer working IN my local project:
`/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`
App: `mobile_app/`.

## User intent
Fix the existing Home screen, not a mockup. I supplied exact banner_1.png, banner_2.png, banner_3.png and a ZIP of distinct category icons. An installation kit containing these actual images and two optional presentation widgets has been extracted into this repo.

### IMPORTANT root causes visible in screenshots
1. The current hero overlays a Flutter heading, subtitle and CTA on top of images which ALREADY have baked-in brand names and promotional text. This creates collisions and unreadable banner text. REMOVE EVERY OVERLAY: do not show Text, ElevatedButton, CTA, gradient, or additional logo on top of these complete images.
2. The category icons look identical because a single generic hot-coffee icon is being reused for Coffee, Milk Tea, Fruit Tea and Smoothies. Use the correct supplied asset based on the actual backend category NAME. Preserve real category IDs and tap/filter actions.
3. A floating bottom navigation bar overlaps featured product cards while scrolling; add adequate content bottom padding and keep the same destinations and cart badge.
4. Improve vertical rhythm: the wordmark consumes too much height, large blank gaps separate banners/categories, and text at the status bar is dark on cobalt; apply readable light status icons while respecting platform behavior.

## Asset paths (already installed from kit)
Banners (full artwork containing text):
- `mobile_app/assets/home_refresh/banners/banner_01.png`
- `mobile_app/assets/home_refresh/banners/banner_02.png`
- `mobile_app/assets/home_refresh/banners/banner_03.png`

Icons (original user-supplied artwork, trimmed of transparent margins):
- `mobile_app/assets/home_refresh/categories/coffee.png`
- `mobile_app/assets/home_refresh/categories/milk_tea.png`
- `mobile_app/assets/home_refresh/categories/fruit_tea.png`
- `mobile_app/assets/home_refresh/categories/smoothies.png`
- `mobile_app/assets/home_refresh/categories/matcha.png`

Optional supplied presentation components (inspect before integrating):
- `mobile_app/lib/ui/features/menu/widgets/brand_banner_carousel.dart`
- `mobile_app/lib/ui/features/menu/widgets/brand_category_icon.dart`

## Phase 1 — inspect the real LOCAL code
Read AGENTS.md and applicable project instructions. Run `git status -sb`. Inspect `mobile_app/lib/ui/features/menu/screens/menu_screen.dart`, current banner widget, category row widgets, `mobile_app/lib/ui/navigation/main_screen.dart`, themes, real backend category model/ShopProvider, app asset registration, and related widget tests.
DO NOT overwrite unrelated uncommitted changes. Do not assume GitHub's remote view reflects current local files.

## Phase 2 — install/register assets
Use the exact uploaded files above. In `mobile_app/pubspec.yaml`, add asset directory declarations if absent:
```
flutter:
  assets:
    - assets/home_refresh/banners/
    - assets/home_refresh/categories/
```
MERGE with existing assets instead of replacing current entries. Avoid any package additions; PNGs load with standard Image.asset.

## Phase 3 — fix carousel professionally
Integrate `BrandBannerCarousel` or adapt it to the existing architecture. Swipe 3 banners and show accurate active indicator dots. Each banner is a complete user-supplied image with embedded title/brand/artwork, and MUST be displayed as a single image with rounded corners on cream backing.
Use `BoxFit.contain` and a responsive ratio (2.0 is a safe common viewport) so that NOTHING is cropped, including text. Existing banner text and buttons must be deleted from its Stack. Avoid separate promo CTA layers, duplicative heading/subtitle, and fake discounts. If making the entire banner tappable, wire to a real existing menu/category destination; otherwise omit tap behavior. Do not hardcode fake promotions.

## Phase 4 — category icons
Use `BrandCategoryIcon(categoryName: <actual backend category name>)`, or implement equivalent. Map names rather than using an array index or a shared coffee fallback. The specific uploaded icons are coffee, milk_tea, fruit_tea, smoothies, matcha. Keep the displayed categories driven by real server data and preserve selection IDs/filtering behavior. Unknown categories may use a tasteful fallback only for the unknown category. Icons already include a cream rounded-square tile, so don't add a second cream square behind them. Fit icons neatly ~64-76 logical pixels with readable category labels and horizontal scrolling at narrow widths.

## Phase 5 — layout and bottom navigation
Preserve the approved cobalt/cream aesthetic: Cobalt #1345A3, Cream #FFF8DF, Butter #F5E4AD, Navy #17294D, White #FFFFFF. Keep login/Welcome unchanged.
Reduce excessive header height while retaining centered logo, search field and avatar; add balanced vertical spacing to greeting/carousel/category/featured products. Retain real product data, real USD/KHR calculations, loading/error states and customization flow. Avoid hiding the product cards under floating bottom nav. Ensure SafeArea/scrolling/bottom padding for small phones and large text. Set system status icon contrast for blue background (Android light icons, iOS appropriate brightness).
Keep four existing navigation destinations from local code, tab persistence and cart badge; don't invent routes or change auth flow.

## Phase 6 — validate
Run inside mobile_app:
```
flutter pub get
flutter analyze
flutter test
```
Also run `git diff --check` from repo root, review all modified files, and add focused widget tests for page swiping, category asset mapping, scroll under bottom nav, and no duplicate banner overlay.
If simulator is accessible, launch it and verify no crashes; DO NOT capture screenshots automatically. I will send manual screenshots for review.

DO NOT touch backend/, frontend/, management-portal/, API contracts, Provider business logic, payments, orders, database, or cloud. DO NOT reset, commit, push or deploy automatically.

Deliver `mobile_app/docs/HOME_UI_ASSET_REPLACEMENT_REPORT.md` with changed paths, real asset mapping, test results, any remaining manual visual QA, and limitations. Implement the actual code rather than only a plan.
