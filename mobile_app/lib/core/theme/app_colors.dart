import 'package:flutter/material.dart';

/// Central color palette for Brew & Boba café theme.
/// Designed for a warm, cozy, appetizing aesthetic.
class AppColors {
  AppColors._();

  // Primary Brand Colors (Coffee & Boba)
  static const Color primary = Color(0xFF4A2C1D);       // Deep roasted espresso
  static const Color primaryDark = Color(0xFF2E190E);   // Extra dark roast
  static const Color primaryLight = Color(0xFF754D35);  // Warm chestnut

  // Secondary Accents (Caramel, Brown Sugar Boba, Matcha)
  static const Color secondary = Color(0xFFD48C46);     // Golden caramel honey
  static const Color secondaryLight = Color(0xFFF1B77B);// Milk tea cream
  static const Color matcha = Color(0xFF5A8D5F);        // Ceremonial matcha green
  static const Color bobaPearl = Color(0xFF1E1715);     // Tapioca boba black
  static const Color accentRed = Color(0xFFEF4444);     // Vibrant heart red

  // Background & Surface Colors (Warm neutral linen)
  static const Color background = Color(0xFFFBF8F5);    // Soft cream linen
  static const Color surface = Color(0xFFFFFFFF);       // Clean white card surface
  static const Color surfaceMuted = Color(0xFFF3ECE4);  // Warm stone container
  static const Color surfaceBorder = Color(0xFFE8DDD2); // Subtle border

  // Text Colors
  static const Color textPrimary = Color(0xFF231812);   // High-contrast espresso
  static const Color textSecondary = Color(0xFF736357); // Warm muted description
  static const Color textTertiary = Color(0xFFA5978E);  // Hint / subtle label
  static const Color textOnPrimary = Color(0xFFFFFFFF); // White on dark buttons

  // Status & Feedback Colors
  static const Color statusPending = Color(0xFFD97706);   // Amber orange (Received)
  static const Color statusPreparing = Color(0xFF0284C7); // Sky blue (In Progress)
  static const Color statusReady = Color(0xFF0D9488);     // Emerald teal (Ready for pickup)
  static const Color statusCompleted = Color(0xFF15803D); // Forest green (Completed)
  static const Color statusCancelled = Color(0xFFDC2626); // Crimson red (Cancelled)

  // Status Backgrounds (Soft tints for chips & badges)
  static const Color statusPendingBg = Color(0xFFFEF3C7);
  static const Color statusPreparingBg = Color(0xFFE0F2FE);
  static const Color statusReadyBg = Color(0xFFCCFBF1);
  static const Color statusCompletedBg = Color(0xFFDCFCE7);
  static const Color statusCancelledBg = Color(0xFFFEE2E2);
}
