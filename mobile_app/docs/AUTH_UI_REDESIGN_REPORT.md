# Authentication UI consistency redesign

## Files modified

- `lib/ui/features/auth/screens/auth_screen.dart`: Sign Up and Forgot Password presentation only. Login's layout and behavior remain unchanged.
- `test/signup_reset_ui_test.dart`: focused form, navigation, loading, viewport, keyboard, and text scaling checks.
- This report.

The existing uncommitted work in other files was preserved. Running `dart format lib test` also formatted the generated OpenAPI model; that unrelated formatting was restored immediately.

## Assets and layout

Both redesigned screens reuse Login's `assets/login/login_wordmark_cream.png` at its 140dp preferred height. Sign Up uses `assets/auth/mascot_signup_thumbs_up.png`; Forgot Password uses `assets/auth/mascot_forgot_boba_toast.png`. Images use `BoxFit.contain` and responsive height limits, preserving their proportions.

The two screens now share Login's cobalt background, cream text and outlines, 24dp horizontal inset, 24dp input corner radius, 16dp field spacing, 52dp default button height, and top back navigation. Sign Up and Forgot Password use the existing `CustomButton` where active. A small presentation helper keeps the unavailable reset button cream and readable while disabled. The screens scroll inside SafeArea when content, keyboard, errors, or text scaling need more height.

## Authentication behavior

Sign Up still calls `UserProvider.register` with the same payload and session behavior. The backend requires phone, so the phone field and its existing validation remain. Name, optional email, password length, password confirmation, visibility controls, loading, errors, and success navigation remain.

The backend exposes customer registration and login but has no customer password-reset endpoint. Forgot Password makes no recovery request, keeps Send Reset Link disabled, and states that no email will be sent. Its back controls return to Login.

## Verification

- Baseline `flutter analyze` and `flutter test`: passed (36 tests).
- `dart format lib test`: completed; unrelated generated model formatting restored.
- Final `flutter analyze --no-pub`: passed.
- Final `flutter test --no-pub`: passed (38 tests).
- `flutter run --no-pub` launched successfully on the iPhone 17 Pro simulator (iOS 26.1); a Dart VM service was available. Navigation was exercised in widget tests, not manually tapped in the simulator.
- Widget tests cover 320, 360, 390, and 430dp Sign Up widths, validation, password visibility, phone payload, loading, Login navigation, unavailable recovery, and 320dp keyboard scrolling with 1.5× text.

## Remaining limitations and manual checks

The reference image shows four sign-up inputs; the working API requires a fifth phone input. No licensed Fredoka or Plus Jakarta Sans font files are present in the project; the wordmark artwork supplies its own lettering and other text uses the platform font. Compare the screens manually on device, including notch, keyboard, validation errors, and larger accessibility text. Screenshots were not captured automatically.
