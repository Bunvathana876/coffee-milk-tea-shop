import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../data/models/category_model.dart';
import '../../../../data/models/product_model.dart';
import '../../../../providers/cart_provider.dart';
import '../../../../providers/shop_provider.dart';
import '../widgets/product_card.dart';
import '../widgets/product_detail_sheet.dart';
import '../widgets/brand_banner_carousel.dart';
import '../widgets/brand_category_icon.dart';
import '../widgets/barista_surprise_sheet.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({
    super.key,
    this.onNavigateToCart,
    this.onNavigateToProfile,
    this.isActive = true,
  });
  final VoidCallback? onNavigateToCart;
  final VoidCallback? onNavigateToProfile;
  final bool isActive;
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final search = TextEditingController();
  final scroll = ScrollController();
  final catalogKey = GlobalKey();

  @override
  void dispose() {
    search.dispose();
    scroll.dispose();
    super.dispose();
  }

  void openCatalog([int categoryId = 0]) {
    final shop = context.read<ShopProvider>();
    search.clear();
    shop.clearSearch();
    shop.selectCategory(categoryId);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || catalogKey.currentContext == null) return;
      Scrollable.ensureVisible(
        catalogKey.currentContext!,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutCubic,
        alignment: .32,
      );
    });
  }

  void openBanner(int index, ShopProvider shop) {
    if (index != 1) {
      openCatalog();
      return;
    }
    final coffee = shop.categories.where(
      (c) => c.isActive && c.name.toLowerCase().contains('coffee'),
    );
    openCatalog(coffee.isEmpty ? 0 : coffee.first.id);
  }

  void customize(ProductModel product, CartProvider cart) {
    ProductDetailSheet.show(
      context,
      product: product,
      onAddToCart: (item) {
        cart.addItem(item);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Added ${item.product.name} to your bag'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final shop = context.watch<ShopProvider>();
    final cart = context.watch<CartProvider>();
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final categories = shop.categories.where((c) => c.isActive).toList();
    CategoryModel? selectedCategory;
    for (final category in categories) {
      if (category.id == shop.selectedCategoryId) {
        selectedCategory = category;
        break;
      }
    }
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: SafeArea(
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: shop.refreshCatalog,
              child: CustomScrollView(
                controller: scroll,
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Image.asset(
                              'assets/welcome/welcome_wordmark_cream.png',
                              width: 190,
                              height: 54,
                              fit: BoxFit.contain,
                              semanticLabel: 'Brew & Boba Café',
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  key: const Key('home-search'),
                                  controller: search,
                                  onChanged: shop.setSearchQuery,
                                  textInputAction: TextInputAction.search,
                                  style: AppTypography.bodyLarge.copyWith(
                                    color: AppColors.bobaPearl,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: 'Search coffee, boba, matcha...',
                                    hintStyle: AppTypography.bodyMedium
                                        .copyWith(color: AppColors.primary),
                                    filled: true,
                                    fillColor: AppColors.secondaryLight,
                                    prefixIcon: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Image.asset(
                                        'assets/home/icons/png/search.png',
                                        width: 22,
                                      ),
                                    ),
                                    suffixIcon: search.text.isEmpty
                                        ? null
                                        : IconButton(
                                            tooltip: 'Clear search',
                                            onPressed: () {
                                              search.clear();
                                              shop.clearSearch();
                                            },
                                            icon: const Icon(
                                              Icons.close_rounded,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(28),
                                      borderSide: BorderSide.none,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(28),
                                      borderSide: BorderSide.none,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Semantics(
                                button: true,
                                label: 'Open profile',
                                child: InkWell(
                                  onTap: widget.onNavigateToProfile,
                                  borderRadius: BorderRadius.circular(32),
                                  child: CircleAvatar(
                                    radius: 28,
                                    backgroundColor: AppColors.secondaryLight,
                                    child: ClipOval(
                                      child: Image.asset(
                                        'assets/home/icons/png/avatar_boy.png',
                                        width: 52,
                                        height: 52,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          BrandBannerCarousel(
                            key: const Key('home-banner-carousel'),
                            isActive: widget.isActive,
                            onBannerTap: (index) => openBanner(index, shop),
                          ),
                          const SizedBox(height: 14),
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              key: const Key('home-surprise-barista-card'),
                              onTap: () => BaristaSurpriseSheet.show(
                                context,
                                shop,
                                cart,
                              ),
                              borderRadius: BorderRadius.circular(18),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.secondaryLight,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.2,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Text(
                                        '🎲',
                                        style: TextStyle(fontSize: 14),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            "Barista's Mystery Sip",
                                            style: AppTypography.bodyMedium
                                                .copyWith(
                                                  fontWeight: FontWeight.w800,
                                                  color: AppColors.bobaPearl,
                                                ),
                                          ),
                                          Text(
                                            "Can't decide? Let our house recipe surprise you!",
                                            style: AppTypography.bodySmall
                                                .copyWith(
                                                  fontSize: 11,
                                                  color: AppColors.primary,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      size: 14,
                                      color: AppColors.primary,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          section('Categories', () => openCatalog()),
                          const SizedBox(height: 10),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 124 * scale.clamp(1.0, 1.5),
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: categories.length + 1,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (context, index) => index == 0
                            ? allDrinksTile(shop.selectedCategoryId == 0)
                            : categoryTile(
                                categories[index - 1],
                                shop.selectedCategoryId ==
                                    categories[index - 1].id,
                              ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      key: catalogKey,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      child: section(
                        selectedCategory != null
                            ? '${selectedCategory.name} Drinks'
                            : shop.searchQuery.isNotEmpty
                            ? 'Search Results'
                            : 'Featured Drinks',
                        () => openCatalog(),
                        actionLabel:
                            selectedCategory == null && shop.searchQuery.isEmpty
                            ? 'View all'
                            : 'All Drinks',
                      ),
                    ),
                  ),
                  if (shop.isLoading)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Center(
                          child: CircularProgressIndicator(
                            color: AppColors.secondaryLight,
                          ),
                        ),
                      ),
                    )
                  else if (shop.errorMessage != null && shop.products.isEmpty)
                    SliverToBoxAdapter(
                      child: EmptyState(
                        icon: Icons.wifi_off_rounded,
                        title: 'Menu unavailable',
                        description: shop.errorMessage!,
                        actionLabel: 'Retry',
                        onAction: shop.refreshCatalog,
                      ),
                    )
                  else if (shop.filteredProducts.isEmpty)
                    SliverToBoxAdapter(
                      child: EmptyState(
                        icon: Icons.search_off_rounded,
                        title: selectedCategory == null
                            ? 'No drinks found'
                            : 'No ${selectedCategory.name} drinks yet',
                        description: selectedCategory == null
                            ? 'Try a different search or category.'
                            : 'Explore another category or see all drinks.',
                        actionLabel: 'All Drinks',
                        onAction: () => openCatalog(),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverList.builder(
                        itemCount: shop.filteredProducts.length,
                        itemBuilder: (context, index) {
                          final product = shop.filteredProducts[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: ProductCard(
                              product: product,
                              onTap: () => customize(product, cart),
                            ),
                          );
                        },
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: SizedBox(height: cart.isEmpty ? 24 : 88),
                  ),
                ],
              ),
            ),
            if (!cart.isEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 8,
                child: ElevatedButton(
                  onPressed: widget.onNavigateToCart,
                  child: Row(
                    children: [
                      Badge(
                        label: Text('${cart.totalQuantity}'),
                        child: const Icon(Icons.shopping_bag_outlined),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(child: Text('View your bag')),
                      Text(CurrencyFormatter.formatUsd(cart.subtotalUsd)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget section(
    String title,
    VoidCallback action, {
    String actionLabel = 'View all',
  }) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: AppTypography.titleLarge.copyWith(
            color: Colors.white,
            fontSize: 21,
          ),
        ),
      ),
      TextButton(
        onPressed: action,
        child: Text(
          actionLabel,
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.secondaryLight,
          ),
        ),
      ),
    ],
  );

  Widget allDrinksTile(bool selected) => _categoryTile(
    key: const Key('category-all'),
    label: 'All Drinks',
    selected: selected,
    onTap: () => openCatalog(),
    icon: const BrandCategoryIcon(categoryName: 'All Drinks', size: 68),
  );

  Widget categoryTile(CategoryModel category, bool selected) => _categoryTile(
    key: Key('category-${category.id}'),
    label: category.name,
    selected: selected,
    onTap: () => openCatalog(category.id),
    icon: BrandCategoryIcon(categoryName: category.name, size: 68),
  );

  Widget _categoryTile({
    required Key key,
    required String label,
    required bool selected,
    required VoidCallback onTap,
    required Widget icon,
  }) => SizedBox(
    width: 86,
    child: InkWell(
      key: key,
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Column(
        children: [
          AnimatedContainer(
            key: selected
                ? Key('selected-${label.toLowerCase().replaceAll(' ', '-')}')
                : null,
            duration: const Duration(milliseconds: 180),
            width: 78,
            height: 78,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: selected ? AppColors.secondary : Colors.transparent,
              border: Border.all(
                color: selected ? AppColors.primary : Colors.transparent,
                width: 2,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: AppColors.secondaryLight.withAlpha(110),
                        blurRadius: 9,
                      ),
                    ]
                  : null,
            ),
            child: icon,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: AppTypography.bodySmall.copyWith(
              color: selected ? AppColors.secondaryLight : Colors.white,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
              height: 1.1,
            ),
          ),
          if (selected)
            const Padding(
              padding: EdgeInsets.only(top: 3),
              child: CircleAvatar(
                radius: 3,
                backgroundColor: AppColors.secondary,
              ),
            ),
        ],
      ),
    ),
  );
}
