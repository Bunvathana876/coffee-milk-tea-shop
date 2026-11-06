import 'package:flutter/foundation.dart';
import '../core/config/app_config.dart';
import '../data/models/cart_item_model.dart';
import '../data/services/local_storage_service.dart';

/// Provider for managing shopping cart / drink bag with persistent local cache.
class CartProvider extends ChangeNotifier {
  final LocalStorageService _localStorageService;

  CartProvider({required LocalStorageService localStorageService})
      : _localStorageService = localStorageService {
    _loadPersistedCart();
  }

  List<CartItemModel> _items = [];

  List<CartItemModel> get items => List.unmodifiable(_items);

  /// Total number of drink cups in the cart
  int get totalQuantity {
    return _items.fold(0, (sum, item) => sum + item.quantity);
  }

  /// Total cart cost in USD
  double get subtotalUsd {
    return _items.fold(0.0, (sum, item) => sum + item.subtotalUsd);
  }

  /// Total cart cost in Cambodian Riel (KHR)
  double get subtotalKhr {
    return subtotalUsd * AppConfig.khrExchangeRate;
  }

  bool get isEmpty => _items.isEmpty;

  /// Loads saved cart items from SharedPreferences
  void _loadPersistedCart() {
    _items = _localStorageService.getCartItems();
    notifyListeners();
  }

  /// Saves current cart to local storage
  void _persist() {
    _localStorageService.saveCartItems(_items);
  }

  /// Adds a customized drink to the cart.
  /// If the exact same drink with the exact same customizations is already present,
  /// its quantity is incremented.
  void addItem(CartItemModel newItem) {
    final existingIndex = _items.indexWhere((i) => i.id == newItem.id);

    if (existingIndex >= 0) {
      final current = _items[existingIndex];
      _items[existingIndex] = current.copyWith(
        quantity: current.quantity + newItem.quantity,
      );
    } else {
      _items.add(newItem);
    }

    _persist();
    notifyListeners();
  }

  /// Updates quantity of an existing line item.
  /// If quantity drops to 0 or less, the item is removed.
  void updateQuantity(String itemId, int newQuantity) {
    final index = _items.indexWhere((i) => i.id == itemId);
    if (index >= 0) {
      if (newQuantity <= 0) {
        _items.removeAt(index);
      } else {
        _items[index] = _items[index].copyWith(quantity: newQuantity);
      }
      _persist();
      notifyListeners();
    }
  }

  /// Removes an item completely from the cart
  void removeItem(String itemId) {
    _items.removeWhere((i) => i.id == itemId);
    _persist();
    notifyListeners();
  }

  /// Clears all items after a successful checkout
  void clear() {
    _items.clear();
    _persist();
    notifyListeners();
  }

  /// Adds multiple items (e.g. when 1-tap reordering an entire previous order)
  void addItems(List<CartItemModel> newItems) {
    for (final item in newItems) {
      final existingIndex = _items.indexWhere((i) => i.id == item.id);
      if (existingIndex >= 0) {
        final current = _items[existingIndex];
        _items[existingIndex] = current.copyWith(
          quantity: current.quantity + item.quantity,
        );
      } else {
        _items.add(item);
      }
    }
    _persist();
    notifyListeners();
  }
}
