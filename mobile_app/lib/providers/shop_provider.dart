import 'package:flutter/foundation.dart';
import '../data/models/cart_item_model.dart';
import '../data/models/category_model.dart';
import '../data/models/product_model.dart';
import '../data/repositories/shop_repository.dart';
import '../data/services/local_storage_service.dart';

/// Provider for catalog browsing, category filtering, product searches, and favorite drinks.
class ShopProvider extends ChangeNotifier {
  final ShopRepository _shopRepository;
  final LocalStorageService? _localStorageService;

  ShopProvider({
    required ShopRepository shopRepository,
    LocalStorageService? localStorageService,
  })  : _shopRepository = shopRepository,
        _localStorageService = localStorageService {
    _loadFavorites();
  }

  List<CategoryModel> _categories = [];
  List<ProductModel> _products = [];
  List<CartItemModel> _favoriteItems = [];
  int _selectedCategoryId = 0; // 0 means "All"
  String _searchQuery = '';
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  List<CategoryModel> get categories => _categories;
  List<ProductModel> get products => _products;
  List<CartItemModel> get favoriteItems => List.unmodifiable(_favoriteItems);
  int get selectedCategoryId => _selectedCategoryId;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Filtered product list based on current category and search query
  List<ProductModel> get filteredProducts {
    var list = _products;
    if (_selectedCategoryId > 0) {
      list = list.where((p) => p.categoryId == _selectedCategoryId).toList();
    }
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((p) =>
        p.name.toLowerCase().contains(q) ||
        (p.description?.toLowerCase().contains(q) ?? false) ||
        (p.categoryName?.toLowerCase().contains(q) ?? false)
      ).toList();
    }
    return list;
  }

  /// Initial load of catalog
  Future<void> initialize() async {
    await refreshCatalog();
  }

  /// Refreshes both categories and products from the repository
  Future<void> refreshCatalog() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final categoriesFuture = _shopRepository.getCategories();
      final productsFuture = _shopRepository.getProducts();

      final results = await Future.wait([categoriesFuture, productsFuture]);

      _categories = results[0] as List<CategoryModel>;
      _products = results[1] as List<ProductModel>;
    } catch (e) {
      _errorMessage = 'Could not load menu: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Selects a category filter (0 for All)
  void selectCategory(int categoryId) {
    if (_selectedCategoryId == categoryId) return;
    _selectedCategoryId = categoryId;
    notifyListeners();
  }

  /// Updates live search keyword
  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  /// Clears search query
  void clearSearch() {
    _searchQuery = '';
    notifyListeners();
  }

  // Favorites Management
  void _loadFavorites() {
    final storage = _localStorageService;
    if (storage != null) {
      _favoriteItems = storage.getFavoriteItems();
      notifyListeners();
    }
  }

  bool isProductFavorited(int productId) {
    return _favoriteItems.any((item) => item.product.id == productId);
  }

  bool isFavorite(CartItemModel item) {
    return _favoriteItems.any((f) => f.id == item.id);
  }

  Future<void> toggleFavoriteProduct(ProductModel product) async {
    final existingIndex = _favoriteItems.indexWhere((f) => f.product.id == product.id);
    if (existingIndex >= 0) {
      _favoriteItems.removeAt(existingIndex);
    } else {
      // Save default medium combination
      final defaultFav = CartItemModel(
        product: product,
        size: 'Medium',
        sugarLevel: '50%',
        iceLevel: 'Normal Ice',
        toppings: const [],
      );
      _favoriteItems.insert(0, defaultFav);
    }
    await _localStorageService?.saveFavoriteItems(_favoriteItems);
    notifyListeners();
  }

  Future<void> toggleFavoriteCustomItem(CartItemModel item) async {
    final existingIndex = _favoriteItems.indexWhere((f) => f.id == item.id);
    if (existingIndex >= 0) {
      _favoriteItems.removeAt(existingIndex);
    } else {
      _favoriteItems.insert(0, item);
    }
    await _localStorageService?.saveFavoriteItems(_favoriteItems);
    notifyListeners();
  }
}
