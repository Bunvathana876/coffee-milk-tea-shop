# BREW & BOBA CAFÉ — HOME SCREEN UI + 3 BANNERS + ICONS

## YOUR ROLE
Act as a principal Flutter engineer and mobile UI/UX designer. Implement the approved home screen in real Flutter widgets; do not recreate the preview as one large screenshot.

## PROJECT
Root: `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`
Target application: `mobile_app/`
Design reference provided in this kit: `mobile_app/design_references/home/home_approved.png`

## PRIMARY GOAL
Make the **mobile Home/Menu screen** resemble the approved cobalt, cream, butter, navy and white home screenshot. Use this asset kit's **three distinct banner artworks** and **13 original icon designs**. Keep all existing user/session, catalog, cart, checkout, and API behavior working. This task concerns Home/Menu presentation only; do not redesign Login, Sign Up, Forgot Password, Cart, Checkout, Orders, Profile, backend, management portal, or the website.

## STEP 1 — INSPECT + PROTECT
1. Read `AGENTS.md`, local project instructions, and `git status -sb` before editing; preserve unrelated changes.
2. Find the actual current Home/Menu screen, navigation (`mobile_app/lib/ui/navigation/main_screen.dart` if present), search widgets, product cards, providers, model classes, theme tokens and `pubspec.yaml`.
3. Identify which 4 tabs currently exist, how search and category filters work, and whether backend provides a credible bestseller ranking.
4. Run baseline `flutter analyze` and `flutter test` from `mobile_app/`. Note existing failures.
5. Inspect the real `home_approved.png` and the art-only banner files in `mobile_app/assets/home/banners/`; never assume file paths without checking.

## STEP 2 — DESIGN SYSTEM
Use only these main brand colors (derive accessible lighter/darker states as needed):
- Cobalt `#1345A3` (page background, active UI)
- Cream `#FFF8DF` (search, cards, banner base)
- Butter `#F5E4AD` (small decorative accents)
- Navy `#17294D` (bottom navigation/background and dark text on cream)
- White `#FFFFFF` (text/icons on cobalt)

Reuse the existing actual brand wordmark rather than rebuilding it from generic text if the wordmark asset already exists. Preserve licensed app fonts, preferably existing Fredoka/Plus Jakarta Sans or a suitable installed fallback. Respect accessibility and text contrast.

## STEP 3 — HEADER
Match the image structure:
- Top safe-area followed by centered BREW & BOBA café wordmark.
- No hamburger menu.
- Rounded cream search control plus circular avatar/brand mascot control; make them actually interactive using existing search/profile navigation.
- Bold greeting 'Good morning, <customer name>' only if supported by real user state, with safe fallbacks for guests/empty names; use an accurate time-of-day greeting if the app already supports it.
- Maintain generous breathing room but avoid scrolling too far before the menu.

## STEP 4 — 3-IMAGE BANNER CAROUSEL
Use the **ART-ONLY** images (not the preview files) from this kit:
```
assets/home/banners/banner_01_boba_art.png
assets/home/banners/banner_02_coffee_art.png
assets/home/banners/banner_03_treats_art.png
```
Each PNG is a 1400×600 RGBA illustration in a consistent cream / cobalt hand-drawn style. They intentionally **do not contain the text or CTA**, so Flutter must render accessible, responsive live text and a genuine `onPressed` button on top, e.g. via Stack + constraints/layout; don't flatten the card into a non-clickable image. Keep the image at approximate aspect ratio 7:3 and apply proper ClipRRect (not BoxFit.cover clipping off the characters).

Carousel copy and actions (see `banner_manifest.json`):
1. 'Fresh Brew, Happy You!' — 'Your everyday café moment' — CTA 'Explore Menu'; route to the working existing catalog/menu action.
2. 'Coffee Time, Your Way' — 'A little joy in every cup' — CTA 'Explore Coffee'; filter the existing actual coffee category **only if its real ID is available**, otherwise navigate to the catalog rather than inventing filters.
3. 'Sweet Moments Start Here' — 'Coffee, boba & sweet treats' — CTA 'Discover More'; route to a real catalog/menu destination, not a fake promotions page.

Each banner has a different mascot pose and product illustration. No invented discounts, free items, loyalty perks, or fake ordering functionality. Provide indicator dots matching the design. Add manual swipe gestures/PageView; optionally subtle auto-scroll only if UX doesn't disrupt interaction, and dispose controllers. Support screen readers, reduced motion, no infinite timers that leak. Place copy in the central reserved safe area, but adapt text size, visibility, and positioning to shorter widths without overflow. If the art becomes too cramped on small phones, stack a compact text/CTA row below the image, keeping artwork visible.

## STEP 5 — CATEGORIES
Use icons from `assets/home/icons/png/` (or use existing Material icons if it leads to better accessibility; this kit also includes SVG source):
- `hot_coffee.png`, `iced_coffee.png`, `frappuccino.png`, `desserts.png`, `tea.png`

Use five cream square-ish rounded tiles with cobalt icons and readable white labels on the blue background as in the reference screenshot. Make the row horizontally scrollable on small screens. **Render actual API categories:** icon mapping by category semantics; if some example categories don't exist, display only real categories and use fallbacks. Each tile filters/navigates to the actual existing category behavior, with a clear active state. 'View all' navigates to the real full menu.

## STEP 6 — BEST SELLING / CATALOG CARDS
Use real catalog data, real product imagery, genuine server-compatible prices (USD/KHR as the app currently uses), availability, and a working plus/customize action. Design compact cream rounded rows: thumbnail left, name and short description, actual formatted price, cobalt plus button right. Use the approved screenshot as spacing/typography inspiration, **not as a data source**: its example item names and prices are illustrative and must not be hardcoded.

Only call the section 'Best Selling' if the backend actually supplies credible bestselling ordering. Otherwise, use a truthful label such as 'Featured Drinks'/'Explore Drinks' and report that decision. If the product needs customization before cart addition, the plus button must open the real existing customization UI, not silently add invalid defaults. Keep loading/empty/error/retry states and never show invented catalog products.

## STEP 7 — BOTTOM NAVIGATION
Preserve the existing destinations and their actual semantics, e.g. Menu/Home, Orders, Bag/Cart, Profile, according to the current MainScreen. Style the bar as a **floating dark navy pill** with four evenly spaced cream outline icons and a **cream circular active-tab background**. Use the supplied home/orders/bag/profile icons as appropriate; do not confuse destination semantics merely to replicate the sample cup symbol. Add cart badge if already provided by state. Keep tappable targets ~44–48dp, accessibility labels, SafeArea, tab state, and the existing IndexedStack behavior.

## STEP 8 — REUSE ICONS AND AVATAR SAFELY
Register `assets/home/banners/` and `assets/home/icons/png/` in pubspec.yaml. PNGs are production-ready for Image.asset; SVGs are editable references but should not force adding flutter_svg dependency if not already installed. `avatar_boy.png` is an optional matching transparent circle avatar, only use if it does not override an actual user avatar setting. Reuse any existing app wordmark rather than copying new logos. Do not add unused assets to pubspec.

## STEP 9 — RESPONSIVE AND QUALITY
Check 320dp, 360dp, 390dp, 430dp widths and landscape/tablet where practical; keyboard focus, long/localized labels, large font/text scaling, SafeArea insets, scrolling under the bottom navigation, image crop, poor connection and sold-out products. Support loading, empty, error/retry states. Use stable widget keys and concise presentation components. Fix visual overlaps, avoid rigid screenshot dimensions and heavy animations. Text, prices and controls must be selectable, accessible real widgets, not baked into PNGs.

## STEP 10 — STRICT NON-GOALS
Do not edit `backend/`, `frontend/`, `management-portal/` or cloud config. Do not change auth, cart/order/payment logic, database, migrations, Provider state contracts, API endpoints, product prices, or navigation destinations. Do not introduce fake rankings, purchases or discounts. Do not add a hamburger menu, Popular Drinks section or Special Offer section: the banner carousel itself is enough. Do not automatically capture screenshots, commit, push, deploy, or run database migrations. Keep existing uncommitted work safe.

## STEP 11 — TEST + REPORT
- Run `dart format` only on relevant changed Dart files (avoid formatting unrelated generated code).
- Run `flutter analyze` and `flutter test` from `mobile_app/`.
- Add targeted widget tests for carousel page changes, CTA navigation, search, real category filtering, bestseller loading/empty/error state, product plus/customization action, bottom nav behavior and small-screen overflow. Mock data in tests only, not production widgets.
- If a simulator is available, verify startup/navigation, but **do not capture screenshots automatically**. I will provide manual screenshots.
- Run `git diff --check`, inspect file list and confirm changes are presentation/assets-only.
- Write `mobile_app/docs/HOME_UI_IMPLEMENTATION_REPORT.md` with changed files, actual routes/Provider use, banners and icons installed, unsupported features omitted, tests, and manual QA checklist.

## SUCCESS CRITERIA
An original, premium Brew & Boba cobalt-and-cream home screen visually matching my approved reference screenshot with a responsive 3-slide illustrated carousel, real search/categories/products, correct bottom navigation, and all existing business logic preserved. Implement the code now; do not stop at a plan.
