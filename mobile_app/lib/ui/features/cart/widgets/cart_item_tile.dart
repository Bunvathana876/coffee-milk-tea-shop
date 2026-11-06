import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../data/models/cart_item_model.dart';

/// Card tile for a customized drink in the cart bag.
class CartItemTile extends StatelessWidget {
  const CartItemTile({
    super.key,
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  final CartItemModel item;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.surfaceBorder, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 68,
                height: 68,
                child: item.product.image != null && item.product.image!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: item.product.image!,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => _buildPlaceholder(),
                      )
                    : _buildPlaceholder(),
              ),
            ),
            const SizedBox(width: 12),

            // Item Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item.product.name,
                          style: AppTypography.titleSmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16, color: AppColors.textTertiary),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: onRemove,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Customization tags
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      _buildTag(item.size),
                      _buildTag('${item.sugarLevel} sugar'),
                      _buildTag(item.iceLevel),
                      ...item.toppings.map(
                        (t) => _buildTag(
                          '+ $t',
                          backgroundColor: AppColors.primary.withAlpha(20),
                          textColor: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Price and Stepper
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              CurrencyFormatter.formatUsd(item.subtotalUsd),
                              style: AppTypography.priceLarge.copyWith(fontSize: 15),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              CurrencyFormatter.formatKhr(item.subtotalUsd),
                              style: AppTypography.priceSmall.copyWith(fontSize: 10),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            InkWell(
                              onTap: onDecrement,
                              borderRadius: const BorderRadius.horizontal(left: Radius.circular(10)),
                              child: Padding(
                                padding: const EdgeInsets.all(6),
                                child: Icon(
                                  item.quantity == 1 ? Icons.delete_outline_rounded : Icons.remove,
                                  size: 16,
                                  color: item.quantity == 1 ? AppColors.statusCancelled : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              child: Text(
                                '${item.quantity}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: onIncrement,
                              borderRadius: const BorderRadius.horizontal(right: Radius.circular(10)),
                              child: Padding(
                                padding: const EdgeInsets.all(6),
                                child: const Icon(Icons.add, size: 16, color: AppColors.textPrimary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String label, {Color? backgroundColor, Color? textColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w500,
          color: textColor ?? AppColors.textSecondary,
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppColors.surfaceMuted,
      child: const Center(
        child: Icon(Icons.local_cafe_rounded, color: AppColors.primaryLight, size: 28),
      ),
    );
  }
}
