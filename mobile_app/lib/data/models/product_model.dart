/// Product model representing an artisan beverage or bakery item.
class ProductModel {
  final int id;
  final String name;
  final int categoryId;
  final String? categoryName;
  final String? description;
  final String? image;
  final double basePriceUsd;
  final bool isAvailable;

  const ProductModel({
    required this.id,
    required this.name,
    required this.categoryId,
    this.categoryName,
    this.description,
    this.image,
    required this.basePriceUsd,
    this.isAvailable = true,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as int,
      name: json['name'] as String,
      categoryId: json['category_id'] as int,
      categoryName: json['category_name'] as String? ?? (json['category'] != null ? json['category']['name'] as String? : null),
      description: json['description'] as String?,
      image: json['image'] as String?,
      basePriceUsd: (json['base_price_usd'] as num).toDouble(),
      isAvailable: json['is_available'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category_id': categoryId,
      'category_name': categoryName,
      'description': description,
      'image': image,
      'base_price_usd': basePriceUsd,
      'is_available': isAvailable,
    };
  }

  ProductModel copyWith({
    int? id,
    String? name,
    int? categoryId,
    String? categoryName,
    String? description,
    String? image,
    double? basePriceUsd,
    bool? isAvailable,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      description: description ?? this.description,
      image: image ?? this.image,
      basePriceUsd: basePriceUsd ?? this.basePriceUsd,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }
}
