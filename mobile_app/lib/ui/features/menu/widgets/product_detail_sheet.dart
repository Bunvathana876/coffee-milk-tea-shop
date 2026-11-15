import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../data/models/cart_item_model.dart';
import '../../../../data/models/product_model.dart';
import '../../../../providers/shop_provider.dart';
import 'drink_hero_artwork.dart';

/// Full-height drink customization sheet backed by the existing cart item model.
class ProductDetailSheet extends StatefulWidget {
  const ProductDetailSheet({
    super.key,
    required this.product,
    required this.onAddToCart,
  });

  final ProductModel product;
  final ValueChanged<CartItemModel> onAddToCart;

  static void show(
    BuildContext context, {
    required ProductModel product,
    required ValueChanged<CartItemModel> onAddToCart,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) =>
            ProductDetailSheet(product: product, onAddToCart: onAddToCart),
      ),
    );
  }

  @override
  State<ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<ProductDetailSheet> {
  late String _selectedSize;
  late String _selectedSugar;
  late String _selectedIce;
  final Set<String> _selectedToppings = <String>{};
  int _quantity = 1;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _selectedSize = AppConfig.availableSizes.contains('Medium')
        ? 'Medium'
        : AppConfig.availableSizes.isNotEmpty
        ? AppConfig.availableSizes.first
        : 'Medium';
    _selectedSugar = AppConfig.availableSugarLevels.contains('50%')
        ? '50%'
        : AppConfig.availableSugarLevels.isNotEmpty
        ? AppConfig.availableSugarLevels.first
        : '50%';
    _selectedIce = AppConfig.availableIceLevels.contains('Normal Ice')
        ? 'Normal Ice'
        : AppConfig.availableIceLevels.isNotEmpty
        ? AppConfig.availableIceLevels.first
        : 'Normal Ice';
  }

  CartItemModel get _cartItem => CartItemModel(
    product: widget.product,
    size: _selectedSize,
    sugarLevel: _selectedSugar,
    iceLevel: _selectedIce,
    toppings: _selectedToppings.toList(),
    quantity: _quantity,
  );

  void _addToCart() {
    if (_submitting || !widget.product.isAvailable) return;
    setState(() => _submitting = true);
    try {
      widget.onAddToCart(_cartItem);
      if (mounted && Navigator.canPop(context)) Navigator.pop(context);
    } catch (_) {
      if (mounted) setState(() => _submitting = false);
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context);
    final heroHeight = (screen.height * .42).clamp(240.0, 340.0);
    final imageSize = (screen.width * .77).clamp(238.0, 330.0);
    final imageTop = (heroHeight - imageSize * .84).clamp(60.0, 105.0);
    final introHeight = imageTop + imageSize + 14;
    final total = _cartItem.subtotalUsd;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: ColoredBox(
        color: AppColors.bobaPearl,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  key: const Key('drink-detail-scroll'),
                  padding: EdgeInsets.zero,
                  children: [
                    SizedBox(
                      height: introHeight,
                      child: Stack(
                        children: [
                          Column(
                            children: [
                              SizedBox(
                                height: heroHeight,
                                child: const DecoratedBox(
                                  key: Key('drink-detail-hero'),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        AppColors.primary,
                                        AppColors.bobaPearl,
                                      ],
                                    ),
                                    image: DecorationImage(
                                      image: AssetImage(
                                        'assets/drink_details/navy_cafe_pattern.png',
                                      ),
                                      fit: BoxFit.cover,
                                      opacity: .35,
                                    ),
                                  ),
                                  child: SizedBox.expand(),
                                ),
                              ),
                              const Expanded(
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: AppColors.secondaryLight,
                                    borderRadius: BorderRadius.vertical(
                                      top: Radius.circular(36),
                                    ),
                                  ),
                                  child: SizedBox.expand(),
                                ),
                              ),
                            ],
                          ),
                          Positioned.fill(
                            child: DrinkHeroArtwork(
                              imageUrl: widget.product.image,
                              productName: widget.product.name,
                              size: imageSize,
                              heroHeight: introHeight,
                              imageTop: imageTop,
                            ),
                          ),
                          Positioned(
                            top: 8,
                            left: 20,
                            child: Material(
                              color: AppColors.secondaryLight,
                              borderRadius: BorderRadius.circular(16),
                              child: IconButton(
                                key: const Key('drink-detail-back'),
                                tooltip: 'Back to menu',
                                onPressed: () => Navigator.maybePop(context),
                                color: AppColors.bobaPearl,
                                icon: const Icon(
                                  Icons.arrow_back_ios_new_rounded,
                                ),
                                constraints: const BoxConstraints.tightFor(
                                  width: 52,
                                  height: 52,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Material(
                      key: const Key('drink-detail-content'),
                      color: AppColors.secondaryLight,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if (widget
                                              .product
                                              .categoryName
                                              ?.isNotEmpty ==
                                          true)
                                        Text(
                                          widget.product.categoryName!
                                              .toUpperCase(),
                                          style: AppTypography.bodySmall
                                              .copyWith(
                                                color: AppColors.primary,
                                                fontWeight: FontWeight.w700,
                                                letterSpacing: .8,
                                              ),
                                        ),
                                      Text(
                                        widget.product.name,
                                        key: const Key('drink-detail-name'),
                                        style: AppTypography.displayLarge
                                            .copyWith(
                                              color: AppColors.bobaPearl,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                Consumer<ShopProvider>(
                                  builder: (context, shop, _) {
                                    final item = _cartItem.copyWith(
                                      quantity: 1,
                                    );
                                    final favorite =
                                        shop.isFavorite(item) ||
                                        shop.isProductFavorited(
                                          widget.product.id,
                                        );
                                    return IconButton(
                                      tooltip: favorite
                                          ? 'Remove from favorites'
                                          : 'Save to favorites',
                                      onPressed: () =>
                                          shop.toggleFavoriteCustomItem(item),
                                      icon: Icon(
                                        favorite
                                            ? Icons.favorite_rounded
                                            : Icons.favorite_border_rounded,
                                        color: favorite
                                            ? AppColors.accentRed
                                            : AppColors.primary,
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                            if (widget.product.description?.isNotEmpty ==
                                true) ...[
                              const SizedBox(height: 6),
                              Text(
                                widget.product.description!,
                                style: AppTypography.bodyMedium,
                              ),
                            ],
                            if (!widget.product.isAvailable) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Currently unavailable',
                                style: AppTypography.labelLarge.copyWith(
                                  color: AppColors.statusCancelled,
                                ),
                              ),
                            ],
                            if (AppConfig.availableSizes.isNotEmpty) ...[
                              _divider(),
                              _sectionTitle('Size options'),
                              const SizedBox(height: 12),
                              _sizeOptions(),
                            ],
                            if (AppConfig.availableIceLevels.isNotEmpty) ...[
                              _divider(),
                              _sectionTitle('Ice level'),
                              const SizedBox(height: 10),
                              _exclusiveOptions(
                                AppConfig.availableIceLevels,
                                _selectedIce,
                                'ice',
                                (value) => setState(() => _selectedIce = value),
                              ),
                            ],
                            if (AppConfig.availableSugarLevels.isNotEmpty) ...[
                              _divider(),
                              _sectionTitle('Sweetness level'),
                              const SizedBox(height: 10),
                              _exclusiveOptions(
                                AppConfig.availableSugarLevels,
                                _selectedSugar,
                                'sugar',
                                (value) =>
                                    setState(() => _selectedSugar = value),
                              ),
                            ],
                            if (AppConfig.availableToppings.isNotEmpty) ...[
                              _divider(),
                              _sectionTitle('Toppings'),
                              const SizedBox(height: 4),
                              for (final topping in AppConfig.availableToppings)
                                CheckboxListTile(
                                  key: Key('topping-$topping'),
                                  value: _selectedToppings.contains(topping),
                                  onChanged: (checked) => setState(() {
                                    if (checked == true) {
                                      _selectedToppings.add(topping);
                                    } else {
                                      _selectedToppings.remove(topping);
                                    }
                                  }),
                                  controlAffinity:
                                      ListTileControlAffinity.leading,
                                  activeColor: AppColors.primary,
                                  dense: true,
                                  contentPadding: EdgeInsets.zero,
                                  title: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          topping,
                                          style: AppTypography.bodyMedium,
                                        ),
                                      ),
                                      Text(
                                        '+${CurrencyFormatter.formatUsd(AppConfig.toppingPrices[topping] ?? 0)}',
                                        style: AppTypography.labelLarge
                                            .copyWith(color: AppColors.primary),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                            _divider(),
                            Row(
                              key: const Key('drink-detail-last-option'),
                              children: [
                                Expanded(child: _sectionTitle('Quantity')),
                                IconButton(
                                  tooltip: 'Decrease quantity',
                                  onPressed: _quantity > 1
                                      ? () => setState(() => _quantity--)
                                      : null,
                                  icon: const Icon(Icons.remove_circle_outline),
                                ),
                                Text(
                                  '$_quantity',
                                  key: const Key('drink-detail-quantity'),
                                  style: AppTypography.titleMedium,
                                ),
                                IconButton(
                                  tooltip: 'Increase quantity',
                                  onPressed: _quantity < 20
                                      ? () => setState(() => _quantity++)
                                      : null,
                                  icon: const Icon(Icons.add_circle_outline),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              _footer(total),
            ],
          ),
        ),
      ),
    );
  }

  Widget _divider() => const Padding(
    padding: EdgeInsets.symmetric(vertical: 20),
    child: Divider(height: 1, color: AppColors.surfaceBorder),
  );

  Widget _sectionTitle(String title) => Text(
    title,
    style: AppTypography.titleLarge.copyWith(color: AppColors.bobaPearl),
  );

  Widget _sizeOptions() => LayoutBuilder(
    builder: (context, constraints) {
      final sizes = AppConfig.availableSizes;
      final textScale = MediaQuery.textScalerOf(context).scale(14) / 14;
      final columns = constraints.maxWidth < 340 || textScale > 1.25
          ? 2
          : sizes.length < 3
          ? sizes.length
          : 3;
      final width = (constraints.maxWidth - 8 * (columns - 1)) / columns;
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final size in sizes)
            SizedBox(width: width, child: _sizeTile(size)),
        ],
      );
    },
  );

  Widget _sizeTile(String size) {
    final selected = size == _selectedSize;
    final modifier = AppConfig.sizePriceModifiers[size] ?? 0;
    final normalized = size.toLowerCase().trim();
    final cup = normalized.contains('small')
        ? 'cup_small.png'
        : normalized.contains('medium')
        ? 'cup_medium.png'
        : normalized.contains('large')
        ? 'cup_large.png'
        : null;
    return Semantics(
      selected: selected,
      button: true,
      child: InkWell(
        key: Key('size-$size'),
        onTap: () => setState(() => _selectedSize = size),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 180),
          constraints: const BoxConstraints(minHeight: 126),
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryLight : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.surfaceBorder,
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 58,
                child: cup == null
                    ? const Icon(
                        Icons.local_cafe_outlined,
                        size: 42,
                        color: AppColors.primary,
                      )
                    : Image.asset(
                        'assets/drink_detail/size_icons/$cup',
                        key: Key('size-icon-$size'),
                        fit: BoxFit.contain,
                      ),
              ),
              const SizedBox(height: 4),
              Text(
                size,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: AppTypography.labelLarge.copyWith(
                  color: selected ? AppColors.primary : AppColors.textSecondary,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
              Text(
                modifier == 0
                    ? 'Included'
                    : '+${CurrencyFormatter.formatUsd(modifier)}',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 3),
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : Colors.transparent,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _exclusiveOptions(
    List<String> options,
    String selected,
    String prefix,
    ValueChanged<String> onSelect,
  ) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final option in options)
        ChoiceChip(
          key: Key('$prefix-$option'),
          label: Text(option),
          selected: option == selected,
          onSelected: (_) => onSelect(option),
          selectedColor: AppColors.primaryLight,
          backgroundColor: Colors.white,
          side: BorderSide(
            color: option == selected
                ? AppColors.primary
                : AppColors.surfaceBorder,
          ),
          labelStyle: AppTypography.labelLarge.copyWith(
            color: option == selected
                ? AppColors.primary
                : AppColors.textSecondary,
          ),
        ),
    ],
  );

  Widget _footer(double total) => Container(
    key: const Key('drink-detail-footer'),
    width: double.infinity,
    decoration: const BoxDecoration(
      color: AppColors.secondaryLight,
      border: Border(top: BorderSide(color: AppColors.surfaceBorder)),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Your total',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.titleLarge.copyWith(
                      color: AppColors.bobaPearl,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerRight,
                        child: Text(
                          CurrencyFormatter.formatUsd(total),
                          key: const Key('drink-detail-total-usd'),
                          style: AppTypography.priceLarge.copyWith(
                            fontSize: 23,
                          ),
                        ),
                      ),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerRight,
                        child: Text(
                          CurrencyFormatter.formatKhr(total),
                          key: const Key('drink-detail-total-khr'),
                          style: AppTypography.priceSmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                key: const Key('drink-detail-add'),
                onPressed: widget.product.isAvailable && !_submitting
                    ? _addToCart
                    : null,
                icon: const Icon(Icons.shopping_bag_outlined),
                label: Text(
                  widget.product.isAvailable ? 'Add to Cart' : 'Unavailable',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
