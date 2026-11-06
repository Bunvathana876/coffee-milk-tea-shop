import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../providers/cart_provider.dart';
import '../widgets/cart_item_tile.dart';
import '../widgets/checkout_sheet.dart';

/// Screen listing customer's current order bag.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key, this.onExploreMenu});

  final VoidCallback? onExploreMenu;

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Order Bag'),
        actions: [
          if (!cart.isEmpty)
            TextButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear Order Bag?'),
                    content: const Text('Are you sure you want to remove all drinks from your bag?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Cancel'),
                      ),
                      TextButton(
                        onPressed: () {
                          cart.clear();
                          Navigator.pop(ctx);
                        },
                        child: const Text('Clear All', style: TextStyle(color: AppColors.statusCancelled)),
                      ),
                    ],
                  ),
                );
              },
              child: const Text(
                'Clear',
                style: TextStyle(color: AppColors.statusCancelled, fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
      body: cart.isEmpty
          ? EmptyState(
              icon: Icons.shopping_bag_outlined,
              title: 'Your bag is empty',
              description: 'Looks like you haven\'t added any delicious coffees or milk teas yet!',
              actionLabel: 'Explore Menu',
              onAction: onExploreMenu,
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                    itemCount: cart.items.length,
                    itemBuilder: (context, index) {
                      final item = cart.items[index];
                      return CartItemTile(
                        item: item,
                        onIncrement: () => cart.updateQuantity(item.id, item.quantity + 1),
                        onDecrement: () => cart.updateQuantity(item.id, item.quantity - 1),
                        onRemove: () => cart.removeItem(item.id),
                      );
                    },
                  ),
                ),

                // Sticky Bottom Checkout Summary
                Container(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    16,
                    20,
                    MediaQuery.of(context).padding.bottom + 16,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    border: Border(
                      top: BorderSide(color: AppColors.surfaceBorder, width: 1),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 10,
                        offset: Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total (${cart.totalQuantity} drinks)',
                                style: AppTypography.bodySmall,
                              ),
                              Text(
                                CurrencyFormatter.formatUsd(cart.subtotalUsd),
                                style: AppTypography.priceLarge,
                              ),
                            ],
                          ),
                          Text(
                            CurrencyFormatter.formatKhr(cart.subtotalUsd),
                            style: AppTypography.priceSmall.copyWith(fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      CustomButton(
                        text: 'Proceed to Checkout',
                        icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                        onPressed: () => CheckoutSheet.show(context),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
