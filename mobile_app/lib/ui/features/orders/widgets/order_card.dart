import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../data/models/order_model.dart';

/// Card showing order reference, items preview, and status.
class OrderCard extends StatelessWidget {
  const OrderCard({
    super.key,
    required this.order,
    required this.onTap,
    this.onReorder,
  });

  final OrderModel order;
  final VoidCallback onTap;
  final VoidCallback? onReorder;

  @override
  Widget build(BuildContext context) {
    final itemCount = order.items.fold(0, (sum, i) => sum + i.quantity);

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.surfaceBorder, width: 1),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Reference and Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      order.orderNumber,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Courier',
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge(status: order.orderStatus),
                ],
              ),
              const SizedBox(height: 8),

              // Items summary preview
              Text(
                order.items.isNotEmpty
                    ? order.items.map((i) => '${i.quantity}x ${i.productName} (${i.size})').join(', ')
                    : '$itemCount items',
                style: AppTypography.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const Divider(height: 20, color: AppColors.surfaceBorder),

              // Footer: Date and Total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      DateFormatter.formatRelative(order.createdAt),
                      style: AppTypography.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        CurrencyFormatter.formatUsd(order.totalUsd),
                        style: AppTypography.priceLarge.copyWith(fontSize: 15),
                      ),
                      Text(
                        CurrencyFormatter.formatKhr(order.totalUsd),
                        style: AppTypography.priceSmall.copyWith(fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
              if (onReorder != null && order.items.isNotEmpty) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: OutlinedButton.icon(
                    onPressed: onReorder,
                    icon: const Icon(Icons.replay_rounded, size: 16),
                    label: const Text(
                      'Reorder Items',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
