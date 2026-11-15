import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/providers/shop_provider.dart';

const runLiveCatalog = bool.fromEnvironment('RUN_LIVE_CATALOG');

void main() {
  test('live café API parses the catalog and approved Cloudinary images', () async {
    final shop = ShopProvider(
      shopRepository: ShopRepository(
        apiService: ApiService(baseUrl: 'http://127.0.0.1:8003'),
      ),
    );
    addTearDown(shop.dispose);

    await shop.refreshCatalog();
    expect(shop.errorMessage, isNull);
    expect(shop.categories, isNotEmpty);
    expect(shop.filteredProducts, isNotEmpty);
    for (final id in [3, 4, 16]) {
      final product = shop.products.singleWhere((item) => item.id == id);
      expect(product.image, startsWith('https://res.cloudinary.com/dr5o7ft6/'));
    }
  }, skip: !runLiveCatalog);
}
