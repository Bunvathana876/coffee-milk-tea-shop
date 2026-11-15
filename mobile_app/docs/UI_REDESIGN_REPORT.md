# Flow 2 — Brew & Boba UI redesign

## Reference analysis
Inspected `design_references/layout.jpg` and `brand-colors.png` directly. Flow 2 uses a search-first menu, category pills, circular drink photography, a navy product header, cream customization panel, illustrated cup sizes, compact cart cards, structured checkout, and a minimal thank-you screen. The delivery maps, milk variants, coupons, payment brands and reward points in the reference are not supported additions to this app.

## Palette
The existing theme retains cobalt #1345A3, cream #FFF8DF, butter #F5E4AD, navy #17294D and white. Existing supporting colors provide borders, secondary text and status feedback. No package or font dependency was added.

## Components and screens
- Menu: removed the oversized promotional hero and editorial heading; retained the brand/greeting, real product search, category filters, offline notice, refresh and cart access.
- ProductCard: circular catalog photography, centered drink name, category, USD/KHR prices, compact circular customization action, favorites and unavailable state. Grid adapts from one column on very narrow phones to two columns and then three on tablets.
- ProductDetailSheet: navy upper photo area with back control, large circular image, rounded cream lower panel, cup icons for supported sizes, existing sugar/ice/toppings/quantity controls and per-cup breakdown. Selection animation respects reduced motion.
- Cart: heading is now Your Order; existing white rounded item cards, quantity/removal controls, dual-currency subtotal and sticky checkout continue.
- Checkout: cream sheet, clear customer-information heading, pickup information, payment selection, item review and server-confirmed total disclosure. KHQR remains DEMO ONLY.
- Confirmation: new OrderConfirmationScreen displays Thank You, original Brew & Boba artwork, actual order reference, fulfillment badge and separate payment badge. View Order opens the existing tracking screen. The screen is reached only through the existing successful parsed-server-response branch.
- Orders/Profile/navigation: retained the previously refined white cards, real status progress, retry, account fields, working order-history shortcut, logout, and rounded floating four-destination navigation with bag count and IndexedStack state.

## Preserved behavior
No providers, repositories, API contracts, authentication logic, pricing calculations or models were changed. The only checkout flow change is the presentation destination after the existing confirmed response: confirmation first, then tracking. Cart clearing, pending-order recovery and idempotency remain in their existing paths. No backend, website, management portal, cloud service or order records were edited.

## Assets
Reused bundled Brew & Boba cup/mascot assets and existing catalog image URLs. Circular cropping uses the existing photographs; transparent product cutouts were not fabricated. Reference images are not embedded in the UI.

## Verification
Baseline analysis was clean and all 27 baseline tests passed. Analysis after implementation was clean. Existing card tests cover 320, 360, 390, 430 and 600 logical pixels and 1.3× text scaling. A new widget test verifies selecting Large and adding preserves the selected size and product ID. Final suite and simulator results are recorded below.

The requested `dart format lib test` was run. Its unrelated generated-model formatting was reverted to preserve the generated source; all edited UI and test files are formatted. `git diff --check` passed.

## Manual visual QA and limitations
No screenshots were captured. Automated width tests cover product cards, not every complete screen. Review menu image cropping, long names, floating navigation spacing, customization scrolling and the sticky footer at 320/360/390/430dp and tablet sizes. Check checkout with the keyboard open, validation, empty/loading/offline states, large accessibility text and VoiceOver/TalkBack. Use a disposable test account to review the confirmed-order screen and View Order navigation; no real order or payment was submitted here. System fonts remain the existing fallback. Milk, delivery maps, couriers, coupons and external payment methods were intentionally not introduced.

## Final test results and changed files
All 28 tests passed, with no skipped tests or remaining failures. Flutter analysis reported no issues. The new interaction test retains its assertions on the selected size and product identity.

This Flow 2 pass changed `menu_screen.dart`, `product_card.dart`, `product_detail_sheet.dart`, `cart_screen.dart`, `checkout_sheet.dart`, and `test/widget_test.dart`; added `order_confirmation_screen.dart`; and updated this report. Existing worktree changes from earlier passes were preserved. Graphify was refreshed according to project instructions.

Simulator result: the final app built and launched successfully on iPhone 17 Pro (exit code 0). This verifies startup, not manual screen appearance or real authenticated checkout. No screenshots were captured.
