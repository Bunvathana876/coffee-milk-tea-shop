/// Detailed item inside a completed or placed order.
class OrderItemModel {
  final int id;
  final int? productId;
  final String productName;
  final int quantity;
  final double unitPriceUsd;
  final double subtotalUsd;
  final String size;
  final String sugarLevel;
  final String iceLevel;
  final String toppings;

  const OrderItemModel({
    required this.id,
    this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPriceUsd,
    required this.subtotalUsd,
    required this.size,
    required this.sugarLevel,
    required this.iceLevel,
    this.toppings = '',
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'] as int? ?? 0,
      productId: json['product_id'] as int?,
      productName: json['product_name'] as String? ?? 'Custom Beverage',
      quantity: json['quantity'] as int? ?? 1,
      unitPriceUsd: (json['unit_price_usd'] as num?)?.toDouble() ?? 0.0,
      subtotalUsd: (json['subtotal_usd'] as num?)?.toDouble() ?? 0.0,
      size: json['size'] as String? ?? 'Medium',
      sugarLevel: json['sugar_level'] as String? ?? '50%',
      iceLevel: json['ice_level'] as String? ?? 'Normal Ice',
      toppings: json['toppings'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product_id': productId,
      'product_name': productName,
      'quantity': quantity,
      'unit_price_usd': unitPriceUsd,
      'subtotal_usd': subtotalUsd,
      'size': size,
      'sugar_level': sugarLevel,
      'ice_level': iceLevel,
      'toppings': toppings,
    };
  }
}

/// Order model matching FastAPI OrderResponse schema.
class OrderModel {
  final int id;
  final String orderNumber;
  final String customerName;
  final String customerPhone;
  final double subtotalUsd;
  final double totalUsd;
  final double totalKhr;
  final String paymentStatus;
  final String orderStatus;
  final DateTime createdAt;
  final List<OrderItemModel> items;

  const OrderModel({
    required this.id,
    required this.orderNumber,
    required this.customerName,
    required this.customerPhone,
    required this.subtotalUsd,
    required this.totalUsd,
    required this.totalKhr,
    required this.paymentStatus,
    required this.orderStatus,
    required this.createdAt,
    this.items = const [],
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return OrderModel(
      id: json['id'] as int? ?? json['order_id'] as int? ?? 0,
      orderNumber: json['order_number'] as String? ?? 'CAF-ORDER',
      customerName: json['customer_name'] as String? ?? 'Customer',
      customerPhone: json['customer_phone'] as String? ?? '',
      subtotalUsd: (json['subtotal_usd'] as num?)?.toDouble() ?? 0.0,
      totalUsd: (json['total_usd'] as num?)?.toDouble() ?? 0.0,
      totalKhr: (json['total_khr'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: json['payment_status'] as String? ?? 'unpaid',
      orderStatus: json['order_status'] as String? ?? 'pending',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      items: rawItems
          .map((i) => OrderItemModel.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_number': orderNumber,
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'subtotal_usd': subtotalUsd,
      'total_usd': totalUsd,
      'total_khr': totalKhr,
      'payment_status': paymentStatus,
      'order_status': orderStatus,
      'created_at': createdAt.toIso8601String(),
      'items': items.map((i) => i.toJson()).toList(),
    };
  }

  OrderModel copyWith({
    int? id,
    String? orderNumber,
    String? customerName,
    String? customerPhone,
    double? subtotalUsd,
    double? totalUsd,
    double? totalKhr,
    String? paymentStatus,
    String? orderStatus,
    DateTime? createdAt,
    List<OrderItemModel>? items,
  }) {
    return OrderModel(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      subtotalUsd: subtotalUsd ?? this.subtotalUsd,
      totalUsd: totalUsd ?? this.totalUsd,
      totalKhr: totalKhr ?? this.totalKhr,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      orderStatus: orderStatus ?? this.orderStatus,
      createdAt: createdAt ?? this.createdAt,
      items: items ?? this.items,
    );
  }
}
