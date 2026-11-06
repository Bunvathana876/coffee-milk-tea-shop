import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../data/models/order_model.dart';
import '../../../../providers/order_provider.dart';
import '../../../../providers/user_provider.dart';

/// Real-time visual order tracker with status progress timeline.
class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, required this.order});

  final OrderModel order;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  late final String _sessionToken;

  @override
  void initState() {
    super.initState();
    _sessionToken = context.read<UserProvider>().authToken;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && context.read<UserProvider>().authToken == _sessionToken) {
        context.read<OrderProvider>().setActiveOrder(widget.order);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();
    if (!user.hasServerSession || user.authToken != _sessionToken) {
      return const Scaffold(body: Center(child: Text('Sign in to view this server order.')));
    }
    final orderProvider = context.watch<OrderProvider>();
    final currentOrder = orderProvider.activeOrder ?? widget.order;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Live Order Tracker'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Status',
            onPressed: () => orderProvider.refreshActiveOrder(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => orderProvider.refreshActiveOrder(),
        color: AppColors.primary,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Order Reference Header Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.surfaceBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(8),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Order Reference', style: AppTypography.bodySmall),
                            const SizedBox(height: 2),
                            Text(
                              currentOrder.orderNumber,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontFamily: 'Courier',
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(status: currentOrder.orderStatus, fontSize: 13),
                    ],
                  ),
                  const Divider(height: 24, color: AppColors.surfaceBorder),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.person_outline_rounded, size: 16, color: AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                currentOrder.customerName,
                                style: AppTypography.bodyMedium,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 16, color: AppColors.textSecondary),
                          const SizedBox(width: 6),
                          Text(
                            DateFormatter.formatTime(currentOrder.createdAt),
                            style: AppTypography.bodyMedium,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Visual Status Stepper Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Preparation Status', style: AppTypography.titleSmall),
                  const SizedBox(height: 16),
                  _buildStatusStepper(currentOrder.orderStatus),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Store Pickup Location
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pickup at ${AppConfig.appName}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          AppConfig.storeAddress,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    currentOrder.paymentStatus.toLowerCase() == 'paid'
                        ? 'Payment confirmed by the café'
                        : 'Payment has not been confirmed by the café',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Itemized Order Details
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Order Items', style: AppTypography.titleSmall),
                  const SizedBox(height: 12),
                  ...currentOrder.items.map((item) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceMuted,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${item.quantity}x',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.productName,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${item.size} • ${item.sugarLevel} sugar • ${item.iceLevel}',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            CurrencyFormatter.formatUsd(item.subtotalUsd),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    );
                  }),
                  const Divider(height: 24, color: AppColors.surfaceBorder),
                  _buildReceiptRow('Subtotal', CurrencyFormatter.formatUsd(currentOrder.subtotalUsd)),
                  const SizedBox(height: 6),
                  _buildReceiptRow('Total (USD)', CurrencyFormatter.formatUsd(currentOrder.totalUsd), isBold: true),
                  const SizedBox(height: 4),
                  _buildReceiptRow('Total (KHR)', CurrencyFormatter.formatRawKhr(currentOrder.totalKhr), isSecondary: true),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusStepper(String currentStatus) {
    final statusIndex = _getStatusStep(currentStatus);

    final steps = [
      ('Order Received', 'Your order was sent to the café queue.', Icons.receipt_long_rounded),
      ('Preparing Your Drink', 'Our barista is handcrafting your beverages.', Icons.blender_rounded),
      ('Ready for Pickup', 'Your drinks are ready at the counter!', Icons.takeout_dining_rounded),
      ('Completed', 'Picked up & enjoyed.', Icons.verified_rounded),
    ];

    return Column(
      children: List.generate(steps.length, (index) {
        final step = steps[index];
        final isCompleted = statusIndex > index;
        final isCurrent = statusIndex == index;
        final isLast = index == steps.length - 1;

        Color dotColor;
        if (isCurrent) {
          dotColor = AppColors.secondary;
        } else if (isCompleted) {
          dotColor = AppColors.primary;
        } else {
          dotColor = AppColors.surfaceBorder;
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isCurrent || isCompleted ? dotColor : AppColors.surfaceMuted,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isCurrent ? AppColors.secondary : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    isCompleted ? Icons.check : step.$3,
                    size: 16,
                    color: isCurrent || isCompleted ? Colors.white : AppColors.textTertiary,
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 36,
                    color: isCompleted ? AppColors.primary : AppColors.surfaceBorder,
                  ),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      step.$1,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                        color: isCurrent ? AppColors.primary : (isCompleted ? AppColors.textPrimary : AppColors.textTertiary),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      step.$2,
                      style: TextStyle(
                        fontSize: 12,
                        color: isCurrent ? AppColors.textPrimary : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  int _getStatusStep(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  }

  Widget _buildReceiptRow(String label, String value, {bool isBold = false, bool isSecondary = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 14 : 12,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
            color: isSecondary ? AppColors.secondary : AppColors.textPrimary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 15 : 13,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
            color: isSecondary ? AppColors.secondary : AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
