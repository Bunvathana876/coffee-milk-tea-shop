import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../providers/cart_provider.dart';
import '../widgets/cart_item_tile.dart';
import '../widgets/checkout_sheet.dart';
import '../widgets/empty_cart_view.dart';

/// Screen listing customer's current order bag.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key, this.onExploreMenu});

  final VoidCallback? onExploreMenu;

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: cart.isEmpty
          ? null
          : AppBar(
              title: const Text('Your Order'),
              actions: [
                if (!cart.isEmpty)
                  TextButton(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Clear Order Bag?'),
                          content: const Text(
                            'Are you sure you want to remove all drinks from your bag?',
                          ),
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
                              child: const Text(
                                'Clear All',
                                style: TextStyle(
                                  color: AppColors.statusCancelled,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    child: const Text(
                      'Clear',
                      style: TextStyle(
                        color: AppColors.statusCancelled,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
      body: cart.isEmpty
          ? EmptyCartView(onExploreMenu: onExploreMenu)
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
                        onIncrement: () =>
                            cart.updateQuantity(item.id, item.quantity + 1),
                        onDecrement: () =>
                            cart.updateQuantity(item.id, item.quantity - 1),
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
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Subtotal (${cart.totalQuantity} drinks)',
                                  style: AppTypography.bodySmall,
                                ),
                                Text(
                                  CurrencyFormatter.formatUsd(cart.subtotalUsd),
                                  style: AppTypography.priceLarge,
                                ),
                              ],
                            ),
                          ),
                          Flexible(
                            child: Text(
                              CurrencyFormatter.formatKhr(cart.subtotalUsd),
                              textAlign: TextAlign.end,
                              style: AppTypography.priceSmall.copyWith(
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () => CheckoutSheet.show(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.arrow_forward_rounded, size: 20),
                              SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  'Proceed to Checkout',
                                  maxLines: 2,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
