import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/product_image_url.dart';
import '../../../../data/models/product_model.dart';
import '../../../../providers/shop_provider.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onTap});
  final ProductModel product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final shop = context.watch<ShopProvider>();
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final favorite = shop.isProductFavorited(product.id);
    return Material(
      color: AppColors.secondaryLight,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: product.isAvailable ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  width: 76,
                  height: 76,
                  child: product.image == null || product.image!.isEmpty
                      ? _placeholder()
                      : CachedNetworkImage(
                          imageUrl: productImageUrl(product.image!),
                          fit: product.image!.startsWith('https://res.cloudinary.com/dr5o7ft6/')
                              ? BoxFit.contain
                              : BoxFit.cover,
                          placeholder: (_, _) => _placeholder(),
                          errorWidget: (_, _, _) => _placeholder(),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.titleMedium.copyWith(
                        color: AppColors.bobaPearl,
                      ),
                    ),
                    if (product.description?.isNotEmpty == true)
                      Text(
                        product.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    if (!product.isAvailable)
                      Text(
                        'Sold out',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.statusCancelled,
                        ),
                      ),
                    Text(
                      CurrencyFormatter.formatUsd(product.basePriceUsd),
                      style: AppTypography.priceLarge.copyWith(fontSize: 16),
                    ),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 38,
                    height: 38,
                    child: IconButton(
                      tooltip: favorite ? 'Remove favorite' : 'Save favorite',
                      padding: EdgeInsets.zero,
                      onPressed: () => shop.toggleFavoriteProduct(product),
                      icon: Icon(
                        favorite
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 40,
                    height: (40 * scale).clamp(40.0, 56.0),
                    child: IconButton.filled(
                      tooltip: product.isAvailable
                          ? 'Customize ${product.name}'
                          : 'Sold out',
                      onPressed: product.isAvailable ? onTap : null,
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: AppColors.textTertiary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: Icon(
                        product.isAvailable
                            ? Icons.add_rounded
                            : Icons.block_rounded,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() => const ColoredBox(
    color: AppColors.secondary,
    child: Center(
      child: Icon(
        Icons.local_cafe_outlined,
        color: AppColors.primary,
        size: 36,
      ),
    ),
  );
}
