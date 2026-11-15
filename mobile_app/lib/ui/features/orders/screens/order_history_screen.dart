import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/cart_item_model.dart';
import '../../../../data/models/order_model.dart';
import '../../../../providers/cart_provider.dart';
import '../../../../providers/order_provider.dart';
import '../../../../providers/shop_provider.dart';
import '../../../../providers/user_provider.dart';
import '../../auth/screens/auth_screen.dart';
import '../widgets/order_card.dart';
import '../widgets/order_status_tracker.dart';
import '../widgets/orders_empty_state.dart';
import '../widgets/orders_header.dart';
import 'order_tracking_screen.dart';

/// Screen displaying customer's order history, 4-stage status tracker,
/// and fast phone/reference lookup. Matches the Your Orders V4 design.
class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key, this.onExploreMenu});

  final VoidCallback? onExploreMenu;

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  final TextEditingController _lookupController = TextEditingController();
  OrderModel? _selectedOrder;

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
    if (changed) {
      _selectedOrder = null;
      orders.resetForSession(user.authToken);
    }
    if (user.hasServerSession && (changed || reload)) orders.loadMyOrders();
  }

  @override
  void dispose() {
    _lookupController.dispose();
    super.dispose();
  }

  Future<void> _performLookup() async {
    final query = _lookupController.text.trim();
    if (query.isEmpty || !context.read<UserProvider>().hasServerSession) return;

    final orderProvider = context.read<OrderProvider>();
    await orderProvider.lookup(query);
  }

  void _openTracking(OrderModel order) {
    setState(() => _selectedOrder = order);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => OrderTrackingScreen(order: order)),
    );
  }

  void _handleReorder(OrderModel order) {
    final shop = context.read<ShopProvider>();
    final cart = context.read<CartProvider>();

    final reorderedItems = <CartItemModel>[];
    for (final item in order.items) {
      final product = shop.products
          .where((p) => p.id == item.productId)
          .firstOrNull;
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'These drinks are no longer available in the current menu.',
          ),
        ),
      );
      return;
    }
    cart.addItems(reorderedItems);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Added ${reorderedItems.length} items from ${order.orderNumber} to bag!',
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  OrderModel? _resolveActiveOrder(List<OrderModel> orders) {
    if (orders.isEmpty) return null;
    if (_selectedOrder != null) {
      for (final o in orders) {
        if (o.id == _selectedOrder!.id ||
            o.orderNumber == _selectedOrder!.orderNumber) {
          return o;
        }
      }
    }
    // Prefer any live order (pending, preparing, ready)
    for (final o in orders) {
      final s = o.orderStatus.toLowerCase().trim();
      if (s == 'pending' || s == 'preparing' || s == 'ready') {
        return o;
      }
    }
    // Otherwise return the latest order
    return orders.first;
  }

  Future<void> _openAuth() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const AuthScreen(initialIsRegister: false),
      ),
    );
    if (!mounted) return;
    _syncSession(reload: true);
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = context.watch<OrderProvider>();
    final user = context.watch<UserProvider>();

    if (orderProvider.sessionToken != user.authToken) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _syncSession();
      });
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final isAuth = user.hasServerSession;
    final orders = orderProvider.recentOrders;
    final activeOrder = isAuth ? _resolveActiveOrder(orders) : null;
    final isNeutralPreview = !isAuth || orders.isEmpty;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () async {
          if (_lookupController.text.isNotEmpty) {
            await _performLookup();
          } else if (isAuth) {
            await orderProvider.loadMyOrders();
          }
        },
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // A. Cobalt brand header with barista and layered wave
            const SliverToBoxAdapter(child: OrdersHeader()),

            // B. 4-Stage visual order progress tracker
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: OrderStatusTracker(
                  order: activeOrder,
                  isNeutralPreview: isNeutralPreview,
                  onTap: activeOrder != null
                      ? () => _openTracking(activeOrder)
                      : null,
                ),
              ),
            ),

            // C/D. Body states: Guest, Loading, Error, Empty, Orders List
            if (!isAuth)
              SliverToBoxAdapter(child: _buildGuestView(context))
            else if (orderProvider.isLoading && orders.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (orders.isEmpty && orderProvider.errorMessage != null)
              SliverToBoxAdapter(child: _buildErrorState(orderProvider))
            else if (orders.isEmpty)
              SliverToBoxAdapter(
                child: OrdersEmptyState(onExploreMenu: widget.onExploreMenu),
              )
            else ...[
              // Authenticated orders list with search and order cards
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (orderProvider.errorMessage != null)
                        _buildErrorBanner(orderProvider),
                      _buildSearchBar(),
                      const SizedBox(height: 8),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 4),
                        child: Text(
                          'Only orders verified by the café server appear here.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final order = orders[index];
                    return OrderCard(
                      order: order,
                      onTap: () => _openTracking(order),
                      onReorder: () => _handleReorder(order),
                    );
                  }, childCount: orders.length),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Guest / Unauthenticated State
  Widget _buildGuestView(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Friendly Sign In Required Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFDF8),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFF0E5D3), width: 1.0),
              boxShadow: [
                BoxShadow(
                  color: AppColors.bobaPearl.withValues(alpha: 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEF3C7),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.lock_outline_rounded,
                    color: AppColors.primary,
                    size: 26,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Sign in to view orders',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in to your café account to track your drinks in real time and see your confirmed order history.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    key: const Key('guest-sign-in-btn'),
                    onPressed: _openAuth,
                    icon: const Icon(Icons.login_rounded, size: 18),
                    label: const Text(
                      'Sign In to Account',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(23),
                      ),
                      elevation: 2,
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

  Widget _buildErrorState(OrderProvider orderProvider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 44,
              color: AppColors.primary,
            ),
            const SizedBox(height: 12),
            const Text(
              'Could not load your orders',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              orderProvider.errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: orderProvider.loadMyOrders,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size(130, 48),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Error banner with Retry action
  Widget _buildErrorBanner(OrderProvider orderProvider) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFCA5A5), width: 0.8),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFDC2626),
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              orderProvider.errorMessage!,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFFDC2626),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          TextButton(
            onPressed: () => _lookupController.text.isNotEmpty
                ? _performLookup()
                : orderProvider.loadMyOrders(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  /// Search / Lookup Bar
  Widget _buildSearchBar({
    String hintText = 'Search phone or order ref (ORD- / CAF-)',
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF0E5D3), width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _lookupController,
              decoration: InputDecoration(
                hintText: hintText,
                hintStyle: const TextStyle(
                  fontSize: 12.5,
                  color: AppColors.textSecondary,
                ),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
                suffixIcon: _lookupController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _lookupController.clear();
                          setState(() {});
                          if (context.read<UserProvider>().hasServerSession) {
                            context.read<OrderProvider>().loadMyOrders();
                          }
                        },
                      )
                    : null,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 12,
                ),
              ),
              style: const TextStyle(fontSize: 13),
              onSubmitted: (_) => _performLookup(),
              onChanged: (_) => setState(() {}),
            ),
          ),
          const SizedBox(width: 6),
          IconButton.filled(
            onPressed: _performLookup,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.all(10),
            ),
            icon: const Icon(
              Icons.arrow_forward_rounded,
              color: Colors.white,
              size: 18,
            ),
          ),
        ],
      ),
    );
  }
}
