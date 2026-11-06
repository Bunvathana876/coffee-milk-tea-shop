import '../../core/config/app_config.dart';
import 'product_model.dart';

/// Represents a customer's customized beverage in the cart or order.
class CartItemModel {
  final String id; // Unique combination key (e.g. "product_1_Medium_50%_Normal Ice_Pearls")
  final ProductModel product;
  final String size;
  final String sugarLevel;
  final String iceLevel;
  final List<String> toppings;
  final int quantity;

  CartItemModel({
    String? id,
    required this.product,
    this.size = 'Medium',
    this.sugarLevel = '50%',
    this.iceLevel = 'Normal Ice',
    List<String>? toppings,
    this.quantity = 1,
  })  : toppings = List.unmodifiable(toppings ?? const []),
        id = id ??
            '${product.id}_${size}_${sugarLevel}_${iceLevel}_${(toppings != null ? (List<String>.from(toppings)..sort()).join(',') : '')}';

  /// Size price modifier (Small: 0, Medium: +$0.30, Large: +$0.60)
  double get sizeModifier => AppConfig.sizePriceModifiers[size] ?? 0.0;

  /// Toppings price modifier
  double get toppingsModifier => toppings.fold(
        0.0,
        (sum, t) => sum + (AppConfig.toppingPrices[t] ?? 0.0),
      );

  /// Effective price per single drink with size & toppings customization
  double get unitPriceUsd => product.basePriceUsd + sizeModifier + toppingsModifier;

  /// Total for this customized drink line item
  double get subtotalUsd => unitPriceUsd * quantity;

  CartItemModel copyWith({
    ProductModel? product,
    String? size,
    String? sugarLevel,
    String? iceLevel,
    List<String>? toppings,
    int? quantity,
  }) {
    return CartItemModel(
      product: product ?? this.product,
      size: size ?? this.size,
      sugarLevel: sugarLevel ?? this.sugarLevel,
      iceLevel: iceLevel ?? this.iceLevel,
      toppings: toppings ?? this.toppings,
      quantity: quantity ?? this.quantity,
    );
  }

  /// Converts to format expected by FastAPI backend `POST /api/orders`
  Map<String, dynamic> toOrderItemPayload() {
    return {
      'product_id': product.id,
      'quantity': quantity,
      'size': size,
      'sugar_level': sugarLevel,
      'ice_level': iceLevel,
      'toppings': toppings,
      'product_name': product.name,
      'unit_price_usd': unitPriceUsd,
      'subtotal_usd': subtotalUsd,
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product': product.toJson(),
      'size': size,
      'sugar_level': sugarLevel,
      'ice_level': iceLevel,
      'toppings': toppings,
      'quantity': quantity,
    };
  }

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final rawToppings = json['toppings'];
    List<String> parsedToppings = [];
    if (rawToppings is List) {
      parsedToppings = rawToppings.map((e) => e.toString()).toList();
    } else if (rawToppings is String && rawToppings.isNotEmpty) {
      parsedToppings = rawToppings.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    }

    return CartItemModel(
      id: json['id'] as String?,
      product: ProductModel.fromJson(json['product'] as Map<String, dynamic>),
      size: json['size'] as String? ?? 'Medium',
      sugarLevel: json['sugar_level'] as String? ?? '50%',
      iceLevel: json['ice_level'] as String? ?? 'Normal Ice',
      toppings: parsedToppings,
      quantity: json['quantity'] as int? ?? 1,
    );
  }
}
