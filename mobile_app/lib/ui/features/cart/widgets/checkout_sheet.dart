import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../data/models/order_model.dart';
import '../../../../providers/cart_provider.dart';
import '../../../../providers/order_provider.dart';
import '../../../../providers/user_provider.dart';
import '../../orders/screens/order_tracking_screen.dart';

/// One-screen checkout sheet with phone memory and payment choices.
class CheckoutSheet extends StatefulWidget {
  const CheckoutSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const CheckoutSheet(),
    );
  }

  @override
  State<CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<CheckoutSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  String _paymentMethod = 'cash'; // 'cash' or 'khqr'
  bool _rememberMe = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<UserProvider>();
    _nameController = TextEditingController(text: user.customerName);
    _phoneController = TextEditingController(text: user.customerPhone);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handlePlaceOrder() async {
    if (_submitting) return;
    if (!_formKey.currentState!.validate()) return;

    final cart = context.read<CartProvider>();
    final orderProvider = context.read<OrderProvider>();
    final user = context.read<UserProvider>();

    if (!user.hasServerSession) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please sign in to the café server before placing an order.'),
      ));
      return;
    }
    if (cart.items.isEmpty) return;
    _submitting = true;
    orderProvider.resetForSession(user.authToken);

    OrderModel? placedOrder;
    try {
      if (_rememberMe) {
        await user.saveProfile(
          name: _nameController.text,
          phone: _phoneController.text,
        );
      }
      placedOrder = await orderProvider.placeOrder(
        customerName: _nameController.text.trim(),
        customerPhone: _phoneController.text.trim(),
        items: List.of(cart.items),
        paymentMethod: _paymentMethod,
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Could not prepare checkout. Your cart is saved; please retry.'),
        ));
      }
      return;
    } finally {
      _submitting = false;
    }

    final confirmedOrder = placedOrder;
    if (confirmedOrder != null) {
      cart.clear(); // A parsed server response is the only cart-clearing path.
      unawaited(user.refreshServerLoyalty());
      if (!mounted) return;
      Navigator.pop(context); // close bottom sheet

      // Navigate directly to the live tracking screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OrderTrackingScreen(order: confirmedOrder),
        ),
      );
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(orderProvider.errorMessage ?? 'Failed to place order'),
          backgroundColor: AppColors.statusCancelled,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final orderProvider = context.watch<OrderProvider>();
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 48,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.surfaceBorder,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),

            // Sheet Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Checkout & Pickup', style: AppTypography.titleLarge),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(height: 1, color: AppColors.surfaceBorder),

            // Scrollable Form
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Store Pickup Location Info Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Store Pickup',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  AppConfig.storeAddress,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Customer Name
                    const Text('Your Name', style: AppTypography.titleSmall),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        hintText: 'e.g. Sokha Chhay',
                        prefixIcon: Icon(Icons.person_outline_rounded, color: AppColors.textSecondary),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Please enter your name (min 2 characters)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Customer Phone
                    const Text('Phone Number (for order lookup)', style: AppTypography.titleSmall),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        hintText: 'e.g. 012 345 678',
                        prefixIcon: Icon(Icons.phone_outlined, color: AppColors.textSecondary),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Please enter your phone number';
                        }
                        final digits = val.replaceAll(RegExp(r'\D'), '');
                        if (digits.length < 8 || digits.length > 15) {
                          return 'Phone number must be between 8 and 15 digits';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),

                    // Remember Me Checkbox
                    Material(
                      color: Colors.transparent,
                      child: CheckboxListTile(
                      value: _rememberMe,
                      onChanged: (val) => setState(() => _rememberMe = val ?? true),
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      dense: true,
                      activeColor: AppColors.primary,
                      title: const Text(
                        'Remember my info on this device for 1-tap ordering',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Payment Method Selection
                    const Text('Payment Method', style: AppTypography.titleSmall),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildPaymentTile(
                            id: 'cash',
                            label: 'Pay at Counter',
                            sublabel: 'Cash on pickup',
                            icon: Icons.payments_outlined,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildPaymentTile(
                            id: 'khqr',
                            label: 'ABA KHQR',
                            sublabel: 'Demo option — payment stays unpaid',
                            icon: Icons.qr_code_scanner_rounded,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Order Summary Breakdown
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.surfaceBorder),
                      ),
                      child: Column(
                        children: [
                          _buildSummaryRow('Items (${cart.totalQuantity} drinks)', CurrencyFormatter.formatUsd(cart.subtotalUsd)),
                          const SizedBox(height: 8),
                          _buildSummaryRow('Exchange Rate', '1 USD = 4,100 KHR'),
                          const Divider(height: 20, color: AppColors.surfaceBorder),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total Amount', style: AppTypography.titleMedium),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    CurrencyFormatter.formatUsd(cart.subtotalUsd),
                                    style: AppTypography.priceLarge,
                                  ),
                                  Text(
                                    CurrencyFormatter.formatKhr(cart.subtotalUsd),
                                    style: AppTypography.priceSmall,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Submit Button
            if (orderProvider.submissionState == OrderSubmissionState.preview ||
                orderProvider.submissionState == OrderSubmissionState.failed ||
                orderProvider.submissionState == OrderSubmissionState.pending)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Text(
                  orderProvider.submissionState == OrderSubmissionState.pending
                      ? 'Waiting for server confirmation…'
                      : orderProvider.errorMessage ?? 'Order was not confirmed. Your cart is saved.',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ),
            Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                12,
                20,
                MediaQuery.of(context).padding.bottom + 12,
              ),
              child: CustomButton(
                text: 'Confirm & Place Order',
                isLoading: orderProvider.isPlacingOrder,
                onPressed: _handlePlaceOrder,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentTile({
    required String id,
    required String label,
    required String sublabel,
    required IconData icon,
  }) {
    final isSelected = _paymentMethod == id;
    return InkWell(
      onTap: () => setState(() => _paymentMethod = id),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withAlpha(20) : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.surfaceBorder,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.textSecondary, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              sublabel,
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodyMedium),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
