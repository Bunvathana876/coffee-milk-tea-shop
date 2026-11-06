import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/utils/currency_formatter.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/models/cart_item_model.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/openapi_models.g.dart';

void main() {
  group('Models & Pricing Calculations', () {
    test('ProductModel JSON parsing works correctly', () {
      final json = {
        'id': 1,
        'name': 'Iced Latte',
        'category_id': 1,
        'category_name': 'Coffee',
        'description': 'Smooth espresso with milk',
        'image': 'https://example.com/latte.jpg',
        'base_price_usd': 2.50,
        'is_available': true,
      };

      final product = ProductModel.fromJson(json);

      expect(product.id, 1);
      expect(product.name, 'Iced Latte');
      expect(product.basePriceUsd, 2.50);
      expect(product.categoryName, 'Coffee');
    });

    test('CategoryModel JSON parsing works correctly', () {
      final json = {
        'id': 2,
        'name': 'Milk Tea',
        'description': 'Loose leaf tea with boba',
        'image': 'https://example.com/milktea.jpg',
        'is_active': true,
        'product_count': 5,
      };

      final category = CategoryModel.fromJson(json);

      expect(category.id, 2);
      expect(category.name, 'Milk Tea');
      expect(category.productCount, 5);
    });

    test('CartItemModel accurately calculates size modifiers and subtotals', () {
      const product = ProductModel(
        id: 1,
        name: 'Iced Latte',
        categoryId: 1,
        basePriceUsd: 2.50,
      );

      // Medium size (+ $0.30)
      final mediumItem = CartItemModel(
        product: product,
        size: 'Medium',
        quantity: 2,
      );

      expect(mediumItem.unitPriceUsd, 2.80);
      expect(mediumItem.subtotalUsd, 5.60);

      // Large size (+ $0.60)
      final largeItem = CartItemModel(
        product: product,
        size: 'Large',
        quantity: 3,
      );

      expect(largeItem.unitPriceUsd, 3.10);
      expect(largeItem.subtotalUsd, 9.30);
    });

    test('CurrencyFormatter produces correct USD and KHR strings', () {
      expect(CurrencyFormatter.formatUsd(2.50), '\$2.50');
      // 2.50 * 4100 = 10,250
      expect(CurrencyFormatter.formatKhr(2.50), '10,250 ៛');
    });

    test('Generated OpenAPI Dart models serialize and deserialize accurately', () {
      const itemCreate = ApiOrderItemCreate(
        productId: 1,
        productName: 'Brown Sugar Boba Milk Tea',
        quantity: 2,
        unitPriceUsd: 3.55,
        subtotalUsd: 7.10,
        size: 'Medium',
        sugarLevel: '50%',
        iceLevel: 'Less Ice',
        toppings: ['Brown Sugar Pearls'],
      );
      final json = itemCreate.toJson();
      final roundTrip = ApiOrderItemCreate.fromJson(json);

      expect(roundTrip.productName, 'Brown Sugar Boba Milk Tea');
      expect(roundTrip.toppings, contains('Brown Sugar Pearls'));
      expect(OpenApiEndpoints.createNewOrderApiOrdersPost, '/api/orders');
    });
  });
}
