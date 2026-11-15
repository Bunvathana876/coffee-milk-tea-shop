import '../models/category_model.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';

/// Loads the catalog from the café API.
class ShopRepository {
  final ApiService _apiService;

  ShopRepository({required ApiService apiService}) : _apiService = apiService;

  Future<List<CategoryModel>> getCategories() => _apiService.getCategories();

  Future<List<ProductModel>> getProducts({int? categoryId, String? search}) =>
      _apiService.getProducts(categoryId: categoryId, search: search);
}
