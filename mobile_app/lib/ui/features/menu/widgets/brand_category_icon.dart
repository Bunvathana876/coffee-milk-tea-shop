import 'package:flutter/material.dart';

/// Resolves the actual backend category name to its proper uploaded artwork.
/// This is visual-only: it does not replace category IDs or filtering logic.
class BrandCategoryIcon extends StatelessWidget {
  const BrandCategoryIcon({
    super.key,
    required this.categoryName,
    this.size = 68,
  });

  final String categoryName;
  final double size;

  static const _images = <String, String>{
    'all drinks': 'all_drinks.png',
    'coffee': 'coffee.png',
    'milk tea': 'milk_tea.png',
    'fruit tea': 'fruit_tea.png',
    'smoothies': 'smoothies.png',
    'matcha': 'matcha.png',
  };

  static String? assetFor(String name) {
    final normalized = name
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[_\-]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ');
    if (_images.containsKey(normalized)) return _images[normalized];
    // Use these aliases only if corresponding real backend categories exist.
    if (normalized == 'smoothie') return _images['smoothies'];
    if (normalized == 'coffees' ||
        normalized == 'hot coffee' ||
        normalized == 'iced coffee') {
      return _images['coffee'];
    }
    if (normalized == 'milk teas') return _images['milk tea'];
    if (normalized == 'fruit teas') return _images['fruit tea'];
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final filename = assetFor(categoryName);
    if (filename == null) {
      return SizedBox(
        width: size,
        height: size,
        child: const Icon(Icons.local_cafe_outlined, color: Color(0xFF1345A3)),
      );
    }
    return Image.asset(
      'assets/home_refresh/categories/$filename',
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      semanticLabel: '$categoryName category',
    );
  }
}
