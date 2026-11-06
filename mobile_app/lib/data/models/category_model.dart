/// Category model representing a drink family (Coffee, Milk Tea, Fruit Tea, Matcha, Smoothies).
class CategoryModel {
  final int id;
  final String name;
  final String? description;
  final String? image;
  final bool isActive;
  final int? productCount;

  const CategoryModel({
    required this.id,
    required this.name,
    this.description,
    this.image,
    this.isActive = true,
    this.productCount,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      image: json['image'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      productCount: json['product_count'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'image': image,
      'is_active': isActive,
      'product_count': productCount,
    };
  }

  CategoryModel copyWith({
    int? id,
    String? name,
    String? description,
    String? image,
    bool? isActive,
    int? productCount,
  }) {
    return CategoryModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      image: image ?? this.image,
      isActive: isActive ?? this.isActive,
      productCount: productCount ?? this.productCount,
    );
  }
}
