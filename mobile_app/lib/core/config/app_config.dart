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

  static const String configuredApiBaseUrl = String.fromEnvironment(
    'BREW_BOBA_API_URL',
  );

  /// Returns a usable API base URL without changing the saved preference.
  static String? normalizeApiBaseUrl(String? value) {
    final candidate = value?.trim();
    if (candidate == null ||
        candidate.isEmpty ||
        RegExp(r'\s').hasMatch(candidate)) {
      return null;
    }
    final parsed = Uri.tryParse(candidate);
    if (parsed == null ||
        !['http', 'https'].contains(parsed.scheme) ||
        parsed.host.isEmpty ||
        parsed.userInfo.isNotEmpty ||
        parsed.hasQuery ||
        parsed.hasFragment ||
        parsed.port == 0) {
      return null;
    }
    return candidate.replaceFirst(RegExp(r'/+$'), '');
  }

  /// A compile-time URL wins; a saved URL applies only to development builds.
  static String resolveApiBaseUrl({
    String? savedCustomApiUrl,
    String? explicitApiUrl,
    bool? releaseMode,
    bool? web,
    bool? android,
  }) {
    final explicit = explicitApiUrl ?? configuredApiBaseUrl;
    final isRelease = releaseMode ?? kReleaseMode;
    if (explicit.isNotEmpty) {
      final normalized = normalizeApiBaseUrl(explicit);
      if (normalized == null) {
        throw StateError('BREW_BOBA_API_URL must be a full HTTP or HTTPS URL.');
      }
      if (isRelease && Uri.parse(normalized).scheme != 'https') {
        throw StateError('BREW_BOBA_API_URL must use HTTPS in release builds.');
      }
      return normalized;
    }
    if (isRelease) {
      throw StateError(
        'BREW_BOBA_API_URL must be configured for release builds.',
      );
    }
    final saved = normalizeApiBaseUrl(savedCustomApiUrl);
    // Earlier development builds stored port 8000, which now serves a different
    // local API. Keep the preference intact but use this project's default.
    if (saved != null &&
        !{'http://localhost:8000', 'http://127.0.0.1:8000'}.contains(saved)) {
      return saved;
    }
    if (web ?? kIsWeb) return 'http://127.0.0.1:8003';
    try {
      if (android ?? Platform.isAndroid) return 'http://10.0.2.2:8003';
    } catch (_) {
      // Platform is unavailable in some test and web environments.
    }
    return 'http://127.0.0.1:8003';
  }

  static String get defaultApiBaseUrl => resolveApiBaseUrl();

  /// Cup size price modifiers in USD
  static const Map<String, double> sizePriceModifiers = {
    'Small': 0.00,
    'Medium': 0.30,
    'Large': 0.60,
  };

  /// Available drink customization options
  static const List<String> availableSizes = ['Small', 'Medium', 'Large'];
  static const List<String> availableSugarLevels = [
    '0%',
    '25%',
    '50%',
    '75%',
    '100%',
  ];
  static const List<String> availableIceLevels = [
    'No Ice',
    'Less Ice',
    'Normal Ice',
    'Extra Ice',
  ];

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
