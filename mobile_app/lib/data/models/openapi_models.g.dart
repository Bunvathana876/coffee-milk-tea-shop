// GENERATED CODE - DO NOT MODIFY BY HAND
// Source: FastAPI OpenAPI Specification (Coffee & Milk Tea Shop API v1.0.0)
// Regenerate with: PYTHONPATH=backend ./backend/venv/bin/python backend/scripts/generate_openapi_clients.py

/// Auto-generated OpenAPI model for `AdminOrderListResponse`.
class ApiAdminOrderListResponse {
  final List<ApiOrderResponse> items;
  final int total;
  final int limit;
  final int offset;
  final Map<String, dynamic> countsByStatus;

  const ApiAdminOrderListResponse({
    required this.items,
    required this.total,
    required this.limit,
    required this.offset,
    required this.countsByStatus,
  });

  factory ApiAdminOrderListResponse.fromJson(Map<String, dynamic> json) {
    return ApiAdminOrderListResponse(
      items: (json['items'] as List<dynamic>?)?.map((e) => ApiOrderResponse.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiOrderResponse>[],
      total: (json['total'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
      countsByStatus: (json['counts_by_status'] as Map<String, dynamic>?) ?? const <String, dynamic>{},
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
      'limit': limit,
      'offset': offset,
      'counts_by_status': countsByStatus,
    };
  }
}

/// Auto-generated OpenAPI model for `CategoryAdminCreate`.
class ApiCategoryAdminCreate {
  final String name;
  final String? description;
  final String? image;
  final bool isActive;

  const ApiCategoryAdminCreate({
    required this.name,
    this.description,
    this.image,
    required this.isActive,
  });

  factory ApiCategoryAdminCreate.fromJson(Map<String, dynamic> json) {
    return ApiCategoryAdminCreate(
      name: (json['name'] as String?) ?? '',
      description: json['description'] as String?,
      image: json['image'] as String?,
      isActive: (json['is_active'] as bool?) ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'image': image,
      'is_active': isActive,
    };
  }
}

/// Auto-generated OpenAPI model for `CategoryAdminResponse`.
class ApiCategoryAdminResponse {
  final String name;
  final String? description;
  final String? image;
  final bool isActive;
  final int id;
  final String createdAt;
  final int? productCount;
  final int availableProductCount;

  const ApiCategoryAdminResponse({
    required this.name,
    this.description,
    this.image,
    required this.isActive,
    required this.id,
    required this.createdAt,
    this.productCount,
    required this.availableProductCount,
  });

  factory ApiCategoryAdminResponse.fromJson(Map<String, dynamic> json) {
    return ApiCategoryAdminResponse(
      name: (json['name'] as String?) ?? '',
      description: json['description'] as String?,
      image: json['image'] as String?,
      isActive: (json['is_active'] as bool?) ?? true,
      id: (json['id'] as num?)?.toInt() ?? 0,
      createdAt: (json['created_at'] as String?) ?? '',
      productCount: (json['product_count'] as num?)?.toInt(),
      availableProductCount: (json['available_product_count'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'image': image,
      'is_active': isActive,
      'id': id,
      'created_at': createdAt,
      'product_count': productCount,
      'available_product_count': availableProductCount,
    };
  }
}

/// Auto-generated OpenAPI model for `CategoryAdminUpdate`.
class ApiCategoryAdminUpdate {
  final String? name;
  final String? description;
  final String? image;
  final bool? isActive;

  const ApiCategoryAdminUpdate({
    this.name,
    this.description,
    this.image,
    this.isActive,
  });

  factory ApiCategoryAdminUpdate.fromJson(Map<String, dynamic> json) {
    return ApiCategoryAdminUpdate(
      name: json['name'] as String?,
      description: json['description'] as String?,
      image: json['image'] as String?,
      isActive: json['is_active'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'image': image,
      'is_active': isActive,
    };
  }
}

/// Auto-generated OpenAPI model for `CategoryDetailResponse`.
class ApiCategoryDetailResponse {
  final String name;
  final String? description;
  final String? image;
  final bool isActive;
  final int id;
  final String createdAt;
  final int? productCount;
  final List<ApiProductSummary>? products;

  const ApiCategoryDetailResponse({
    required this.name,
    this.description,
    this.image,
    required this.isActive,
    required this.id,
    required this.createdAt,
    this.productCount,
    this.products,
  });

  factory ApiCategoryDetailResponse.fromJson(Map<String, dynamic> json) {
    return ApiCategoryDetailResponse(
      name: (json['name'] as String?) ?? '',
      description: json['description'] as String?,
      image: json['image'] as String?,
      isActive: (json['is_active'] as bool?) ?? true,
      id: (json['id'] as num?)?.toInt() ?? 0,
      createdAt: (json['created_at'] as String?) ?? '',
      productCount: (json['product_count'] as num?)?.toInt(),
      products: (json['products'] as List<dynamic>?)?.map((e) => ApiProductSummary.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'image': image,
      'is_active': isActive,
      'id': id,
      'created_at': createdAt,
      'product_count': productCount,
      'products': products?.map((e) => e.toJson()).toList(),
    };
  }
}

/// Auto-generated OpenAPI model for `CategoryResponse`.
class ApiCategoryResponse {
  final String name;
  final String? description;
  final String? image;
  final bool isActive;
  final int id;
  final String createdAt;
  final int? productCount;

  const ApiCategoryResponse({
    required this.name,
    this.description,
    this.image,
    required this.isActive,
    required this.id,
    required this.createdAt,
    this.productCount,
  });

  factory ApiCategoryResponse.fromJson(Map<String, dynamic> json) {
    return ApiCategoryResponse(
      name: (json['name'] as String?) ?? '',
      description: json['description'] as String?,
      image: json['image'] as String?,
      isActive: (json['is_active'] as bool?) ?? true,
      id: (json['id'] as num?)?.toInt() ?? 0,
      createdAt: (json['created_at'] as String?) ?? '',
      productCount: (json['product_count'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'image': image,
      'is_active': isActive,
      'id': id,
      'created_at': createdAt,
      'product_count': productCount,
    };
  }
}

/// Auto-generated OpenAPI model for `CustomerAuthResponse`.
class ApiCustomerAuthResponse {
  final String accessToken;
  final String tokenType;
  final int expiresInMinutes;
  final ApiCustomerUserResponse user;

  const ApiCustomerAuthResponse({
    required this.accessToken,
    required this.tokenType,
    required this.expiresInMinutes,
    required this.user,
  });

  factory ApiCustomerAuthResponse.fromJson(Map<String, dynamic> json) {
    return ApiCustomerAuthResponse(
      accessToken: (json['access_token'] as String?) ?? '',
      tokenType: (json['token_type'] as String?) ?? "bearer",
      expiresInMinutes: (json['expires_in_minutes'] as num?)?.toInt() ?? 0,
      user: ApiCustomerUserResponse.fromJson((json['user'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'access_token': accessToken,
      'token_type': tokenType,
      'expires_in_minutes': expiresInMinutes,
      'user': user.toJson(),
    };
  }
}

/// Auto-generated OpenAPI model for `CustomerLoginRequest`.
class ApiCustomerLoginRequest {
  final String identifier;
  final String password;

  const ApiCustomerLoginRequest({
    required this.identifier,
    required this.password,
  });

  factory ApiCustomerLoginRequest.fromJson(Map<String, dynamic> json) {
    return ApiCustomerLoginRequest(
      identifier: (json['identifier'] as String?) ?? '',
      password: (json['password'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'identifier': identifier,
      'password': password,
    };
  }
}

/// Auto-generated OpenAPI model for `CustomerRegisterRequest`.
class ApiCustomerRegisterRequest {
  final String fullName;
  final String phone;
  final String? email;
  final String password;

  const ApiCustomerRegisterRequest({
    required this.fullName,
    required this.phone,
    this.email,
    required this.password,
  });

  factory ApiCustomerRegisterRequest.fromJson(Map<String, dynamic> json) {
    return ApiCustomerRegisterRequest(
      fullName: (json['full_name'] as String?) ?? '',
      phone: (json['phone'] as String?) ?? '',
      email: json['email'] as String?,
      password: (json['password'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'full_name': fullName,
      'phone': phone,
      'email': email,
      'password': password,
    };
  }
}

/// Auto-generated OpenAPI model for `CustomerUpdateRequest`.
class ApiCustomerUpdateRequest {
  final String? fullName;
  final String? phone;
  final String? email;
  final String? password;

  const ApiCustomerUpdateRequest({
    this.fullName,
    this.phone,
    this.email,
    this.password,
  });

  factory ApiCustomerUpdateRequest.fromJson(Map<String, dynamic> json) {
    return ApiCustomerUpdateRequest(
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      password: json['password'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'full_name': fullName,
      'phone': phone,
      'email': email,
      'password': password,
    };
  }
}

/// Auto-generated OpenAPI model for `CustomerUserResponse`.
class ApiCustomerUserResponse {
  final int id;
  final String fullName;
  final String phone;
  final String? email;
  final int loyaltyStamps;
  final bool isActive;
  final String createdAt;
  final String? lastLoginAt;

  const ApiCustomerUserResponse({
    required this.id,
    required this.fullName,
    required this.phone,
    this.email,
    required this.loyaltyStamps,
    required this.isActive,
    required this.createdAt,
    this.lastLoginAt,
  });

  factory ApiCustomerUserResponse.fromJson(Map<String, dynamic> json) {
    return ApiCustomerUserResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      fullName: (json['full_name'] as String?) ?? '',
      phone: (json['phone'] as String?) ?? '',
      email: json['email'] as String?,
      loyaltyStamps: (json['loyalty_stamps'] as num?)?.toInt() ?? 0,
      isActive: (json['is_active'] as bool?) ?? false,
      createdAt: (json['created_at'] as String?) ?? '',
      lastLoginAt: json['last_login_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'full_name': fullName,
      'phone': phone,
      'email': email,
      'loyalty_stamps': loyaltyStamps,
      'is_active': isActive,
      'created_at': createdAt,
      'last_login_at': lastLoginAt,
    };
  }
}

/// Auto-generated OpenAPI model for `DailySalesPoint`.
class ApiDailySalesPoint {
  final String date;
  final int totalOrders;
  final int completedOrders;
  final int activeOrders;
  final int cancelledOrders;
  final double completedSalesUsd;
  final double completedSalesKhr;
  final double activePipelineUsd;

  const ApiDailySalesPoint({
    required this.date,
    required this.totalOrders,
    required this.completedOrders,
    required this.activeOrders,
    required this.cancelledOrders,
    required this.completedSalesUsd,
    required this.completedSalesKhr,
    required this.activePipelineUsd,
  });

  factory ApiDailySalesPoint.fromJson(Map<String, dynamic> json) {
    return ApiDailySalesPoint(
      date: (json['date'] as String?) ?? '',
      totalOrders: (json['total_orders'] as num?)?.toInt() ?? 0,
      completedOrders: (json['completed_orders'] as num?)?.toInt() ?? 0,
      activeOrders: (json['active_orders'] as num?)?.toInt() ?? 0,
      cancelledOrders: (json['cancelled_orders'] as num?)?.toInt() ?? 0,
      completedSalesUsd: (json['completed_sales_usd'] as num?)?.toDouble() ?? 0.0,
      completedSalesKhr: (json['completed_sales_khr'] as num?)?.toDouble() ?? 0.0,
      activePipelineUsd: (json['active_pipeline_usd'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'date': date,
      'total_orders': totalOrders,
      'completed_orders': completedOrders,
      'active_orders': activeOrders,
      'cancelled_orders': cancelledOrders,
      'completed_sales_usd': completedSalesUsd,
      'completed_sales_khr': completedSalesKhr,
      'active_pipeline_usd': activePipelineUsd,
    };
  }
}

/// Auto-generated OpenAPI model for `DashboardSummaryResponse`.
class ApiDashboardSummaryResponse {
  final int totalOrders;
  final int pendingOrders;
  final int preparingOrders;
  final int completedOrders;
  final int cancelledOrders;
  final int todayOrdersCount;
  final int todayCompletedOrdersCount;
  final double todayCompletedSalesUsd;
  final double todayCompletedSalesKhr;
  final double todayActivePipelineUsd;
  final double todayActivePipelineKhr;
  final int exchangeRateKhr;
  final String salesCalculationNote;
  final ApiProductAvailabilitySummary productAvailability;
  final List<ApiPopularDrinkItem> popularDrinks;
  final List<ApiOrderResponse> recentOrders;

  const ApiDashboardSummaryResponse({
    required this.totalOrders,
    required this.pendingOrders,
    required this.preparingOrders,
    required this.completedOrders,
    required this.cancelledOrders,
    required this.todayOrdersCount,
    required this.todayCompletedOrdersCount,
    required this.todayCompletedSalesUsd,
    required this.todayCompletedSalesKhr,
    required this.todayActivePipelineUsd,
    required this.todayActivePipelineKhr,
    required this.exchangeRateKhr,
    required this.salesCalculationNote,
    required this.productAvailability,
    required this.popularDrinks,
    required this.recentOrders,
  });

  factory ApiDashboardSummaryResponse.fromJson(Map<String, dynamic> json) {
    return ApiDashboardSummaryResponse(
      totalOrders: (json['total_orders'] as num?)?.toInt() ?? 0,
      pendingOrders: (json['pending_orders'] as num?)?.toInt() ?? 0,
      preparingOrders: (json['preparing_orders'] as num?)?.toInt() ?? 0,
      completedOrders: (json['completed_orders'] as num?)?.toInt() ?? 0,
      cancelledOrders: (json['cancelled_orders'] as num?)?.toInt() ?? 0,
      todayOrdersCount: (json['today_orders_count'] as num?)?.toInt() ?? 0,
      todayCompletedOrdersCount: (json['today_completed_orders_count'] as num?)?.toInt() ?? 0,
      todayCompletedSalesUsd: (json['today_completed_sales_usd'] as num?)?.toDouble() ?? 0.0,
      todayCompletedSalesKhr: (json['today_completed_sales_khr'] as num?)?.toDouble() ?? 0.0,
      todayActivePipelineUsd: (json['today_active_pipeline_usd'] as num?)?.toDouble() ?? 0.0,
      todayActivePipelineKhr: (json['today_active_pipeline_khr'] as num?)?.toDouble() ?? 0.0,
      exchangeRateKhr: (json['exchange_rate_khr'] as num?)?.toInt() ?? 0,
      salesCalculationNote: (json['sales_calculation_note'] as String?) ?? '',
      productAvailability: ApiProductAvailabilitySummary.fromJson((json['product_availability'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
      popularDrinks: (json['popular_drinks'] as List<dynamic>?)?.map((e) => ApiPopularDrinkItem.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiPopularDrinkItem>[],
      recentOrders: (json['recent_orders'] as List<dynamic>?)?.map((e) => ApiOrderResponse.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiOrderResponse>[],
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'total_orders': totalOrders,
      'pending_orders': pendingOrders,
      'preparing_orders': preparingOrders,
      'completed_orders': completedOrders,
      'cancelled_orders': cancelledOrders,
      'today_orders_count': todayOrdersCount,
      'today_completed_orders_count': todayCompletedOrdersCount,
      'today_completed_sales_usd': todayCompletedSalesUsd,
      'today_completed_sales_khr': todayCompletedSalesKhr,
      'today_active_pipeline_usd': todayActivePipelineUsd,
      'today_active_pipeline_khr': todayActivePipelineKhr,
      'exchange_rate_khr': exchangeRateKhr,
      'sales_calculation_note': salesCalculationNote,
      'product_availability': productAvailability.toJson(),
      'popular_drinks': popularDrinks.map((e) => e.toJson()).toList(),
      'recent_orders': recentOrders.map((e) => e.toJson()).toList(),
    };
  }
}

/// Auto-generated OpenAPI model for `HTTPValidationError`.
class ApiHTTPValidationError {
  final List<ApiValidationError>? detail;

  const ApiHTTPValidationError({
    this.detail,
  });

  factory ApiHTTPValidationError.fromJson(Map<String, dynamic> json) {
    return ApiHTTPValidationError(
      detail: (json['detail'] as List<dynamic>?)?.map((e) => ApiValidationError.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'detail': detail?.map((e) => e.toJson()).toList(),
    };
  }
}

/// Auto-generated OpenAPI model for `HealthCheckResponse`.
class ApiHealthCheckResponse {
  final String status;
  final String message;
  final String app;
  final String version;
  final String environment;

  const ApiHealthCheckResponse({
    required this.status,
    required this.message,
    required this.app,
    required this.version,
    required this.environment,
  });

  factory ApiHealthCheckResponse.fromJson(Map<String, dynamic> json) {
    return ApiHealthCheckResponse(
      status: (json['status'] as String?) ?? '',
      message: (json['message'] as String?) ?? '',
      app: (json['app'] as String?) ?? '',
      version: (json['version'] as String?) ?? '',
      environment: (json['environment'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'status': status,
      'message': message,
      'app': app,
      'version': version,
      'environment': environment,
    };
  }
}

/// Auto-generated OpenAPI model for `LoginResponse`.
class ApiLoginResponse {
  final String accessToken;
  final String tokenType;
  final int expiresInMinutes;
  final ApiStaffUserResponse user;

  const ApiLoginResponse({
    required this.accessToken,
    required this.tokenType,
    required this.expiresInMinutes,
    required this.user,
  });

  factory ApiLoginResponse.fromJson(Map<String, dynamic> json) {
    return ApiLoginResponse(
      accessToken: (json['access_token'] as String?) ?? '',
      tokenType: (json['token_type'] as String?) ?? "bearer",
      expiresInMinutes: (json['expires_in_minutes'] as num?)?.toInt() ?? 0,
      user: ApiStaffUserResponse.fromJson((json['user'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'access_token': accessToken,
      'token_type': tokenType,
      'expires_in_minutes': expiresInMinutes,
      'user': user.toJson(),
    };
  }
}

/// Auto-generated OpenAPI model for `OrderCreate`.
class ApiOrderCreate {
  final String customerName;
  final String customerPhone;
  final List<ApiOrderItemCreate> items;

  const ApiOrderCreate({
    required this.customerName,
    required this.customerPhone,
    required this.items,
  });

  factory ApiOrderCreate.fromJson(Map<String, dynamic> json) {
    return ApiOrderCreate(
      customerName: (json['customer_name'] as String?) ?? '',
      customerPhone: (json['customer_phone'] as String?) ?? '',
      items: (json['items'] as List<dynamic>?)?.map((e) => ApiOrderItemCreate.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiOrderItemCreate>[],
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

/// Auto-generated OpenAPI model for `OrderItemCreate`.
class ApiOrderItemCreate {
  final int productId;
  final int quantity;
  final String size;
  final String sugarLevel;
  final String iceLevel;
  final List<String>? toppings;
  final String? productName;
  final double? unitPriceUsd;
  final double? subtotalUsd;

  const ApiOrderItemCreate({
    required this.productId,
    required this.quantity,
    required this.size,
    required this.sugarLevel,
    required this.iceLevel,
    this.toppings,
    this.productName,
    this.unitPriceUsd,
    this.subtotalUsd,
  });

  factory ApiOrderItemCreate.fromJson(Map<String, dynamic> json) {
    return ApiOrderItemCreate(
      productId: (json['product_id'] as num?)?.toInt() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      size: (json['size'] as String?) ?? '',
      sugarLevel: (json['sugar_level'] as String?) ?? '',
      iceLevel: (json['ice_level'] as String?) ?? '',
      toppings: (json['toppings'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      productName: json['product_name'] as String?,
      unitPriceUsd: (json['unit_price_usd'] as num?)?.toDouble(),
      subtotalUsd: (json['subtotal_usd'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'product_id': productId,
      'quantity': quantity,
      'size': size,
      'sugar_level': sugarLevel,
      'ice_level': iceLevel,
      'toppings': toppings,
      'product_name': productName,
      'unit_price_usd': unitPriceUsd,
      'subtotal_usd': subtotalUsd,
    };
  }
}

/// Auto-generated OpenAPI model for `OrderItemResponse`.
class ApiOrderItemResponse {
  final int id;
  final int orderId;
  final int? productId;
  final String productName;
  final int quantity;
  final double unitPriceUsd;
  final double subtotalUsd;
  final String size;
  final String sugarLevel;
  final String iceLevel;
  final String toppings;

  const ApiOrderItemResponse({
    required this.id,
    required this.orderId,
    this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPriceUsd,
    required this.subtotalUsd,
    required this.size,
    required this.sugarLevel,
    required this.iceLevel,
    required this.toppings,
  });

  factory ApiOrderItemResponse.fromJson(Map<String, dynamic> json) {
    return ApiOrderItemResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      orderId: (json['order_id'] as num?)?.toInt() ?? 0,
      productId: (json['product_id'] as num?)?.toInt(),
      productName: (json['product_name'] as String?) ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      unitPriceUsd: (json['unit_price_usd'] as num?)?.toDouble() ?? 0.0,
      subtotalUsd: (json['subtotal_usd'] as num?)?.toDouble() ?? 0.0,
      size: (json['size'] as String?) ?? '',
      sugarLevel: (json['sugar_level'] as String?) ?? '',
      iceLevel: (json['ice_level'] as String?) ?? '',
      toppings: (json['toppings'] as String?) ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'order_id': orderId,
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

/// Auto-generated OpenAPI model for `OrderResponse`.
class ApiOrderResponse {
  final int id;
  final int? orderId;
  final String orderNumber;
  final String customerName;
  final String customerPhone;
  final double subtotalUsd;
  final double totalUsd;
  final double totalKhr;
  final String paymentStatus;
  final String orderStatus;
  final String createdAt;
  final List<ApiOrderItemResponse> items;

  const ApiOrderResponse({
    required this.id,
    this.orderId,
    required this.orderNumber,
    required this.customerName,
    required this.customerPhone,
    required this.subtotalUsd,
    required this.totalUsd,
    required this.totalKhr,
    required this.paymentStatus,
    required this.orderStatus,
    required this.createdAt,
    required this.items,
  });

  factory ApiOrderResponse.fromJson(Map<String, dynamic> json) {
    return ApiOrderResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      orderId: (json['order_id'] as num?)?.toInt(),
      orderNumber: (json['order_number'] as String?) ?? '',
      customerName: (json['customer_name'] as String?) ?? '',
      customerPhone: (json['customer_phone'] as String?) ?? '',
      subtotalUsd: (json['subtotal_usd'] as num?)?.toDouble() ?? 0.0,
      totalUsd: (json['total_usd'] as num?)?.toDouble() ?? 0.0,
      totalKhr: (json['total_khr'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: (json['payment_status'] as String?) ?? '',
      orderStatus: (json['order_status'] as String?) ?? '',
      createdAt: (json['created_at'] as String?) ?? '',
      items: (json['items'] as List<dynamic>?)?.map((e) => ApiOrderItemResponse.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiOrderItemResponse>[],
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'order_id': orderId,
      'order_number': orderNumber,
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'subtotal_usd': subtotalUsd,
      'total_usd': totalUsd,
      'total_khr': totalKhr,
      'payment_status': paymentStatus,
      'order_status': orderStatus,
      'created_at': createdAt,
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

/// Auto-generated OpenAPI model for `OrderStatusUpdateRequest`.
class ApiOrderStatusUpdateRequest {
  final String orderStatus;

  const ApiOrderStatusUpdateRequest({
    required this.orderStatus,
  });

  factory ApiOrderStatusUpdateRequest.fromJson(Map<String, dynamic> json) {
    return ApiOrderStatusUpdateRequest(
      orderStatus: (json['order_status'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'order_status': orderStatus,
    };
  }
}

/// Auto-generated OpenAPI model for `PeriodSummary`.
class ApiPeriodSummary {
  final String periodLabel;
  final int ordersCount;
  final int completedOrdersCount;
  final double completedSalesUsd;
  final double completedSalesKhr;

  const ApiPeriodSummary({
    required this.periodLabel,
    required this.ordersCount,
    required this.completedOrdersCount,
    required this.completedSalesUsd,
    required this.completedSalesKhr,
  });

  factory ApiPeriodSummary.fromJson(Map<String, dynamic> json) {
    return ApiPeriodSummary(
      periodLabel: (json['period_label'] as String?) ?? '',
      ordersCount: (json['orders_count'] as num?)?.toInt() ?? 0,
      completedOrdersCount: (json['completed_orders_count'] as num?)?.toInt() ?? 0,
      completedSalesUsd: (json['completed_sales_usd'] as num?)?.toDouble() ?? 0.0,
      completedSalesKhr: (json['completed_sales_khr'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'period_label': periodLabel,
      'orders_count': ordersCount,
      'completed_orders_count': completedOrdersCount,
      'completed_sales_usd': completedSalesUsd,
      'completed_sales_khr': completedSalesKhr,
    };
  }
}

/// Auto-generated OpenAPI model for `PopularDrinkItem`.
class ApiPopularDrinkItem {
  final int? productId;
  final String productName;
  final int totalQuantitySold;
  final int orderCount;
  final double orderValueUsd;
  final double orderValueKhr;

  const ApiPopularDrinkItem({
    this.productId,
    required this.productName,
    required this.totalQuantitySold,
    required this.orderCount,
    required this.orderValueUsd,
    required this.orderValueKhr,
  });

  factory ApiPopularDrinkItem.fromJson(Map<String, dynamic> json) {
    return ApiPopularDrinkItem(
      productId: (json['product_id'] as num?)?.toInt(),
      productName: (json['product_name'] as String?) ?? '',
      totalQuantitySold: (json['total_quantity_sold'] as num?)?.toInt() ?? 0,
      orderCount: (json['order_count'] as num?)?.toInt() ?? 0,
      orderValueUsd: (json['order_value_usd'] as num?)?.toDouble() ?? 0.0,
      orderValueKhr: (json['order_value_khr'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'product_id': productId,
      'product_name': productName,
      'total_quantity_sold': totalQuantitySold,
      'order_count': orderCount,
      'order_value_usd': orderValueUsd,
      'order_value_khr': orderValueKhr,
    };
  }
}

/// Auto-generated OpenAPI model for `ProductAdminCreate`.
class ApiProductAdminCreate {
  final String name;
  final int categoryId;
  final String? description;
  final String? image;
  final double basePriceUsd;
  final bool isAvailable;

  const ApiProductAdminCreate({
    required this.name,
    required this.categoryId,
    this.description,
    this.image,
    required this.basePriceUsd,
    required this.isAvailable,
  });

  factory ApiProductAdminCreate.fromJson(Map<String, dynamic> json) {
    return ApiProductAdminCreate(
      name: (json['name'] as String?) ?? '',
      categoryId: (json['category_id'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      image: json['image'] as String?,
      basePriceUsd: (json['base_price_usd'] as num?)?.toDouble() ?? 0.0,
      isAvailable: (json['is_available'] as bool?) ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'category_id': categoryId,
      'description': description,
      'image': image,
      'base_price_usd': basePriceUsd,
      'is_available': isAvailable,
    };
  }
}

/// Auto-generated OpenAPI model for `ProductAdminUpdate`.
class ApiProductAdminUpdate {
  final String? name;
  final int? categoryId;
  final String? description;
  final String? image;
  final double? basePriceUsd;
  final bool? isAvailable;

  const ApiProductAdminUpdate({
    this.name,
    this.categoryId,
    this.description,
    this.image,
    this.basePriceUsd,
    this.isAvailable,
  });

  factory ApiProductAdminUpdate.fromJson(Map<String, dynamic> json) {
    return ApiProductAdminUpdate(
      name: json['name'] as String?,
      categoryId: (json['category_id'] as num?)?.toInt(),
      description: json['description'] as String?,
      image: json['image'] as String?,
      basePriceUsd: (json['base_price_usd'] as num?)?.toDouble(),
      isAvailable: json['is_available'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'category_id': categoryId,
      'description': description,
      'image': image,
      'base_price_usd': basePriceUsd,
      'is_available': isAvailable,
    };
  }
}

/// Auto-generated OpenAPI model for `ProductAvailabilitySummary`.
class ApiProductAvailabilitySummary {
  final int totalProducts;
  final int availableProducts;
  final int unavailableProducts;
  final int totalCategories;
  final int activeCategories;

  const ApiProductAvailabilitySummary({
    required this.totalProducts,
    required this.availableProducts,
    required this.unavailableProducts,
    required this.totalCategories,
    required this.activeCategories,
  });

  factory ApiProductAvailabilitySummary.fromJson(Map<String, dynamic> json) {
    return ApiProductAvailabilitySummary(
      totalProducts: (json['total_products'] as num?)?.toInt() ?? 0,
      availableProducts: (json['available_products'] as num?)?.toInt() ?? 0,
      unavailableProducts: (json['unavailable_products'] as num?)?.toInt() ?? 0,
      totalCategories: (json['total_categories'] as num?)?.toInt() ?? 0,
      activeCategories: (json['active_categories'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'total_products': totalProducts,
      'available_products': availableProducts,
      'unavailable_products': unavailableProducts,
      'total_categories': totalCategories,
      'active_categories': activeCategories,
    };
  }
}

/// Auto-generated OpenAPI model for `ProductResponse`.
class ApiProductResponse {
  final String name;
  final int categoryId;
  final String? description;
  final String? image;
  final double basePriceUsd;
  final bool isAvailable;
  final int id;
  final String createdAt;
  final String? categoryName;
  final ApiCategoryResponse? category;

  const ApiProductResponse({
    required this.name,
    required this.categoryId,
    this.description,
    this.image,
    required this.basePriceUsd,
    required this.isAvailable,
    required this.id,
    required this.createdAt,
    this.categoryName,
    this.category,
  });

  factory ApiProductResponse.fromJson(Map<String, dynamic> json) {
    return ApiProductResponse(
      name: (json['name'] as String?) ?? '',
      categoryId: (json['category_id'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      image: json['image'] as String?,
      basePriceUsd: (json['base_price_usd'] as num?)?.toDouble() ?? 0.0,
      isAvailable: (json['is_available'] as bool?) ?? true,
      id: (json['id'] as num?)?.toInt() ?? 0,
      createdAt: (json['created_at'] as String?) ?? '',
      categoryName: json['category_name'] as String?,
      category: json['category'] != null ? ApiCategoryResponse.fromJson(json['category'] as Map<String, dynamic>) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'category_id': categoryId,
      'description': description,
      'image': image,
      'base_price_usd': basePriceUsd,
      'is_available': isAvailable,
      'id': id,
      'created_at': createdAt,
      'category_name': categoryName,
      'category': category?.toJson(),
    };
  }
}

/// Auto-generated OpenAPI model for `ProductSummary`.
class ApiProductSummary {
  final int id;
  final String name;
  final String? description;
  final double basePriceUsd;
  final String? image;
  final bool isAvailable;

  const ApiProductSummary({
    required this.id,
    required this.name,
    this.description,
    required this.basePriceUsd,
    this.image,
    required this.isAvailable,
  });

  factory ApiProductSummary.fromJson(Map<String, dynamic> json) {
    return ApiProductSummary(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      description: json['description'] as String?,
      basePriceUsd: (json['base_price_usd'] as num?)?.toDouble() ?? 0.0,
      image: json['image'] as String?,
      isAvailable: (json['is_available'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'description': description,
      'base_price_usd': basePriceUsd,
      'image': image,
      'is_available': isAvailable,
    };
  }
}

/// Auto-generated OpenAPI model for `SalesReportResponse`.
class ApiSalesReportResponse {
  final String dateFrom;
  final String dateTo;
  final int exchangeRateKhr;
  final String calculationPolicy;
  final ApiSalesReportSummary summary;
  final ApiPeriodSummary weeklySummary;
  final ApiPeriodSummary monthlySummary;
  final List<ApiDailySalesPoint> dailyBreakdown;
  final List<ApiStatusBreakdownItem> statusBreakdown;
  final List<ApiPopularDrinkItem> productPerformance;

  const ApiSalesReportResponse({
    required this.dateFrom,
    required this.dateTo,
    required this.exchangeRateKhr,
    required this.calculationPolicy,
    required this.summary,
    required this.weeklySummary,
    required this.monthlySummary,
    required this.dailyBreakdown,
    required this.statusBreakdown,
    required this.productPerformance,
  });

  factory ApiSalesReportResponse.fromJson(Map<String, dynamic> json) {
    return ApiSalesReportResponse(
      dateFrom: (json['date_from'] as String?) ?? '',
      dateTo: (json['date_to'] as String?) ?? '',
      exchangeRateKhr: (json['exchange_rate_khr'] as num?)?.toInt() ?? 0,
      calculationPolicy: (json['calculation_policy'] as String?) ?? '',
      summary: ApiSalesReportSummary.fromJson((json['summary'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
      weeklySummary: ApiPeriodSummary.fromJson((json['weekly_summary'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
      monthlySummary: ApiPeriodSummary.fromJson((json['monthly_summary'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
      dailyBreakdown: (json['daily_breakdown'] as List<dynamic>?)?.map((e) => ApiDailySalesPoint.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiDailySalesPoint>[],
      statusBreakdown: (json['status_breakdown'] as List<dynamic>?)?.map((e) => ApiStatusBreakdownItem.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiStatusBreakdownItem>[],
      productPerformance: (json['product_performance'] as List<dynamic>?)?.map((e) => ApiPopularDrinkItem.fromJson(e as Map<String, dynamic>)).toList() ?? const <ApiPopularDrinkItem>[],
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'date_from': dateFrom,
      'date_to': dateTo,
      'exchange_rate_khr': exchangeRateKhr,
      'calculation_policy': calculationPolicy,
      'summary': summary.toJson(),
      'weekly_summary': weeklySummary.toJson(),
      'monthly_summary': monthlySummary.toJson(),
      'daily_breakdown': dailyBreakdown.map((e) => e.toJson()).toList(),
      'status_breakdown': statusBreakdown.map((e) => e.toJson()).toList(),
      'product_performance': productPerformance.map((e) => e.toJson()).toList(),
    };
  }
}

/// Auto-generated OpenAPI model for `SalesReportSummary`.
class ApiSalesReportSummary {
  final int totalOrders;
  final int completedOrders;
  final int activeOrders;
  final int cancelledOrders;
  final double completedSalesUsd;
  final double completedSalesKhr;
  final double activePipelineUsd;
  final double activePipelineKhr;
  final double cancelledValueUsd;
  final double averageCompletedOrderUsd;

  const ApiSalesReportSummary({
    required this.totalOrders,
    required this.completedOrders,
    required this.activeOrders,
    required this.cancelledOrders,
    required this.completedSalesUsd,
    required this.completedSalesKhr,
    required this.activePipelineUsd,
    required this.activePipelineKhr,
    required this.cancelledValueUsd,
    required this.averageCompletedOrderUsd,
  });

  factory ApiSalesReportSummary.fromJson(Map<String, dynamic> json) {
    return ApiSalesReportSummary(
      totalOrders: (json['total_orders'] as num?)?.toInt() ?? 0,
      completedOrders: (json['completed_orders'] as num?)?.toInt() ?? 0,
      activeOrders: (json['active_orders'] as num?)?.toInt() ?? 0,
      cancelledOrders: (json['cancelled_orders'] as num?)?.toInt() ?? 0,
      completedSalesUsd: (json['completed_sales_usd'] as num?)?.toDouble() ?? 0.0,
      completedSalesKhr: (json['completed_sales_khr'] as num?)?.toDouble() ?? 0.0,
      activePipelineUsd: (json['active_pipeline_usd'] as num?)?.toDouble() ?? 0.0,
      activePipelineKhr: (json['active_pipeline_khr'] as num?)?.toDouble() ?? 0.0,
      cancelledValueUsd: (json['cancelled_value_usd'] as num?)?.toDouble() ?? 0.0,
      averageCompletedOrderUsd: (json['average_completed_order_usd'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'total_orders': totalOrders,
      'completed_orders': completedOrders,
      'active_orders': activeOrders,
      'cancelled_orders': cancelledOrders,
      'completed_sales_usd': completedSalesUsd,
      'completed_sales_khr': completedSalesKhr,
      'active_pipeline_usd': activePipelineUsd,
      'active_pipeline_khr': activePipelineKhr,
      'cancelled_value_usd': cancelledValueUsd,
      'average_completed_order_usd': averageCompletedOrderUsd,
    };
  }
}

/// Auto-generated OpenAPI model for `StaffCreateRequest`.
class ApiStaffCreateRequest {
  final String email;
  final String fullName;
  final String password;
  final String role;
  final bool isActive;

  const ApiStaffCreateRequest({
    required this.email,
    required this.fullName,
    required this.password,
    required this.role,
    required this.isActive,
  });

  factory ApiStaffCreateRequest.fromJson(Map<String, dynamic> json) {
    return ApiStaffCreateRequest(
      email: (json['email'] as String?) ?? '',
      fullName: (json['full_name'] as String?) ?? '',
      password: (json['password'] as String?) ?? '',
      role: (json['role'] as String?) ?? "staff",
      isActive: (json['is_active'] as bool?) ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email,
      'full_name': fullName,
      'password': password,
      'role': role,
      'is_active': isActive,
    };
  }
}

/// Auto-generated OpenAPI model for `StaffLoginRequest`.
class ApiStaffLoginRequest {
  final String email;
  final String password;

  const ApiStaffLoginRequest({
    required this.email,
    required this.password,
  });

  factory ApiStaffLoginRequest.fromJson(Map<String, dynamic> json) {
    return ApiStaffLoginRequest(
      email: (json['email'] as String?) ?? '',
      password: (json['password'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email,
      'password': password,
    };
  }
}

/// Auto-generated OpenAPI model for `StaffUpdateRequest`.
class ApiStaffUpdateRequest {
  final String? fullName;
  final String? role;
  final bool? isActive;
  final String? password;

  const ApiStaffUpdateRequest({
    this.fullName,
    this.role,
    this.isActive,
    this.password,
  });

  factory ApiStaffUpdateRequest.fromJson(Map<String, dynamic> json) {
    return ApiStaffUpdateRequest(
      fullName: json['full_name'] as String?,
      role: json['role'] as String?,
      isActive: json['is_active'] as bool?,
      password: json['password'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'full_name': fullName,
      'role': role,
      'is_active': isActive,
      'password': password,
    };
  }
}

/// Auto-generated OpenAPI model for `StaffUserResponse`.
class ApiStaffUserResponse {
  final int id;
  final String email;
  final String fullName;
  final String role;
  final bool isActive;
  final String createdAt;
  final String? lastLoginAt;

  const ApiStaffUserResponse({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.isActive,
    required this.createdAt,
    this.lastLoginAt,
  });

  factory ApiStaffUserResponse.fromJson(Map<String, dynamic> json) {
    return ApiStaffUserResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      email: (json['email'] as String?) ?? '',
      fullName: (json['full_name'] as String?) ?? '',
      role: (json['role'] as String?) ?? '',
      isActive: (json['is_active'] as bool?) ?? false,
      createdAt: (json['created_at'] as String?) ?? '',
      lastLoginAt: json['last_login_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      'is_active': isActive,
      'created_at': createdAt,
      'last_login_at': lastLoginAt,
    };
  }
}

/// Auto-generated OpenAPI model for `StatusBreakdownItem`.
class ApiStatusBreakdownItem {
  final String status;
  final int orderCount;
  final double totalUsd;
  final double totalKhr;

  const ApiStatusBreakdownItem({
    required this.status,
    required this.orderCount,
    required this.totalUsd,
    required this.totalKhr,
  });

  factory ApiStatusBreakdownItem.fromJson(Map<String, dynamic> json) {
    return ApiStatusBreakdownItem(
      status: (json['status'] as String?) ?? '',
      orderCount: (json['order_count'] as num?)?.toInt() ?? 0,
      totalUsd: (json['total_usd'] as num?)?.toDouble() ?? 0.0,
      totalKhr: (json['total_khr'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'status': status,
      'order_count': orderCount,
      'total_usd': totalUsd,
      'total_khr': totalKhr,
    };
  }
}

/// Auto-generated OpenAPI model for `ValidationError`.
class ApiValidationError {
  final List<Object> loc;
  final String msg;
  final String type;
  final Object? input;
  final Map<String, dynamic>? ctx;

  const ApiValidationError({
    required this.loc,
    required this.msg,
    required this.type,
    this.input,
    this.ctx,
  });

  factory ApiValidationError.fromJson(Map<String, dynamic> json) {
    return ApiValidationError(
      loc: (json['loc'] as List<dynamic>?)?.cast<Object>() ?? const <Object>[],
      msg: (json['msg'] as String?) ?? '',
      type: (json['type'] as String?) ?? '',
      input: json['input'],
      ctx: json['ctx'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'loc': loc,
      'msg': msg,
      'type': type,
      'input': input,
      'ctx': ctx,
    };
  }
}

/// Auto-generated OpenAPI route path constants.
class OpenApiEndpoints {
  OpenApiEndpoints._();

  static const String rootGet = "/";
  static const String loginStaffApiAdminAuthLoginPost = "/api/admin/auth/login";
  static const String getMeApiAdminAuthMeGet = "/api/admin/auth/me";
  static const String listAdminCategoriesApiAdminCategoriesGet = "/api/admin/categories";
  static const String createAdminCategoryApiAdminCategoriesPost = "/api/admin/categories";
  static const String updateAdminCategoryApiAdminCategoriesCategoryIdPatch = "/api/admin/categories/{category_id}";
  static const String deleteAdminCategoryApiAdminCategoriesCategoryIdDelete = "/api/admin/categories/{category_id}";
  static const String getDashboardSummaryApiAdminDashboardSummaryGet = "/api/admin/dashboard/summary";
  static const String listOrdersApiAdminOrdersGet = "/api/admin/orders";
  static const String getOrderDetailApiAdminOrdersOrderIdGet = "/api/admin/orders/{order_id}";
  static const String patchOrderStatusApiAdminOrdersOrderIdStatusPatch = "/api/admin/orders/{order_id}/status";
  static const String listAdminProductsApiAdminProductsGet = "/api/admin/products";
  static const String createAdminProductApiAdminProductsPost = "/api/admin/products";
  static const String updateAdminProductApiAdminProductsProductIdPatch = "/api/admin/products/{product_id}";
  static const String deleteAdminProductApiAdminProductsProductIdDelete = "/api/admin/products/{product_id}";
  static const String getSalesReportApiAdminReportsSalesGet = "/api/admin/reports/sales";
  static const String listStaffAccountsApiAdminStaffGet = "/api/admin/staff";
  static const String createStaffAccountApiAdminStaffPost = "/api/admin/staff";
  static const String updateStaffAccountApiAdminStaffStaffIdPatch = "/api/admin/staff/{staff_id}";
  static const String loginCustomerAccountApiAuthLoginPost = "/api/auth/login";
  static const String getMyCustomerProfileApiAuthMeGet = "/api/auth/me";
  static const String updateMyCustomerProfileApiAuthMePatch = "/api/auth/me";
  static const String registerCustomerAccountApiAuthRegisterPost = "/api/auth/register";
  static const String getCategoriesApiCategoriesGet = "/api/categories";
  static const String getCategoryByIdApiCategoriesCategoryIdGet = "/api/categories/{category_id}";
  static const String healthCheckApiHealthGet = "/api/health";
  static const String createNewOrderApiOrdersPost = "/api/orders";
  static const String getOrdersByCustomerPhoneApiOrdersLookupPhoneGet = "/api/orders/lookup/phone";
  static const String getOrderByNumberApiOrdersRefOrderNumberGet = "/api/orders/ref/{order_number}";
  static const String getOrderByIdApiOrdersIdGet = "/api/orders/{id}";
  static const String getProductsApiProductsGet = "/api/products";
  static const String getProductByIdApiProductsProductIdGet = "/api/products/{product_id}";
}
