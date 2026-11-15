# AGY / ANTIGRAVITY — BREW & BOBA CAFÉ · YOUR ORDERS V4

You are an expert Flutter mobile engineer and production UI/UX designer. **Implement** the Orders screen in my actual codebase; do not respond with just mockups or a plan.

**Repository:** `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`
**Flutter app:** `mobile_app/`
**Primary visual specification:** `REFERENCE_TARGET_ORDERS.png`, attached in AGY and also inside this asset kit. This screenshot is a target illustration; recreate the actual layout with responsive Flutter widgets.
**Asset folder:** `mobile_app/assets/images/orders_v4/`

## Before changes
1. Read repository instructions and Git status; preserve all unrelated uncommitted changes.
2. Find the actual route/widget for Your Orders and the current root bottom navigation shell, auth provider, orders repository/API service, order model and order statuses. Identify the real names/paths instead of assuming they exist.
3. Inspect Home/Menu/Profile theme tokens and reuse their cobalt, navy, cream, gold, card radius, font scale, spacing and existing wave painter. Avoid introducing competing design systems.
4. Confirm the new assets are physically present; if not, stop and report exactly which files are missing. Do not silently use another graphic or the full screenshot as a background.

## Deliverable: Pixel-faithful Orders screen
Build a polished, visually close implementation of the reference image, with excellent legibility and touch targets. Use these parts:

### A. Cobalt brand header
- Cobalt gradient/solid blue matching the actual Home Screen, with correct status-bar safe area.
- Centered white `BREW & BOBA` branding and smaller script `café` underneath; prefer the existing brand/logo component so it looks identical across screens.
- Left-aligned small white shopping-bag icon `header_bag_white_96.png`, bold heading **Your Orders**, subtitle **Track and check your café orders.**
- On the right, `illustrations/orders_header_barista_512.png`, a friendly smiling café worker with a drink, fully visible and NOT cropped through face or cup.
- Dynamic layered blue/white/cream/gold **waves drawn with an existing Flutter painter or a new small CustomPainter**; avoid stretching the screenshot as a background or using fixed viewport pixels.
- Header should look balanced and compact like the reference, not an oversized empty blue rectangle. On narrow devices, scale illustration and text down before clipping.

### B. Four-stage tracker card
- Rounded cream-white surface overlapping/just below the header transition, with a fine warm border and subtle shadow.
- Exactly four labeled status steps in a single responsive row: **Pending**, **Preparing**, **Ready**, **Completed**.
- Use matching icons in `icons/status_pending_96.png`, `status_preparing_96.png`, `status_ready_96.png`, `status_completed_96.png` (source filenames are exactly `<name>_<size>.png`, e.g. `status_pending_96.png`).
- Under the icons, create a live progress line with four circular markers using Flutter drawing/layout, not a rasterized fixed progress bar. Completed portion amber/gold, remaining portion pale blue-grey; selected marker orange/white.
- **Critical state logic:** For a user with no orders, show the row as an informational preview with all steps inactive/neutral, NOT false “Pending” progress. Only show actual live progress for a selected real order. If multiple orders exist, each order has its own tracker or a clearly selected order; do not merge order statuses.
- Inspect backend status strings / enums and map them to visual steps **without changing** stored statuses. Cancellation, rejection, failure, or refunds must appear separately from Completed (never present a cancelled order as complete). Order status is not payment status.
- Tracker must handle invalid/missing statuses with a neutral fallback and no crash.

### C. Main cream body and empty state
- Background is a soft warm-cream/near-white (#FFF9F0-like), NOT cobalt blue behind the center content.
- When a real authenticated customer has *zero* orders, display `illustrations/no_orders_illustration_800.png`, centered and fully visible via `Image.asset(..., fit: BoxFit.contain)`.
- Heading exactly **No orders yet!** in bold cobalt; centered copy **You haven’t placed any orders.** followed by **Explore our menu and order your favorite drinks!**
- Rounded cobalt-blue filled **Explore Menu** pill CTA containing a white cup icon `ui_cup_white_96.png` and a white right arrow `ui_arrow_right_white_96.png`. Tap must switch to the existing Menu destination, not push a duplicate nested app shell.
- Respect the image's transparent PNG alpha. No clipping, stretch, awkward fixed-height gap, or duplicated cream panels.

### D. Other states MUST work
1. **Guest/unauthenticated:** show an honest sign-in-required state with functioning Sign In action when orders are account-gated; never pretend to have queried orders and found none.
2. **Authenticated loading:** polished skeleton/spinner matching theme, retaining layout where possible.
3. **Authenticated with actual orders:** show real order cards, order date/ID, stored items, amount, actual order status, and real details navigation. Keep existing data fields, business logic, filters, refresh and retry behavior.
4. **Backend/network failure:** informative message and working Retry. Don't show “No orders yet!” for failed requests.
5. **Orders pending/completed/cancelled:** truthful state badges, not made-up ETAs or payment confirmations.
6. Clear distinction between an empty order history and “no active orders” if the current app supports both.

### E. Bottom navigation
- Reuse the app's existing bottom navigation shell. Do NOT add a second navigation bar.
- Dark-navy rounded pill on the warm cream lower background, correct iPhone home-indicator inset.
- Follow the *actual app's* tab count/order. In the target, icons are Home, Orders, Bag, Profile; **Orders is selected (second position)** with cream circular highlight and cobalt receipt glyph. If current navigation differs, preserve the route architecture and make the Orders tab visually selected in its real position without renumbering routes.
- Use new icons only if they integrate cleanly with the shared shell; do not change tabs on other screens unintentionally.

## Responsive/accessibility requirements
- Check iPhone 16e first, then small iPhone / tall iPhone / Android; 200% text scaling should stay usable.
- Dynamic `LayoutBuilder` and constrained width, scrollable content (`CustomScrollView` or similar), pinned/independent navbar when existing architecture requires it.
- Tap targets >= 44 logical px where practical, correct screen-reader labels; images that are decorative must not duplicate spoken content.
- Use `MediaQuery.disableAnimations`/theme preference for reduced motion; avoid animation-only information.
- Maintain readable text against cream and blue backgrounds. No hardcoded pixel recreation of phone frame or system status bar.
- Prefer modular widgets: `OrdersHeader`, `OrderStatusTracker`, `OrdersEmptyState`, `OrderCard` only if sensible in this repository.

## Implementation sequence
1. Back up no files; simply preserve existing Git work and apply narrowly scoped code edits.
2. Ensure assets are in `mobile_app/assets/images/orders_v4/illustrations/` and `.../icons/`; add the **two leaf directories** under the existing `flutter: assets:` key in `pubspec.yaml` (do not duplicate `flutter:`).
3. Build order header and wave in actual Flutter code, then status tracker, empty illustration, CTA, live list, state handling, shared nav compatibility.
4. Verify avatar/barista, bag illustration, and icons load from exact asset names. No HTTP fetching of local icons.
5. Add focused widget/provider tests: guest, authenticated empty, loading, error/Retry, multiple orders, pending/preparing/ready/completed, cancelled, Orders-tab active, CTA navigation, text scaling, narrow layout and correct image loading.
6. Run `dart format` only on changed Dart files, `flutter analyze`, `flutter test`; fix regressions caused by the work.
7. Open app via **existing VS Code F5** setup on iPhone Simulator. Do not ask me to type a new flutter run command. Visual verification is mine unless I supply screenshots; do not auto-capture any.

## Hard restrictions
- UI/asset scope only. **Do not modify** Node/Express backend, PostgreSQL, Neon, Cloudinary, checkout, order creation, auth security, existing order statuses or payments.
- Do not seed fake orders, prices, loyalty, or customer details; do not call production APIs for testing.
- Do not reset devices, clear stored accounts/carts, deploy, commit, push, or install unrelated plugins.
- Don't make app-wide theme/navbar changes that silently alter other screens. Test shared widgets when changing them.
- Do NOT claim pixel-perfect visual matching without inspecting a real rendering; report what remains for manual review.

## Final output
Report (a) root causes of current mismatch, (b) precise widgets/files modified, (c) verified asset paths, (d) empty/guest/real-order states, (e) order status mapping and cancellation handling, (f) full test command/results, and (g) any remaining screenshot-based adjustments.

**The finished screen should feel like the provided target: a cobalt café-branded header with smiling barista and cream/gold wave, compact four-step order tracker, large cream bag-and-boba empty illustration, bold readable text, solid cobalt CTA, and a dark-navy navbar with Orders selected — all powered by real application state.**
