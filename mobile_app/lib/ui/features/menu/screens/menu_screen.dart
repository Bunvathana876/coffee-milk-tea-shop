import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../providers/shop_provider.dart';
import '../../../../providers/cart_provider.dart';
import '../../../../providers/user_provider.dart';
import '../widgets/category_chip.dart';
import '../widgets/product_card.dart';
import '../widgets/product_detail_sheet.dart';

/// Main explore and menu browsing screen.
class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key, this.onNavigateToCart});

  final VoidCallback? onNavigateToCart;

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shop = context.watch<ShopProvider>();
    final cart = context.watch<CartProvider>();
    final user = context.watch<UserProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: () => shop.refreshCatalog(),
              color: AppColors.primary,
              child: CustomScrollView(
                slivers: [
                  // App Bar / Header
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            AppConfig.appName,
                                            style: AppTypography.displayLarge,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: BoxDecoration(
                                            color: user.isServerOnline
                                                ? AppColors.statusCompleted
                                                : AppColors.secondary,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      AppConfig.appTagline,
                                      style: AppTypography.bodySmall.copyWith(
                                        color: AppColors.textSecondary,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              CircleAvatar(
                                radius: 22,
                                backgroundColor: AppColors.primary.withAlpha(20),
                                child: const Icon(
                                  Icons.coffee_rounded,
                                  color: AppColors.primary,
                                  size: 24,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Search Bar
                          TextField(
                            controller: _searchController,
                            onChanged: (val) => shop.setSearchQuery(val),
                            decoration: InputDecoration(
                              hintText: 'Search iced latte, boba, matcha...',
                              prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                              suffixIcon: _searchController.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 18),
                                      onPressed: () {
                                        _searchController.clear();
                                        shop.clearSearch();
                                      },
                                    )
                                  : null,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Promo / Announcement Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppColors.primary, AppColors.primaryLight],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withAlpha(60),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppColors.secondary,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Text(
                                          'TODAY\'S SPECIAL',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      const Text(
                                        'Fresh Brews & Brown Sugar Boba',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Customize sweetness & ice to your taste',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.white.withAlpha(200),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withAlpha(30),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.local_cafe_rounded,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Horizontal Category Pills
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: SizedBox(
                        height: 40,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          children: [
                            CategoryChip(
                              label: 'All Drinks',
                              count: shop.products.length,
                              isSelected: shop.selectedCategoryId == 0,
                              onTap: () => shop.selectCategory(0),
                            ),
                            ...shop.categories.map((cat) {
                              return CategoryChip(
                                label: cat.name,
                                count: cat.productCount,
                                isSelected: shop.selectedCategoryId == cat.id,
                                onTap: () => shop.selectCategory(cat.id),
                              );
                            }),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Products Grid
                  if (shop.isLoading)
                    const SliverFillRemaining(
                      child: Center(
                        child: CircularProgressIndicator(color: AppColors.primary),
                      ),
                    )
                  else if (shop.filteredProducts.isEmpty)
                    SliverFillRemaining(
                      child: EmptyState(
                        icon: Icons.search_off_rounded,
                        title: 'No drinks found',
                        description: 'Try searching with another keyword or pick a different category.',
                        actionLabel: 'Reset Filters',
                        onAction: () {
                          _searchController.clear();
                          shop.clearSearch();
                          shop.selectCategory(0);
                        },
                      ),
                    )
                  else
                    SliverPadding(
                      padding: EdgeInsets.fromLTRB(
                        20,
                        8,
                        20,
                        cart.isEmpty ? 24 : 96, // extra bottom padding when floating cart bar is shown
                      ),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisExtent: 248,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final product = shop.filteredProducts[index];
                            return ProductCard(
                              product: product,
                              onTap: () {
                                ProductDetailSheet.show(
                                  context,
                                  product: product,
                                  onAddToCart: (customizedItem) {
                                    cart.addItem(customizedItem);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Added "${customizedItem.product.name}" to order!'),
                                        duration: const Duration(seconds: 2),
                                        backgroundColor: AppColors.primary,
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                  },
                                );
                              },
                            );
                          },
                          childCount: shop.filteredProducts.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Floating Bag / Order Summary Bar
            if (!cart.isEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: widget.onNavigateToCart,
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withAlpha(100),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.secondary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${cart.totalQuantity}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  'Your Order Bag',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  CurrencyFormatter.formatDual(cart.subtotalUsd),
                                  style: TextStyle(
                                    color: Colors.white.withAlpha(200),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: const [
                              Text(
                                'View Cart',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
