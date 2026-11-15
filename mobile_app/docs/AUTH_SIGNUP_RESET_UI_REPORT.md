# Sign Up and Forgot Password UI report

## Files modified

- `lib/ui/features/auth/screens/auth_screen.dart`: branded sign-up and forgot-password views, shared visual helpers, login links.
- `pubspec.yaml`: registered supplied auth images and icons.
- `test/signup_reset_ui_test.dart`: focused form, navigation, and small-screen tests.
- This report.

Existing unrelated working-tree changes were preserved.

## Assets and fonts

Registered `assets/auth/`, including `wordmark_cream.png`, `mascot_signup_thumbs_up.png`, `mascot_forgot_boba_toast.png`, and `icons/`. Both mascots use their distinct supplied transparent PNG with `BoxFit.contain`.

The UI specifies Fredoka for headings/buttons and Plus Jakarta Sans for form text. No licensed font files are present in the project, so Flutter uses its platform fallback until those font files are supplied and registered.

## Screens and authentication behavior

Sign Up uses live form controls, existing validation, separate password visibility buttons, loading/error states, and the existing `UserProvider.register` flow. Successful registration retains its current account/session behavior. The backend requires a phone number, so the screen includes a phone field in addition to the four reference fields. Email remains optional under the existing API contract.

Forgot Password uses the supplied boba-toast mascot and has a working return link. The customer backend exposes registration and login but no customer password-reset endpoint. The reset button is disabled and the screen explicitly says that no email will be sent. No recovery request is fabricated.

## Verification

- Baseline `flutter analyze`: passed.
- Baseline `flutter test`: passed, 30 tests.
- `flutter pub get`: passed.
- Final `flutter analyze --no-pub`: passed.
- Final `flutter test --no-pub`: passed, 36 tests.
- Focused `flutter test --no-pub test/signup_reset_ui_test.dart`: passed, 6 tests.
- iOS simulator build (`flutter build ios --simulator --no-codesign --no-pub`): passed.
- Widget tests exercise validation, visibility, API field forwarding, navigation, unavailable recovery, and 320, 360, 390, and 430dp layout and scrolling.

## Manual visual checks remaining

Compare both screens to the approved images on 320, 360, 390, and 430dp devices, including notch, keyboard, and enlarged text. Confirm real-device font appearance after licensed Fredoka and Plus Jakarta Sans files are provided. Capture screenshots manually as requested.

## Login visual follow-up

Removed the decorative cloud icons beneath the Login links. Sign Up and Forgot Password now use Login-sized fields, matching outline radius and spacing, and the same shared `CustomButton` sizing. `flutter analyze --no-pub` and all 36 tests passed after this change.
