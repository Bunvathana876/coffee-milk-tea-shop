# ☕ Brew & Boba — Customer Mobile Application (Flutter)

A clean, production-grade Flutter mobile application for **Brew & Boba Café** customers to browse drinks, customize drink options (Cup Size, Sweetness %, Ice Level, Quantity), manage their order bag, place orders, and track order status in real time.

Built with Flutter, Provider, and Material 3. The menu loads from the café API, while failed order submissions retain a local retry key.

---

## 📁 Clean Folder Structure

The project is structured into clear, decoupled layers so you can easily modify or add code anytime:

```text
mobile_app/lib/
├── main.dart                          # App entry point, Provider tree, theme bootstrap
│
├── core/                              # Central configurations, theme, and common utilities
│   ├── config/
│   │   └── app_config.dart            # API URL, USD/KHR exchange rates, sizes, sugar & ice options
│   ├── theme/
│   │   ├── app_colors.dart            # Espresso brown, boba caramel, matcha green palettes
│   │   ├── app_typography.dart        # Clean, scalable font styles
│   │   └── app_theme.dart             # Material 3 light theme (rounded cards, buttons, nav bar)
│   ├── utils/
│   │   ├── currency_formatter.dart    # Formats USD ($2.50) and KHR (10,250 ៛)
│   │   └── date_formatter.dart        # Friendly relative ("5m ago") & full timestamps
│   └── widgets/                       # Reusable UI components
│       ├── custom_button.dart         # Primary/Secondary button with loading spinners
│       ├── status_badge.dart          # Status pills (Received, Preparing, Ready, Completed)
│       └── empty_state.dart           # Clean illustrations when list/bag is empty
│
├── data/                              # Data layer (API, Storage, Models, Repositories)
│   ├── models/
│   │   ├── category_model.dart        # Category data class
│   │   ├── product_model.dart         # Drink data class with prices & availability
│   │   ├── cart_item_model.dart       # Line item with customizations & unit price calculation
│   │   └── order_model.dart           # Complete order schema matching backend API
│   ├── services/
│   │   ├── api_service.dart           # HTTP client connecting to the Express backend
│   │   └── local_storage_service.dart # SharedPreferences wrapper for saving profile & cart
│   └── repositories/
│       ├── shop_repository.dart       # Fetches categories & products from the API
│       └── order_repository.dart      # Places orders, phone lookup, order tracking polling
│
├── providers/                         # State Management (ChangeNotifier ViewModels)
│   ├── shop_provider.dart             # Menu catalog, active category filter, live search
│   ├── cart_provider.dart             # Persistent bag, item quantity +/- controls, totals
│   ├── order_provider.dart            # Order placement, live status polling, history lookup
│   └── user_provider.dart             # Customer profile (name, phone), custom API host
│
└── ui/                                # Presentation Layer
    ├── navigation/
    │   └── main_screen.dart           # BottomNavigationBar with dynamic bag counter badge
    └── features/
        ├── menu/                      # Explore drinks, category pills, drink customizer bottom sheet
        │   ├── screens/menu_screen.dart
        │   └── widgets/
        │       ├── category_chip.dart
        │       ├── product_card.dart
        │       └── product_detail_sheet.dart
        ├── cart/                      # Order bag & checkout
        │   ├── screens/cart_screen.dart
        │   └── widgets/
        │       ├── cart_item_tile.dart
        │       └── checkout_sheet.dart
        ├── orders/                    # Live order status tracker & phone history lookup
        │   ├── screens/
        │   │   ├── order_history_screen.dart
        │   │   └── order_tracking_screen.dart
        │   └── widgets/
        │       └── order_card.dart
        └── profile/                   # Customer details & backend connection settings
            └── screens/profile_screen.dart
```

---

## 🚀 How to Run the App

### Run from VS Code

Open either the project root or `mobile_app` in VS Code. Install the Dart and Flutter extensions, choose **Brew & Boba Café (iOS Simulator)** in **Run and Debug**, then press **F5** (or the green Run button). The launch profile starts the iOS simulator and passes the local café API URL automatically. Choose **Brew & Boba Café (Android Emulator)** for the Pixel 5 emulator. The backend must be running on host port `8003` first.

### 1. Run on Connected Device, Simulator, or Browser

From the `mobile_app` directory:

```bash
cd mobile_app

# Run on macOS desktop:
flutter run -d macos

# Run on Google Chrome:
flutter run -d chrome

# Run on Android Emulator:
flutter run -d android

# Run on iOS Simulator:
flutter run -d ios
```

### 2. Run Tests & Linter

```bash
# Run static analysis (0 warnings / 0 errors):
flutter analyze

# Run unit & widget test suite:
flutter test
```

---

## 🔌 Connecting with the Express Backend

1. **Start the backend** in the root workspace:
   ```bash
   cd ../backend
   npm run dev
   ```
   The standalone backend defaults to host port `8003`. Docker Compose maps its internal port `8000` to host port `8001` by default; when using Compose, pass `--dart-define=BREW_BOBA_API_URL=http://127.0.0.1:8001` on the iOS simulator (or `http://10.0.2.2:8001` on the Android emulator). Check `/api/health` on the selected host port before launching the app.
2. **API Host Settings**:
   - **Android Emulator**: Uses `http://10.0.2.2:8003` in development.
   - **iOS Simulator / macOS / Chrome**: Uses `http://127.0.0.1:8003` in development.
   - A valid saved custom URL overrides the development default. The old saved `localhost:8000` address is ignored because that port serves another local API; the preference remains stored. Pass `--dart-define=BREW_BOBA_API_URL=http://127.0.0.1:8003` to select the café API explicitly.
   - **Physical Devices**: Set `BREW_BOBA_API_URL` to the computer's reachable Wi-Fi address and backend port (for example, `--dart-define=BREW_BOBA_API_URL=http://192.168.1.15:8003`).
   - **Release builds**: Set an explicit API URL with `--dart-define=BREW_BOBA_API_URL=https://your-api-host`. A new release installation has no localhost fallback.

> **Offline behavior**: The menu requires the café API and shows a retry state when it cannot load. A failed or timed-out checkout keeps the cart and a retry key, and shows a local estimate only. It does not create an order reference, payment confirmation, or server loyalty credit.

---

## 🎨 How to Customize the Code

- **Change Theme & Colors**: Edit `lib/core/theme/app_colors.dart` to tweak brand colors (Espresso, Matcha, Caramel).
- **Change Drink Sizes & Sugar/Ice Options**: Edit `lib/core/config/app_config.dart`.
- **Add New Drink Categories or Products**: Update the café database through the management API.
- **Tweak UI Screens**: Browse directly into `lib/ui/features/[feature_name]/screens/`.
