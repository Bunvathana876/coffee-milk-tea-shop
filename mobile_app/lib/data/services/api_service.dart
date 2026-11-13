import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/app_config.dart';
import '../models/category_model.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import '../models/cart_item_model.dart';

/// HTTP service for the Brew & Boba Express API.
/// Includes connection timeout, friendly exception handling, and JSON parsing.
class ApiService {
  String _baseUrl;
  String _authToken = '';
  final http.Client _client;

  ApiService({String? baseUrl, http.Client? client})
    : _baseUrl = baseUrl ?? AppConfig.defaultApiBaseUrl,
      _client = client ?? http.Client();

  String get baseUrl => _baseUrl;

  void updateBaseUrl(String newUrl) {
    _baseUrl = newUrl.endsWith('/')
        ? newUrl.substring(0, newUrl.length - 1)
        : newUrl;
  }

  void updateAuthToken(String token) {
    _authToken = token;
  }

  Map<String, String> get _orderHeaders => {
    'Authorization': 'Bearer $_authToken',
  };

  static const Duration timeoutDuration = Duration(seconds: 8);

  OrderModel _parseServerOrder(http.Response response) {
    if (response.bodyBytes.isEmpty) {
      throw const FormatException('Empty order response.');
    }
    return _parseServerOrderData(jsonDecode(utf8.decode(response.bodyBytes)));
  }

  OrderModel _parseServerOrderData(Object? decoded) {
    if (decoded is! Map<String, dynamic> ||
        decoded['id'] is! int ||
        (decoded['id'] as int) <= 0 ||
        decoded['order_number'] is! String ||
        (decoded['order_number'] as String).trim().isEmpty ||
        decoded['customer_name'] is! String ||
        decoded['customer_phone'] is! String ||
        decoded['subtotal_usd'] is! num ||
        decoded['total_usd'] is! num ||
        decoded['total_khr'] is! num ||
        decoded['payment_status'] is! String ||
        (decoded['payment_status'] as String).isEmpty ||
        decoded['order_status'] is! String ||
        (decoded['order_status'] as String).isEmpty ||
        decoded['created_at'] is! String ||
        DateTime.tryParse(decoded['created_at'] as String) == null ||
        decoded['items'] is! List ||
        (decoded['items'] as List).isEmpty ||
        !(decoded['items'] as List).every(
          (item) =>
              item is Map<String, dynamic> &&
              item['id'] is int &&
              item['product_name'] is String &&
              item['quantity'] is int &&
              (item['quantity'] as int) > 0 &&
              item['unit_price_usd'] is num &&
              item['subtotal_usd'] is num,
        )) {
      throw const FormatException('Invalid order response.');
    }
    return OrderModel.fromJson(decoded);
  }

  List<OrderModel> _parseServerOrderList(http.Response response) {
    if (response.bodyBytes.isEmpty) {
      throw const FormatException('Empty order history response.');
    }
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (decoded is! List) {
      throw const FormatException('Invalid order history response.');
    }
    return decoded.map((item) => _parseServerOrderData(item)).toList();
  }

  // -------------------------------------------------------------
  // Health Check
  // -------------------------------------------------------------
  Future<bool> checkHealth() async {
    try {
      final uri = Uri.parse('$_baseUrl/api/health');
      final res = await _client.get(uri).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  Future<List<CategoryModel>> getCategories({bool activeOnly = true}) async {
    try {
      final uri = Uri.parse(
        '$_baseUrl/api/categories',
      ).replace(queryParameters: {'active_only': activeOnly.toString()});
      final response = await _client.get(uri).timeout(timeoutDuration);

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(
          utf8.decode(response.bodyBytes),
        );
        return jsonList
            .map((item) => CategoryModel.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw HttpException(
          'Failed to load categories: ${response.statusCode}',
        );
      }
    } on SocketException {
      throw const SocketException(
        'Unable to reach café server. Please check your network.',
      );
    } on TimeoutException {
      throw TimeoutException(
        'Request timed out while connecting to café server.',
      );
    }
  }

  // -------------------------------------------------------------
  // Products
  // -------------------------------------------------------------
  Future<List<ProductModel>> getProducts({
    int? categoryId,
    String? search,
    bool isAvailable = true,
  }) async {
    try {
      final params = <String, String>{'is_available': isAvailable.toString()};
      if (categoryId != null) {
        params['category_id'] = categoryId.toString();
      }
      if (search != null && search.trim().isNotEmpty) {
        params['search'] = search.trim();
      }

      final uri = Uri.parse(
        '$_baseUrl/api/products',
      ).replace(queryParameters: params);
      final response = await _client.get(uri).timeout(timeoutDuration);

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(
          utf8.decode(response.bodyBytes),
        );
        return jsonList
            .map((item) => ProductModel.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw HttpException('Failed to load products: ${response.statusCode}');
      }
    } on SocketException {
      throw const SocketException(
        'Unable to reach café server. Please check your network.',
      );
    } on TimeoutException {
      throw TimeoutException(
        'Request timed out while connecting to café server.',
      );
    }
  }

  // -------------------------------------------------------------
  // Orders: Create New Order
  // -------------------------------------------------------------
  Future<OrderModel> createOrder({
    required String customerName,
    required String customerPhone,
    required List<CartItemModel> items,
    String paymentMethod = 'cash',
    String? idempotencyKey,
  }) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/orders');
      final body = jsonEncode({
        'customer_name': customerName.trim(),
        'customer_phone': customerPhone.trim(),
        'payment_method': paymentMethod,
        'items': items.map((item) => item.toOrderItemPayload()).toList(),
      });
      final headers = {'Content-Type': 'application/json', ..._orderHeaders};
      if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;

      final response = await _client
          .post(uri, headers: headers, body: body)
          .timeout(timeoutDuration);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return _parseServerOrder(response);
      } else {
        if (response.statusCode == 401 || response.statusCode == 403) {
          throw const HttpException(
            'Please sign in to place a confirmed order.',
          );
        }
        if (response.statusCode == 409) {
          throw const HttpException(
            'This retry conflicts with an earlier order. Please review your cart.',
          );
        }
        if (response.statusCode == 400 || response.statusCode == 422) {
          throw const HttpException(
            'Please review your order details and try again.',
          );
        }
        throw const HttpException(
          'The café could not confirm this order. Please try again.',
        );
      }
    } on SocketException {
      throw const SocketException(
        'Unable to reach café server to place order.',
      );
    } on TimeoutException {
      throw TimeoutException('Order request timed out.');
    }
  }

  // -------------------------------------------------------------
  // Orders: Lookup by Customer Phone
  // -------------------------------------------------------------
  Future<List<OrderModel>> getMyOrders() async {
    final uri = Uri.parse('$_baseUrl/api/orders');
    final response = await _client
        .get(uri, headers: _orderHeaders)
        .timeout(timeoutDuration);
    if (response.statusCode == 200) return _parseServerOrderList(response);
    if (response.statusCode == 401 || response.statusCode == 403) {
      throw const HttpException('Please sign in to view your orders.');
    }
    throw const HttpException(
      'Order history is unavailable. Please try again.',
    );
  }

  Future<List<OrderModel>> getOrdersByPhone(String phone) async {
    try {
      final uri = Uri.parse(
        '$_baseUrl/api/orders/lookup/phone',
      ).replace(queryParameters: {'phone': phone.trim()});
      final response = await _client
          .get(uri, headers: _orderHeaders)
          .timeout(timeoutDuration);

      if (response.statusCode == 200) {
        return _parseServerOrderList(response);
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        throw const HttpException('Please sign in to view your orders.');
      } else {
        throw const HttpException(
          'Order history is unavailable. Please try again.',
        );
      }
    } on SocketException {
      throw const SocketException('Unable to connect to café server.');
    } on TimeoutException {
      throw TimeoutException('Lookup request timed out.');
    }
  }

  // -------------------------------------------------------------
  // Orders: Lookup by Order Number (Reference)
  // -------------------------------------------------------------
  Future<OrderModel> getOrderByReference(String orderNumber) async {
    try {
      final cleanRef = Uri.encodeComponent(orderNumber.trim());
      final uri = Uri.parse('$_baseUrl/api/orders/ref/$cleanRef');
      final response = await _client
          .get(uri, headers: _orderHeaders)
          .timeout(timeoutDuration);

      if (response.statusCode == 200) {
        return _parseServerOrder(response);
      } else if (response.statusCode == 404) {
        throw const HttpException(
          'Order not found. Please verify your reference number.',
        );
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        throw const HttpException('Please sign in to view your orders.');
      } else {
        throw const HttpException(
          'Order lookup is unavailable. Please try again.',
        );
      }
    } on SocketException {
      throw const SocketException('Unable to reach café server.');
    } on TimeoutException {
      throw TimeoutException('Order lookup timed out.');
    }
  }

  // -------------------------------------------------------------
  // Customer Authentication: Register & Login
  // -------------------------------------------------------------
  Future<Map<String, dynamic>> registerCustomer({
    required String fullName,
    required String phone,
    String? email,
    required String password,
  }) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/auth/register');
      final payload = <String, dynamic>{
        'full_name': fullName.trim(),
        'phone': phone.trim(),
        'password': password,
      };
      if (email != null && email.trim().isNotEmpty) {
        payload['email'] = email.trim();
      }

      final response = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(timeoutDuration);

      final Map<String, dynamic> jsonData = jsonDecode(
        utf8.decode(response.bodyBytes),
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonData;
      } else {
        final detail = jsonData['detail'] ?? 'Registration failed.';
        throw HttpException(detail.toString());
      }
    } on SocketException {
      throw const SocketException('Unable to reach café server.');
    } on TimeoutException {
      throw TimeoutException('Registration request timed out.');
    }
  }

  Future<Map<String, dynamic>> loginCustomer({
    required String identifier,
    required String password,
  }) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/auth/login');
      final response = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'identifier': identifier.trim(),
              'password': password,
            }),
          )
          .timeout(timeoutDuration);

      final Map<String, dynamic> jsonData = jsonDecode(
        utf8.decode(response.bodyBytes),
      );
      if (response.statusCode == 200) {
        return jsonData;
      } else {
        final detail = jsonData['detail'] ?? 'Invalid credentials.';
        throw HttpException(detail.toString());
      }
    } on SocketException {
      throw const SocketException('Unable to reach café server.');
    } on TimeoutException {
      throw TimeoutException('Login request timed out.');
    }
  }

  Future<Map<String, dynamic>> getCustomerMe(String token) async {
    final uri = Uri.parse('$_baseUrl/api/auth/me');
    final response = await _client
        .get(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        )
        .timeout(timeoutDuration);

    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes))
          as Map<String, dynamic>;
    }
    throw const HttpException('Unable to refresh your café rewards right now.');
  }
}
