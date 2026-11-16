import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/product_image_url.dart';
import '../../../../data/models/product_model.dart';
import '../../../../providers/cart_provider.dart';
import '../../../../providers/shop_provider.dart';
import 'product_detail_sheet.dart';

/// Interactive Barista Surprise / Mystery Sip Sheet that recommends
/// a curated drink from the menu for adventurous customers.
class BaristaSurpriseSheet extends StatefulWidget {
  const BaristaSurpriseSheet({
    super.key,
    required this.shop,
    required this.cart,
  });

  final ShopProvider shop;
  final CartProvider cart;

  static void show(BuildContext context, ShopProvider shop, CartProvider cart) {
    if (shop.products.isEmpty) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BaristaSurpriseSheet(shop: shop, cart: cart),
    );
  }

  @override
  State<BaristaSurpriseSheet> createState() => _BaristaSurpriseSheetState();
}

class _BaristaSurpriseSheetState extends State<BaristaSurpriseSheet> {
  late ProductModel _currentProduct;
  final _random = Random();

  final List<String> _tastingNotes = [
    'Velvety finish, rich caramel warmth, pure comfort',
    'Crisp, sparkling freshness with bright tea aroma',
    'Slow-cooked brown sugar warmth with chewy boba bliss',
    'Earthy Japanese green tea with smooth silky texture',
    'Bold espresso kick with creamy micro-foam balance',
  ];

  late String _currentNote;

  @override
  void initState() {
    super.initState();
    _pickRandomDrink();
  }

  void _pickRandomDrink() {
    final available = widget.shop.products.where((p) => p.isAvailable).toList();
    final list = available.isNotEmpty ? available : widget.shop.products;
    if (list.isEmpty) return;
    setState(() {
      _currentProduct = list[_random.nextInt(list.length)];
      _currentNote = _tastingNotes[_random.nextInt(_tastingNotes.length)];
    });
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    final rawImage = _currentProduct.image;
    final imageUrl = rawImage != null && rawImage.isNotEmpty
        ? productImageUrl(rawImage, width: 200)
        : null;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.secondaryLight,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Header Banner
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('✨', style: TextStyle(fontSize: 18)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Barista's Mystery Pick",
                        style: AppTypography.titleMedium.copyWith(
                          color: AppColors.bobaPearl,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        "Can't decide? Let our house recipe surprise your tastebuds!",
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: AppColors.primary),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Drink Showcase Card
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.15),
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.bobaPearl.withValues(alpha: 0.08),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Drink Thumbnail
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: AppColors.secondaryLight,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.15),
                      ),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: imageUrl != null
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.local_cafe_rounded,
                              color: AppColors.primary,
                              size: 36,
                            ),
                          )
                        : const Icon(
                            Icons.local_cafe_rounded,
                            color: AppColors.primary,
                            size: 36,
                          ),
                  ),
                  const SizedBox(width: 14),

                  // Drink Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.secondaryLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            '★ 98% Barista Match',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _currentProduct.name,
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.bobaPearl,
                            fontWeight: FontWeight.w800,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          CurrencyFormatter.formatDual(
                            _currentProduct.basePriceUsd,
                          ),
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Tasting Note Box
            Container(
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.15),
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  const Text('🌿', style: TextStyle(fontSize: 16)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _currentNote,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.bobaPearl,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Actions
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: OutlinedButton.icon(
                    key: const Key('surprise-roll-again'),
                    onPressed: _pickRandomDrink,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text(
                      'Roll Again',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    key: const Key('surprise-customize-drink'),
                    onPressed: () {
                      Navigator.pop(context);
                      ProductDetailSheet.show(
                        context,
                        product: _currentProduct,
                        onAddToCart: (item) {
                          widget.cart.addItem(item);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Added ${item.product.name} to your bag',
                              ),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                      );
                    },
                    icon: const Icon(Icons.local_cafe_rounded, size: 18),
                    label: const Text(
                      'Customize & Sip',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.bobaPearl,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
