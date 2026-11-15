import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/core/utils/product_image_url.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/cart_provider.dart';
import 'package:mobile_app/providers/shop_provider.dart';
import 'package:mobile_app/ui/features/menu/screens/menu_screen.dart';
import 'package:mobile_app/ui/features/menu/widgets/drink_hero_artwork.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const cappuccinoUrl =
    'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png';

void main() {
  test('API catalog populates categories and featured product image', () async {
    final requested = <String>[];
    final client = MockClient((request) async {
      requested.add(request.url.toString());
      if (request.url.path == '/api/categories') {
        return http.Response(
          jsonEncode([
            {'id': 1, 'name': 'Coffee', 'is_active': true, 'product_count': 1},
          ]),
          200,
        );
      }
      return http.Response(
        jsonEncode([
          {
            'id': 3,
            'name': 'Cappuccino',
            'category_id': 1,
            'category_name': 'Coffee',
            'image': cappuccinoUrl,
            'base_price_usd': 3.25,
            'is_available': true,
          },
        ]),
        200,
      );
    });
    addTearDown(client.close);
    final shop = ShopProvider(
      shopRepository: ShopRepository(
        apiService: ApiService(
          baseUrl: 'http://127.0.0.1:8003',
          client: client,
        ),
      ),
    );
    addTearDown(shop.dispose);

    await shop.refreshCatalog();
    expect(
      requested,
      contains('http://127.0.0.1:8003/api/categories?active_only=true'),
    );
    expect(
      requested,
      contains('http://127.0.0.1:8003/api/products?is_available=true'),
    );
    expect(shop.categories.single.name, 'Coffee');
    expect(shop.filteredProducts.single.name, 'Cappuccino');
    expect(shop.filteredProducts.single.image, cappuccinoUrl);
    expect(
      productImageUrl(shop.filteredProducts.single.image!),
      contains('c_limit,w_320,q_auto,f_auto/v1794704052/02_cappuccino.png'),
    );
    expect(shop.errorMessage, isNull);
  });

  test('wrong-backend envelope gives a useful format error', () async {
    final client = MockClient(
      (_) async =>
          http.Response('{"data":[],"message":"ok","success":true}', 200),
    );
    addTearDown(client.close);
    final api = ApiService(baseUrl: 'http://127.0.0.1:8000', client: client);
    await expectLater(
      api.getCategories(),
      throwsA(
        isA<FormatException>().having(
          (error) => error.message,
          'message',
          contains('expects a JSON list'),
        ),
      ),
    );
  });

  test('network failure clears catalog, and retry fetches it again', () async {
    var online = false;
    var requests = 0;
    final client = MockClient((request) async {
      requests++;
      if (!online) throw const SocketException('Connection refused');
      if (request.url.path == '/api/categories') {
        return http.Response('[{"id":1,"name":"Coffee"}]', 200);
      }
      return http.Response(
        '[{"id":3,"name":"Cappuccino","category_id":1,'
        '"image":"$cappuccinoUrl","base_price_usd":3.25}]',
        200,
      );
    });
    addTearDown(client.close);
    final shop = ShopProvider(
      shopRepository: ShopRepository(
        apiService: ApiService(
          baseUrl: 'http://127.0.0.1:8003',
          client: client,
        ),
      ),
    );
    addTearDown(shop.dispose);

    await shop.refreshCatalog();
    expect(shop.categories, isEmpty);
    expect(shop.products, isEmpty);
    expect(shop.errorMessage, contains('127.0.0.1:8003'));

    online = true;
    await shop.refreshCatalog();
    expect(requests, 4);
    expect(shop.categories.single.name, 'Coffee');
    expect(shop.filteredProducts.single.name, 'Cappuccino');
    expect(shop.errorMessage, isNull);
  });

  test('successful empty catalog is separate from a request error', () async {
    final client = MockClient((_) async => http.Response('[]', 200));
    addTearDown(client.close);
    final shop = ShopProvider(
      shopRepository: ShopRepository(
        apiService: ApiService(
          baseUrl: 'http://127.0.0.1:8003',
          client: client,
        ),
      ),
    );
    addTearDown(shop.dispose);
    await shop.refreshCatalog();
    expect(shop.products, isEmpty);
    expect(shop.errorMessage, isNull);
  });

  test(
    'catalog HTTP errors include API detail and do not decode as lists',
    () async {
      final client = MockClient(
        (_) async => http.Response(
          '{"detail":"Invalid category filter."}',
          400,
          headers: {'content-type': 'application/json'},
        ),
      );
      addTearDown(client.close);
      final api = ApiService(baseUrl: 'http://127.0.0.1:8003', client: client);
      await expectLater(
        api.getCategories(),
        throwsA(
          isA<HttpException>().having(
            (error) => error.message,
            'message',
            contains('HTTP 400 for categories: Invalid category filter.'),
          ),
        ),
      );
    },
  );

  test('health check rejects another API on the same address', () async {
    final client = MockClient(
      (_) async =>
          http.Response('{"status":"healthy","app":"Another API"}', 200),
    );
    addTearDown(client.close);
    final api = ApiService(baseUrl: 'http://127.0.0.1:8003', client: client);
    expect(await api.checkHealth(), isFalse);
  });

  test(
    'overlapping catalog loads share requests without automatic retries',
    () async {
      final gate = Completer<void>();
      var requests = 0;
      final client = MockClient((request) async {
        requests++;
        await gate.future;
        return http.Response('[]', 200);
      });
      addTearDown(client.close);
      final shop = ShopProvider(
        shopRepository: ShopRepository(
          apiService: ApiService(
            baseUrl: 'http://127.0.0.1:8003',
            client: client,
          ),
        ),
      );
      addTearDown(shop.dispose);
      final first = shop.initialize();
      final second = shop.initialize();
      final refresh = shop.refreshCatalog();
      expect(shop.isLoading, isTrue);
      gate.complete();
      await Future.wait([first, second, refresh]);
      expect(requests, 2);
      expect(shop.isLoading, isFalse);
      expect(shop.errorMessage, isNull);
      await shop.refreshCatalog();
      expect(requests, 4);
    },
  );

  testWidgets(
    'Menu Retry loads real featured card and passes image to detail',
    (tester) async {
      var online = false;
      final client = MockClient((request) async {
        if (!online) throw const SocketException('Connection refused');
        if (request.url.path == '/api/categories') {
          return http.Response('[{"id":1,"name":"Coffee"}]', 200);
        }
        return http.Response(
          '[{"id":3,"name":"Cappuccino","category_id":1,'
          '"image":"$cappuccinoUrl","base_price_usd":3.25}]',
          200,
        );
      });
      addTearDown(client.close);
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final shop = ShopProvider(
        shopRepository: ShopRepository(
          apiService: ApiService(
            baseUrl: 'http://127.0.0.1:8003',
            client: client,
          ),
        ),
      );
      final cart = CartProvider(localStorageService: storage);
      addTearDown(shop.dispose);
      addTearDown(cart.dispose);
      await shop.refreshCatalog();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: shop),
            ChangeNotifierProvider.value(value: cart),
          ],
          child: const MaterialApp(home: MenuScreen(isActive: false)),
        ),
      );
      await tester.pump();
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();
      expect(find.text('Menu unavailable'), findsOneWidget);
      expect(find.text('Cappuccino'), findsNothing);

      online = true;
      await tester.ensureVisible(find.text('Retry'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(shop.categories.single.name, 'Coffee');
      await tester.ensureVisible(find.text('Cappuccino'));
      await tester.pumpAndSettle();
      expect(find.text('Cappuccino'), findsOneWidget);
      final image = tester.widget<CachedNetworkImage>(
        find.byType(CachedNetworkImage).first,
      );
      expect(image.imageUrl, productImageUrl(cappuccinoUrl));
      expect(image.fit, BoxFit.contain);

      await tester.tap(find.text('Cappuccino'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<DrinkHeroArtwork>(find.byType(DrinkHeroArtwork)).imageUrl,
        cappuccinoUrl,
      );
    },
  );
}
