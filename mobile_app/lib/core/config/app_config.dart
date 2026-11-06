import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

/// Global application configuration and constants.
/// You can easily tweak defaults, API base URLs, exchange rates, and business rules here.
class AppConfig {
  AppConfig._();

  /// Café branding
  static const String appName = 'Coffee Cute';
  static const String appTagline = 'Handcrafted Drinks & Artisan Boba';
  static const String currencyUsdSymbol = '\$';
  static const String currencyKhrSymbol = '៛';

  /// Exchange rate: 1 USD to Cambodian Riel (KHR)
  static const double khrExchangeRate = 4100.0;

  /// Supply BREW_BOBA_API_URL with --dart-define for production or a device host.
  /// Development fallback depends on platform:
  /// - Android Emulator uses `10.0.2.2` to refer to host machine localhost
  /// - iOS Simulator, macOS, Windows, and Web use `localhost` (or `127.0.0.1`)
  static String get defaultApiBaseUrl {
    const configured = String.fromEnvironment('BREW_BOBA_API_URL');
    if (configured.isNotEmpty) {
      final parsed = Uri.tryParse(configured);
      if (parsed == null || !['http', 'https'].contains(parsed.scheme) ||
          parsed.host.isEmpty || parsed.userInfo.isNotEmpty) {
        throw StateError('BREW_BOBA_API_URL must be a full HTTP or HTTPS URL.');
      }
      return configured.replaceFirst(RegExp(r'/+$'), '');
    }
    if (kReleaseMode) {
      throw StateError('BREW_BOBA_API_URL must be configured for release builds.');
    }
    if (kIsWeb) {
      return 'http://localhost:8001';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8001';
      }
    } catch (_) {
      // Fallback for environments where Platform isn't supported
    }
    return 'http://localhost:8001';
  }

  /// Cup size price modifiers in USD
  static const Map<String, double> sizePriceModifiers = {
    'Small': 0.00,
    'Medium': 0.30,
    'Large': 0.60,
  };

  /// Available drink customization options
  static const List<String> availableSizes = ['Small', 'Medium', 'Large'];
  static const List<String> availableSugarLevels = ['0%', '25%', '50%', '75%', '100%'];
  static const List<String> availableIceLevels = ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice'];

  /// Available toppings and their price upcharges in USD
  static const Map<String, double> toppingPrices = {
    'Brown Sugar Pearls': 0.50,
    'Cheese Foam': 0.60,
    'Coconut Jelly': 0.40,
    'Pudding': 0.50,
  };

  static List<String> get availableToppings => toppingPrices.keys.toList();

  /// Café Store Information
  static const String storeAddress = 'Street 310, BKK1, Phnom Penh, Cambodia';
  static const String storePhone = '+855 23 888 999';
  static const String storeHours = 'Open Daily: 7:00 AM - 9:00 PM';
}
