import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/providers/shop_provider.dart';

class CatalogApi extends ApiService {
  List<CategoryModel> categories = const [CategoryModel(id: 1, name: 'Coffee')];
  List<ProductModel> products = const [
    ProductModel(
      id: 3,
      name: 'Cappuccino',
      categoryId: 1,
      image: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1/cup.png',
      basePriceUsd: 3,
    ),
  ];
  bool failCategories = false;
  int? requestedCategoryId;
  String? requestedSearch;

  @override
  Future<List<CategoryModel>> getCategories({bool activeOnly = true}) async {
    if (failCategories) throw Exception('API unavailable');
    return categories;
  }

  @override
  Future<List<ProductModel>> getProducts({
    int? categoryId,
    String? search,
    bool isAvailable = true,
  }) async {
    requestedCategoryId = categoryId;
    requestedSearch = search;
    return products;
  }
}

void main() {
  test('catalog uses API results and keeps empty results empty', () async {
    final api = CatalogApi();
    final repository = ShopRepository(apiService: api);

    expect(await repository.getCategories(), same(api.categories));
    expect(
      await repository.getProducts(categoryId: 1, search: 'cappuccino'),
      same(api.products),
    );
    expect(api.requestedCategoryId, 1);
    expect(api.requestedSearch, 'cappuccino');

    api.categories = [];
    api.products = [];
    expect(await repository.getCategories(), isEmpty);
    expect(await repository.getProducts(), isEmpty);
  });

  test('API failure clears the previously loaded menu', () async {
    final api = CatalogApi();
    final repository = ShopRepository(apiService: api);
    final shop = ShopProvider(shopRepository: repository);
    addTearDown(shop.dispose);

    await shop.refreshCatalog();
    expect(shop.products.single.name, 'Cappuccino');
    expect(shop.categories.single.name, 'Coffee');

    api.failCategories = true;
    await expectLater(repository.getCategories(), throwsException);
    await shop.refreshCatalog();
    expect(shop.products, isEmpty);
    expect(shop.categories, isEmpty);
    expect(shop.errorMessage, isNotNull);
  });
}
