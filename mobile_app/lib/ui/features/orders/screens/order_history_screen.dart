import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../data/models/cart_item_model.dart';
import '../../../../data/models/order_model.dart';
import '../../../../providers/cart_provider.dart';
import '../../../../providers/order_provider.dart';
import '../../../../providers/shop_provider.dart';
import '../../../../providers/user_provider.dart';
import '../widgets/order_card.dart';
import 'order_tracking_screen.dart';

/// Screen displaying customer's order history and fast phone/reference lookup.
class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key, this.onExploreMenu});

  final VoidCallback? onExploreMenu;

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  final TextEditingController _lookupController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _syncSession(reload: true);
    });
  }

  void _syncSession({bool reload = false}) {
    final user = context.read<UserProvider>();
    final orders = context.read<OrderProvider>();
    final changed = orders.sessionToken != user.authToken;
    if (changed) orders.resetForSession(user.authToken);
    if (user.hasServerSession && (changed || reload)) orders.loadMyOrders();
  }

  @override
  void dispose() {
    _lookupController.dispose();
    super.dispose();
  }

  Future<void> _performLookup() async {
    final query = _lookupController.text.trim();
    if (query.isEmpty) return;

    final orderProvider = context.read<OrderProvider>();
    await orderProvider.lookup(query);
  }

  void _handleReorder(OrderModel order) {
    final shop = context.read<ShopProvider>();
    final cart = context.read<CartProvider>();

    final reorderedItems = <CartItemModel>[];
    for (final item in order.items) {
      final product = shop.products.where((p) => p.id == item.productId).firstOrNull;
      if (product == null || !product.isAvailable) continue;

      final toppingsList = item.toppings
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();

      reorderedItems.add(
        CartItemModel(
          product: product,
          size: item.size,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          toppings: toppingsList,
          quantity: item.quantity,
        ),
      );
    }

    if (reorderedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('These drinks are no longer available in the current menu.'),
      ));
      return;
    }
    cart.addItems(reorderedItems);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added ${reorderedItems.length} items from ${order.orderNumber} to bag!'),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = context.watch<OrderProvider>();
    final user = context.watch<UserProvider>();

    if (orderProvider.sessionToken != user.authToken) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _syncSession();
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!user.hasServerSession) {
      return const Scaffold(body: Center(child: Text('Sign in to the café server to view confirmed orders.')));
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Orders'),
      ),
      body: Column(
        children: [
          // Search / Lookup Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _lookupController,
                    decoration: InputDecoration(
                      hintText: 'Phone or order ref (ORD- / CAF-)',
                      prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                      suffixIcon: _lookupController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _lookupController.clear();
                                setState(() {});
                              },
                            )
                          : null,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: (_) => _performLookup(),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filled(
                  onPressed: _performLookup,
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.all(14),
                  ),
                  icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                ),
              ],
            ),
          ),

          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 10),
            child: Text('Only orders verified by the café server appear here. Offline previews stay in your cart.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ),

          // Orders List
          if (orderProvider.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(orderProvider.errorMessage!, style: const TextStyle(color: AppColors.statusCancelled)),
            ),
          Expanded(
            child: orderProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : orderProvider.recentOrders.isEmpty
                    ? EmptyState(
                        icon: Icons.receipt_long_outlined,
                        title: 'No orders found',
                        description: 'No confirmed server orders match this view or lookup.',
                        actionLabel: 'Order Drinks Now',
                        onAction: widget.onExploreMenu,
                      )
                    : RefreshIndicator(
                        onRefresh: () async {
                          if (_lookupController.text.isNotEmpty) {
                            await _performLookup();
                          } else {
                            await orderProvider.loadMyOrders();
                          }
                        },
                        color: AppColors.primary,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                          itemCount: orderProvider.recentOrders.length,
                          itemBuilder: (context, index) {
                            final order = orderProvider.recentOrders[index];
                            return OrderCard(
                              order: order,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => OrderTrackingScreen(order: order),
                                  ),
                                );
                              },
                              onReorder: () => _handleReorder(order),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
