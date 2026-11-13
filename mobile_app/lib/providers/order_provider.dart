import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../data/models/order_model.dart';
import '../data/models/cart_item_model.dart';
import '../data/models/offline_order_preview.dart';
import '../data/repositories/order_repository.dart';

enum OrderSubmissionState { idle, preview, pending, failed, confirmed }

/// Provider for order placement, order lookup, and real-time order status tracking.
class OrderProvider extends ChangeNotifier {
  final OrderRepository _orderRepository;

  OrderProvider({required OrderRepository orderRepository})
    : _orderRepository = orderRepository;

  OrderModel? _activeOrder;
  List<OrderModel> _recentOrders = [];
  bool _isPlacingOrder = false;
  bool _isLoading = false;
  String? _errorMessage;
  OrderSubmissionState _submissionState = OrderSubmissionState.idle;
  OfflineOrderPreview? _offlinePreview;
  String _sessionToken = '';

  Timer? _pollingTimer;

  // Getters
  OrderModel? get activeOrder => _activeOrder;
  List<OrderModel> get recentOrders => List.unmodifiable(_recentOrders);
  bool get isPlacingOrder => _isPlacingOrder;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  OrderSubmissionState get submissionState => _submissionState;
  OfflineOrderPreview? get offlinePreview => _offlinePreview;
  String get sessionToken => _sessionToken;

  void resetForSession(String token) {
    if (_sessionToken == token) return;
    _sessionToken = token;
    _pollingTimer?.cancel();
    _activeOrder = null;
    _recentOrders = [];
    _offlinePreview = null;
    _submissionState = OrderSubmissionState.idle;
    _errorMessage = null;
    notifyListeners();
  }

  /// Places a new order and sets it as the active tracked order
  Future<OrderModel?> placeOrder({
    required String customerName,
    required String customerPhone,
    required List<CartItemModel> items,
    String paymentMethod = 'cash',
  }) async {
    if (_isPlacingOrder) return null;
    _isPlacingOrder = true;
    final sessionAtStart = _sessionToken;
    _submissionState = OrderSubmissionState.pending;
    _offlinePreview = null;
    _errorMessage = null;
    notifyListeners();

    try {
      final order = await _orderRepository.placeOrder(
        customerName: customerName,
        customerPhone: customerPhone,
        items: items,
        paymentMethod: paymentMethod,
      );
      if (_sessionToken != sessionAtStart) return null;
      _activeOrder = order;
      _submissionState = OrderSubmissionState.confirmed;

      // Add to local recent orders if not present
      final existingIndex = _recentOrders.indexWhere(
        (o) => o.orderNumber == order.orderNumber,
      );
      if (existingIndex >= 0) {
        _recentOrders[existingIndex] = order;
      } else {
        _recentOrders.insert(0, order);
      }

      _startStatusPolling();
      return order;
    } on SocketException {
      if (_sessionToken != sessionAtStart) return null;
      _submissionState = OrderSubmissionState.preview;
      _offlinePreview = OfflineOrderPreview(items);
      _errorMessage =
          'The server could not be reached. Your cart is saved as a preview; retry to confirm the order.';
      return null;
    } on TimeoutException {
      if (_sessionToken != sessionAtStart) return null;
      _submissionState = OrderSubmissionState.preview;
      _offlinePreview = OfflineOrderPreview(items);
      _errorMessage =
          'The server did not confirm this order in time. Your cart is saved; retry to check its result.';
      return null;
    } on HttpException catch (e) {
      if (_sessionToken != sessionAtStart) return null;
      _submissionState = OrderSubmissionState.failed;
      _errorMessage = e.message;
      return null;
    } catch (_) {
      if (_sessionToken != sessionAtStart) return null;
      _submissionState = OrderSubmissionState.failed;
      _errorMessage =
          'The server did not confirm this order. Your cart is saved; please retry.';
      return null;
    } finally {
      _isPlacingOrder = false;
      notifyListeners();
    }
  }

  /// Selects an order for real-time tracking
  void setActiveOrder(OrderModel order) {
    if (order.id <= 0 || order.orderNumber.isEmpty) return;
    _activeOrder = order;
    _startStatusPolling();
    notifyListeners();
  }

  static bool isReferenceQuery(String value) {
    final query = value.trim();
    return RegExp(r'^(ORD|CAF)-', caseSensitive: false).hasMatch(query) ||
        !RegExp(r'^[+0-9() .-]+$').hasMatch(query);
  }

  Future<void> lookup(String query) async {
    if (isReferenceQuery(query)) {
      await lookupOrderByReference(query);
    } else {
      await lookupOrdersByPhone(query);
    }
  }

  Future<void> loadMyOrders() async {
    final sessionAtStart = _sessionToken;
    _isLoading = true;
    _errorMessage = null;
    _recentOrders = [];
    _activeOrder = null;
    _pollingTimer?.cancel();
    notifyListeners();
    try {
      final list = await _orderRepository.getMyOrders();
      if (_sessionToken != sessionAtStart) return;
      _recentOrders = list;
      _activeOrder = list.firstOrNull;
      _startStatusPolling();
    } on HttpException catch (e) {
      if (_sessionToken != sessionAtStart) return;
      _errorMessage = e.message;
    } catch (_) {
      if (_sessionToken != sessionAtStart) return;
      _errorMessage = 'Could not load server order history. Please try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Looks up customer orders by phone number
  Future<void> lookupOrdersByPhone(String phone) async {
    if (phone.trim().isEmpty) return;
    final sessionAtStart = _sessionToken;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final list = await _orderRepository.getOrdersByPhone(phone.trim());
      if (_sessionToken != sessionAtStart) return;
      _recentOrders = list;
      _activeOrder = list.firstOrNull;
      _startStatusPolling();
    } on HttpException catch (e) {
      if (_sessionToken != sessionAtStart) return;
      _errorMessage = e.message;
    } catch (_) {
      if (_sessionToken != sessionAtStart) return;
      _errorMessage = 'Could not load server order history. Please try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Looks up a server order by current ORD- or historical reference.
  Future<OrderModel?> lookupOrderByReference(String orderNumber) async {
    final sessionAtStart = _sessionToken;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final order = await _orderRepository.getOrderByReference(
        orderNumber.trim().toUpperCase(),
      );
      if (_sessionToken != sessionAtStart) return null;
      _activeOrder = order;
      final existingIndex = _recentOrders.indexWhere(
        (o) => o.orderNumber == order.orderNumber,
      );
      if (existingIndex >= 0) {
        _recentOrders[existingIndex] = order;
      } else {
        _recentOrders.insert(0, order);
      }
      _startStatusPolling();
      return order;
    } on HttpException catch (e) {
      if (_sessionToken != sessionAtStart) return null;
      _errorMessage = e.message;
      return null;
    } catch (_) {
      if (_sessionToken != sessionAtStart) return null;
      _errorMessage = 'Could not load this server order. Please try again.';
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Polls the server for live status updates if the active order is currently pending or preparing
  Future<void> refreshActiveOrder() async {
    if (_activeOrder == null) return;
    final sessionAtStart = _sessionToken;
    final referenceAtStart = _activeOrder!.orderNumber;

    try {
      final updated = await _orderRepository.getOrderByReference(
        referenceAtStart,
      );
      if (_sessionToken != sessionAtStart ||
          _activeOrder?.orderNumber != referenceAtStart) {
        return;
      }
      _activeOrder = updated;
      final index = _recentOrders.indexWhere(
        (o) => o.orderNumber == updated.orderNumber,
      );
      if (index >= 0) {
        _recentOrders[index] = updated;
      }
      _startStatusPolling();
      notifyListeners();
    } catch (_) {
      // Ignore background poll errors
    }
  }

  void _startStatusPolling() {
    _pollingTimer?.cancel();
    if (_activeOrder == null) return;

    final status = _activeOrder!.orderStatus.toLowerCase();
    if (status == 'pending' || status == 'preparing') {
      _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        refreshActiveOrder();
      });
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }
}
