# Welcome screen implementation

Created `lib/ui/features/welcome/welcome_screen.dart` and `test/welcome_test.dart`. Modified `lib/main.dart` and `pubspec.yaml` to register the two required artwork files and make WelcomeScreen the startup route.

The extracted kit was found in Downloads and its required files were already present under `assets/welcome/`. Reused `welcome_mascot.png` and `welcome_wordmark_cream.png` without overwriting them. The optional cobalt wordmark and launcher icon were not changed. The full mockup is not used as an interface asset.

The layout uses the official cobalt background, cream wordmark, contained walking mascot, live two-line tagline, and cream-outline pill buttons. SafeArea, constrained artwork, wrapping buttons and a scrollable layout accommodate short screens. Brand lettering is preserved in the supplied wordmark. Tagline uses an italic system fallback; buttons use system semibold. Patrick Hand and Plus Jakarta Sans are not bundled, so typography is not an exact font match. No font dependency was introduced.

Menu replaces the welcome route with the existing MainScreen. The MultiProvider tree remains above MaterialApp, and provider construction, storage, authentication, API configuration and cart restoration code are unchanged. No deep-link route configuration existed in main.dart. Welcome appears on a fresh app startup, not on tab changes or returning from order details. Bookings is disabled with an explicit Coming soon label because no working bookings feature was found.

Validation: flutter pub get succeeded; flutter analyze reported no issues; all 29 tests passed. The welcome widget test verifies image decoding/rendering, disabled Bookings, menu callback route replacement, and layouts at 320, 360, 390 and 430dp. Existing customer behavior tests remain intact. git diff --check passed.

Manual review: compare artwork proportions to the approved mockup; check large text, short landscape screens, VoiceOver/TalkBack, safe areas, and the transition into a restored customer/cart session. No screenshots were captured. No backend, provider business logic, launcher icon, cloud service or customer records were modified.

The iOS simulator build succeeded: build/ios/iphonesimulator/Runner.app. Runtime visual verification was not performed because no simulator was connected during the launch attempt.
