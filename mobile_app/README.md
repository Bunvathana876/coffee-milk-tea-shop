# ☕ Brew & Boba — Customer Mobile Application (Flutter)

A clean, production-grade Flutter mobile application for **Brew & Boba Café** customers to browse drinks, customize drink options (Cup Size, Sweetness %, Ice Level, Quantity), manage their order bag, place orders, and track order status in real time.

Built following **Clean Architecture (MVVM & Repository Pattern)** with Flutter, Provider, Material 3, and full offline resilience.

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
│       ├── shop_repository.dart       # Fetches categories & products (with automatic offline fallback!)
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
2. **API Host Settings**:
   - **Android Emulator**: Uses `http://10.0.2.2:8001` in development.
   - **iOS Simulator / macOS / Chrome**: Uses `http://localhost:8001` in development.
   - **Physical Devices**: Use **Profile → Configure API Host** with the computer's reachable Wi-Fi address and backend port (for example, `http://192.168.1.15:8001`).
   - **Release builds**: Set an explicit API URL with `--dart-define=BREW_BOBA_API_URL=https://your-api-host`. A new release installation has no localhost fallback.

> **Offline behavior**: The catalog may use local fallback data. A failed or timed-out checkout keeps the cart and a retry key, and shows a local estimate only. It does not create an order reference, payment confirmation, or server loyalty credit.

---

## 🎨 How to Customize the Code

- **Change Theme & Colors**: Edit `lib/core/theme/app_colors.dart` to tweak brand colors (Espresso, Matcha, Caramel).
- **Change Drink Sizes & Sugar/Ice Options**: Edit `lib/core/config/app_config.dart`.
- **Add New Drink Categories or Fallback Items**: Edit `lib/data/repositories/shop_repository.dart`.
- **Tweak UI Screens**: Browse directly into `lib/ui/features/[feature_name]/screens/`.
