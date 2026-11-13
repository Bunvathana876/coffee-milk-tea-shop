import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import '../models/order_model.dart';
import '../models/cart_item_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';

/// Server orders and retry keys. A network failure never creates an OrderModel.
class OrderRepository {
  final ApiService _apiService;
  final LocalStorageService _localStorageService;

  OrderRepository({
    required ApiService apiService,
    required LocalStorageService localStorageService,
  }) : _apiService = apiService,
       _localStorageService = localStorageService;

  Future<OrderModel> placeOrder({
    required String customerName,
    required String customerPhone,
    required List<CartItemModel> items,
    String paymentMethod = 'cash',
  }) async {
    // Match the backend's meaningful payload fields; client price hints are ignored.
    final identity = sha256
        .convert(
          utf8.encode(
            jsonEncode({
              'api': _apiService.baseUrl,
              'account':
                  _localStorageService.getAccountPhone() ??
                  _localStorageService.getCustomerPhone(),
              'customer_name': customerName.trim(),
              'customer_phone': customerPhone.trim(),
              'payment_method': paymentMethod,
              'items': items
                  .map(
                    (item) => {
                      'product_id': item.product.id,
                      'quantity': item.quantity,
                      'size': item.size,
                      'sugar_level': item.sugarLevel,
                      'ice_level': item.iceLevel,
                      'toppings': item.toppings,
                    },
                  )
                  .toList(),
            }),
          ),
        )
        .toString();
    final saved = _localStorageService.getPendingOrder();
    final key =
        saved?['identity'] == identity &&
            RegExp(r'^[a-f0-9]{32}$').hasMatch(saved?['key'] ?? '')
        ? saved!['key']!
        : _newKey();
    if (!await _localStorageService.savePendingOrder(identity, key)) {
      throw StateError('Unable to save order retry key.');
    }

    final order = await _apiService.createOrder(
      customerName: customerName,
      customerPhone: customerPhone,
      items: items,
      paymentMethod: paymentMethod,
      idempotencyKey: key,
    );
    // Clear only after a valid server order was parsed. Storage failures cannot
    // turn an already confirmed order into an apparent checkout failure.
    try {
      await _localStorageService.clearPendingOrderIfMatches(identity, key);
      await _localStorageService.addRecentOrderRef(order.orderNumber);
    } catch (_) {}
    return order;
  }

  static String _newKey() {
    final random = Random.secure();
    return List<int>.generate(
      16,
      (_) => random.nextInt(256),
    ).map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  }

  Future<List<OrderModel>> getOrdersByPhone(String phone) =>
      _apiService.getOrdersByPhone(phone);

  Future<List<OrderModel>> getMyOrders() => _apiService.getMyOrders();

  Future<OrderModel> getOrderByReference(String orderNumber) =>
      _apiService.getOrderByReference(orderNumber);
}
