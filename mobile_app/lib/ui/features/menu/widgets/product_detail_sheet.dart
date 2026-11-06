import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../data/models/product_model.dart';
import '../../../../data/models/cart_item_model.dart';
import '../../../../providers/shop_provider.dart';

/// Interactive modal sheet to customize cup size, sweetness, ice, and quantity.
class ProductDetailSheet extends StatefulWidget {
  const ProductDetailSheet({
    super.key,
    required this.product,
    required this.onAddToCart,
  });

  final ProductModel product;
  final Function(CartItemModel) onAddToCart;

  static void show(
    BuildContext context, {
    required ProductModel product,
    required Function(CartItemModel) onAddToCart,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ProductDetailSheet(
        product: product,
        onAddToCart: onAddToCart,
      ),
    );
  }

  @override
  State<ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<ProductDetailSheet> {
  String _selectedSize = 'Medium';
  String _selectedSugar = '50%';
  String _selectedIce = 'Normal Ice';
  final Set<String> _selectedToppings = <String>{};
  int _quantity = 1;

  double get _unitPrice {
    final sizeModifier = AppConfig.sizePriceModifiers[_selectedSize] ?? 0.0;
    final toppingsModifier = _selectedToppings.fold(0.0, (sum, topping) {
      return sum + (AppConfig.toppingPrices[topping] ?? 0.0);
    });
    return widget.product.basePriceUsd + sizeModifier + toppingsModifier;
  }

  double get _totalPrice => _unitPrice * _quantity;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
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

          // Scrollable Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                // Header image & details
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SizedBox(
                        width: 90,
                        height: 90,
                        child: widget.product.image != null && widget.product.image!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: widget.product.image!,
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) => _buildPlaceholder(),
                              )
                            : _buildPlaceholder(),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.product.categoryName != null)
                            Text(
                              widget.product.categoryName!.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.secondary,
                                letterSpacing: 0.5,
                              ),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            widget.product.name,
                            style: AppTypography.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            CurrencyFormatter.formatDual(widget.product.basePriceUsd),
                            style: AppTypography.priceLarge.copyWith(fontSize: 15),
                          ),
                        ],
                      ),
                    ),
                    Consumer<ShopProvider>(
                      builder: (context, shop, _) {
                        final currentItem = CartItemModel(
                          product: widget.product,
                          size: _selectedSize,
                          sugarLevel: _selectedSugar,
                          iceLevel: _selectedIce,
                          toppings: _selectedToppings.toList(),
                          quantity: 1,
                        );
                        final isFav = shop.isFavorite(currentItem) || shop.isProductFavorited(widget.product.id);
                        return IconButton(
                          icon: Icon(
                            isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            color: isFav ? AppColors.accentRed : AppColors.textSecondary,
                          ),
                          tooltip: isFav ? 'Remove from favorites' : 'Save to favorites',
                          onPressed: () {
                            shop.toggleFavoriteCustomItem(currentItem);
                          },
                        );
                      },
                    ),
                  ],
                ),
                if (widget.product.description != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    widget.product.description!,
                    style: AppTypography.bodyMedium,
                  ),
                ],

                const Divider(height: 32, color: AppColors.surfaceBorder),

                // 1. Cup Size Option
                _buildSectionTitle('Cup Size', required: true),
                const SizedBox(height: 10),
                Row(
                  children: AppConfig.availableSizes.map((size) {
                    final modifier = AppConfig.sizePriceModifiers[size] ?? 0.0;
                    final isSelected = _selectedSize == size;
                    final priceLabel = modifier > 0 ? '+${CurrencyFormatter.formatUsd(modifier)}' : 'Standard';

                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: _buildOptionTile(
                          title: size,
                          subtitle: priceLabel,
                          isSelected: isSelected,
                          onTap: () => setState(() => _selectedSize = size),
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 24),

                // 2. Sweetness / Sugar Level
                _buildSectionTitle('Sweetness Level'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: AppConfig.availableSugarLevels.map((sugar) {
                    final isSelected = _selectedSugar == sugar;
                    return _buildSelectablePill(
                      label: sugar,
                      isSelected: isSelected,
                      onTap: () => setState(() => _selectedSugar = sugar),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 24),

                // 3. Ice Level
                _buildSectionTitle('Ice Level'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: AppConfig.availableIceLevels.map((ice) {
                    final isSelected = _selectedIce == ice;
                    return _buildSelectablePill(
                      label: ice,
                      isSelected: isSelected,
                      onTap: () => setState(() => _selectedIce = ice),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 24),

                // 4. Add-ons & Toppings
                _buildSectionTitle('Toppings & Add-ons (Optional)'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: AppConfig.availableToppings.map((topping) {
                    final price = AppConfig.toppingPrices[topping] ?? 0.0;
                    final isSelected = _selectedToppings.contains(topping);
                    return InkWell(
                      onTap: () {
                        setState(() {
                          if (isSelected) {
                            _selectedToppings.remove(topping);
                          } else {
                            _selectedToppings.add(topping);
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary.withAlpha(25) : AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : Colors.transparent,
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isSelected ? Icons.check_circle_rounded : Icons.add_circle_outline_rounded,
                              size: 16,
                              color: isSelected ? AppColors.primary : AppColors.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              topping,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? AppColors.primary : AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '+${CurrencyFormatter.formatUsd(price)}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isSelected ? AppColors.primary : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 24),

                // 5. Quantity Stepper
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Quantity', style: AppTypography.titleMedium),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove, size: 18),
                            onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                            color: AppColors.textPrimary,
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              '$_quantity',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add, size: 18),
                            onPressed: _quantity < 20 ? () => setState(() => _quantity++) : null,
                            color: AppColors.textPrimary,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),
              ],
            ),
          ),

          // Bottom Bar: Price & Add to Cart
          Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 14,
              bottom: MediaQuery.of(context).padding.bottom + 14,
            ),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.surfaceBorder, width: 1)),
            ),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Total Price', style: AppTypography.bodySmall),
                    Text(
                      CurrencyFormatter.formatUsd(_totalPrice),
                      style: AppTypography.priceLarge,
                    ),
                    Text(
                      CurrencyFormatter.formatKhr(_totalPrice),
                      style: AppTypography.priceSmall,
                    ),
                  ],
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        final cartItem = CartItemModel(
                          product: widget.product,
                          size: _selectedSize,
                          sugarLevel: _selectedSugar,
                          iceLevel: _selectedIce,
                          toppings: _selectedToppings.toList(),
                          quantity: _quantity,
                        );
                        widget.onAddToCart(cartItem);
                        Navigator.pop(context);
                      },
                      icon: const Icon(Icons.shopping_bag_outlined, color: Colors.white),
                      label: const Text(
                        'Add to Order',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
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

  Widget _buildSectionTitle(String title, {bool required = false}) {
    return Row(
      children: [
        Text(title, style: AppTypography.titleSmall),
        if (required) ...[
          const SizedBox(width: 4),
          const Text('*', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
        ],
      ],
    );
  }

  Widget _buildOptionTile({
    required String title,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withAlpha(20) : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.surfaceBorder,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectablePill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppColors.surfaceMuted,
      child: const Center(
        child: Icon(Icons.local_cafe_rounded, color: AppColors.primaryLight, size: 36),
      ),
    );
  }
}
