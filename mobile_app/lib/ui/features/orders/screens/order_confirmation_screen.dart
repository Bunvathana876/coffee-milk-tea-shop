import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../data/models/order_model.dart';
import 'order_tracking_screen.dart';

/// Presented only after checkout receives a confirmed order from the server.
class OrderConfirmationScreen extends StatelessWidget {
  const OrderConfirmationScreen({super.key, required this.order});
  final OrderModel order;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(title: const Text('Order received')),
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text('Thank You!', style: AppTypography.displayLarge),
                const SizedBox(height: 12),
                const Text(
                  'Your order has been received by the café.',
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyLarge,
                ),
                const SizedBox(height: 32),
                Image.asset(
                  'assets/brand/brew-boba-cup-icon.webp',
                  width: 180,
                  height: 180,
                  semanticLabel: 'Brew & Boba cup',
                ),
                const SizedBox(height: 32),
                Text(order.orderNumber, style: AppTypography.titleLarge),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    StatusBadge(status: order.orderStatus),
                    PaymentStatusBadge(status: order.paymentStatus),
                  ],
                ),
                const SizedBox(height: 32),
                CustomButton(
                  text: 'View Order',
                  onPressed: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (_) => OrderTrackingScreen(order: order),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
