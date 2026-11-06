import 'package:intl/intl.dart';
import '../config/app_config.dart';

/// Clean utility for formatting prices in both USD and Cambodian Riel (KHR).
class CurrencyFormatter {
  CurrencyFormatter._();

  static final NumberFormat _usdFormat = NumberFormat.currency(
    symbol: AppConfig.currencyUsdSymbol,
    decimalDigits: 2,
  );

  static final NumberFormat _khrFormat = NumberFormat('#,##0', 'en_US');

  /// Formats amount in USD, e.g. "$2.50"
  static String formatUsd(double amount) {
    return _usdFormat.format(amount);
  }

  /// Formats amount in Cambodian Riel, e.g. "10,250 ៛"
  static String formatKhr(double amountInUsd) {
    final double khrValue = amountInUsd * AppConfig.khrExchangeRate;
    return '${_khrFormat.format(khrValue)} ${AppConfig.currencyKhrSymbol}';
  }

  /// Formats raw KHR value directly
  static String formatRawKhr(double khrAmount) {
    return '${_khrFormat.format(khrAmount)} ${AppConfig.currencyKhrSymbol}';
  }

  /// Dual format string, e.g. "$2.50 (10,250 ៛)"
  static String formatDual(double usdAmount) {
    return '${formatUsd(usdAmount)} (${formatKhr(usdAmount)})';
  }
}
