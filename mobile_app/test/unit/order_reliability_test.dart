import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/core/config/app_config.dart';
import 'package:mobile_app/data/models/cart_item_model.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/order_provider.dart';
import 'package:mobile_app/providers/cart_provider.dart';
import 'package:mobile_app/providers/user_provider.dart';
import 'package:mobile_app/ui/features/cart/widgets/checkout_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

const reference = 'ORD-20261106-ABCDEFGHJK';

Map<String, dynamic> serverOrder({String orderNumber = reference}) => {
  'id': 42,
  'order_number': orderNumber,
  'customer_name': 'Test Customer',
  'customer_phone': '012345678',
  'subtotal_usd': 2.30,
  'total_usd': 2.30,
  'total_khr': 9430,
  'payment_status': 'unpaid',
  'order_status': 'pending',
  'created_at': '2026-11-06T10:00:00Z',
  'items': [
    {
      'id': 7,
      'order_id': 42,
      'product_id': 1,
      'product_name': 'Coffee',
      'quantity': 1,
      'unit_price_usd': 2.30,
      'subtotal_usd': 2.30,
      'size': 'Medium',
      'sugar_level': '50%',
      'ice_level': 'Normal Ice',
      'toppings': '',
    },
  ],
};

CartItemModel drink() => CartItemModel(
  product: ProductModel(
    id: 1,
    name: 'Coffee',
    categoryId: 1,
    basePriceUsd: 2,
    isAvailable: true,
  ),
);

Future<LocalStorageService> storage() async {
  SharedPreferences.setMockInitialValues({});
  return LocalStorageService.init();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'network failure leaves only a preview and a persistent retry key',
    () async {
      final local = await storage();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) async {
          throw const SocketException('offline');
        }),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      final items = [drink()];
      expect(
        await provider.placeOrder(
          customerName: 'Test Customer',
          customerPhone: '012345678',
          items: items,
        ),
        isNull,
      );
      expect(provider.submissionState, OrderSubmissionState.preview);
      expect(provider.offlinePreview?.estimatedTotalUsd, 2.3);
      expect(provider.activeOrder, isNull);
      expect(provider.recentOrders, isEmpty);
      expect(local.getRecentOrderRefs(), isEmpty);
      expect(local.getPendingOrder(), isNotNull);
      expect(
        local.getPendingOrder()!['identity'],
        isNot(contains('012345678')),
      );
      expect(items, hasLength(1));
      provider.dispose();
    },
  );

  test(
    'authentication failure is failed, never a preview or confirmed order',
    () async {
      final local = await storage();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient(
          (_) async => http.Response('{"detail":"Invalid token"}', 401),
        ),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      expect(
        await provider.placeOrder(
          customerName: 'Test Customer',
          customerPhone: '012345678',
          items: [drink()],
        ),
        isNull,
      );
      expect(provider.submissionState, OrderSubmissionState.failed);
      expect(provider.offlinePreview, isNull);
      expect(provider.errorMessage, contains('sign in'));
      expect(local.getRecentOrderRefs(), isEmpty);
      provider.dispose();
    },
  );

  test(
    'retry after repository restart reuses the key; changed payload gets a new key',
    () async {
      final local = await storage();
      final keys = <String?>[];
      final firstApi = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((request) async {
          keys.add(request.headers['idempotency-key']);
          throw const SocketException('offline');
        }),
      );
      await expectLater(
        OrderRepository(
          apiService: firstApi,
          localStorageService: local,
        ).placeOrder(
          customerName: 'Test Customer',
          customerPhone: '012345678',
          items: [drink()],
          paymentMethod: 'khqr',
        ),
        throwsA(isA<SocketException>()),
      );
      final secondApi = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((request) async {
          keys.add(request.headers['idempotency-key']);
          if (keys.length == 2) {
            expect(jsonDecode(request.body)['payment_method'], 'khqr');
          }
          return http.Response(jsonEncode(serverOrder()), 201);
        }),
      );
      final restartedStorage = await LocalStorageService.init();
      final restarted = OrderRepository(
        apiService: secondApi,
        localStorageService: restartedStorage,
      );
      final confirmed = await restarted.placeOrder(
        customerName: 'Test Customer',
        customerPhone: '012345678',
        items: [drink()],
        paymentMethod: 'khqr',
      );
      expect(confirmed.orderNumber, reference);
      expect(confirmed.paymentStatus, 'unpaid');
      expect(keys[0], keys[1]);
      expect(restartedStorage.getPendingOrder(), isNull);
      expect(restartedStorage.getRecentOrderRefs(), [reference]);

      await restarted.placeOrder(
        customerName: 'Test Customer',
        customerPhone: '012345678',
        items: [drink().copyWith(quantity: 2)],
      );
      expect(keys[2], isNot(keys[1]));
    },
  );

  test(
    'a 201 response without an order retains the key and no history',
    () async {
      final local = await storage();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) async => http.Response('', 201)),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      expect(
        await provider.placeOrder(
          customerName: 'Test Customer',
          customerPhone: '012345678',
          items: [drink()],
        ),
        isNull,
      );
      expect(provider.submissionState, OrderSubmissionState.failed);
      expect(provider.errorMessage, isNot(contains('FormatException')));
      expect(local.getPendingOrder(), isNotNull);
      expect(local.getRecentOrderRefs(), isEmpty);
      provider.dispose();
    },
  );

  test(
    'a partial success response cannot supply default payment or order state',
    () async {
      final local = await storage();
      final partial = serverOrder()..remove('payment_status');
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient(
          (_) async => http.Response(jsonEncode(partial), 201),
        ),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      expect(
        await provider.placeOrder(
          customerName: 'Test Customer',
          customerPhone: '012345678',
          items: [drink()],
        ),
        isNull,
      );
      expect(provider.submissionState, OrderSubmissionState.failed);
      expect(provider.activeOrder, isNull);
      expect(local.getPendingOrder(), isNotNull);
      provider.dispose();
    },
  );

  test(
    'a late confirmation does not clear a newer pending retry key',
    () async {
      final local = await storage();
      final response = Completer<http.Response>();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) => response.future),
      );
      final repository = OrderRepository(
        apiService: api,
        localStorageService: local,
      );
      final first = repository.placeOrder(
        customerName: 'Test Customer',
        customerPhone: '012345678',
        items: [drink()],
      );
      await Future<void>.delayed(Duration.zero);
      final firstPending = local.getPendingOrder()!;
      await local.savePendingOrder(
        'newer-fingerprint',
        '0123456789abcdef0123456789abcdef',
      );
      response.complete(http.Response(jsonEncode(serverOrder()), 201));
      expect((await first).orderNumber, reference);
      expect(local.getPendingOrder()?['identity'], 'newer-fingerprint');
      expect(local.getPendingOrder()?['key'], isNot(firstPending['key']));
    },
  );

  test(
    'simultaneous submissions send one request and report one confirmed order',
    () async {
      final local = await storage();
      final response = Completer<http.Response>();
      var posts = 0;
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) {
          posts++;
          return response.future;
        }),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      final first = provider.placeOrder(
        customerName: 'Test Customer',
        customerPhone: '012345678',
        items: [drink()],
      );
      expect(provider.submissionState, OrderSubmissionState.pending);
      expect(
        await provider.placeOrder(
          customerName: 'Test Customer',
          customerPhone: '012345678',
          items: [drink()],
        ),
        isNull,
      );
      response.complete(http.Response(jsonEncode(serverOrder()), 201));
      expect((await first)?.orderNumber, reference);
      expect(posts, 1);
      expect(provider.submissionState, OrderSubmissionState.confirmed);
      expect(provider.recentOrders, hasLength(1));
      provider.resetForSession('another-customer-token');
      expect(provider.recentOrders, isEmpty);
      expect(provider.activeOrder, isNull);
      provider.dispose();
    },
  );

  test(
    'ORD and older CAF references use reference lookup; empty history stays empty',
    () async {
      final local = await storage();
      final paths = <String>[];
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((request) async {
          paths.add(request.url.path);
          if (request.url.path == '/api/orders') {
            return http.Response('[]', 200);
          }
          return http.Response(
            jsonEncode(serverOrder(orderNumber: request.url.pathSegments.last)),
            200,
          );
        }),
      );
      api.updateAuthToken('server-token');
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      await provider.loadMyOrders();
      expect(provider.recentOrders, isEmpty);
      expect(OrderProvider.isReferenceQuery(reference), isTrue);
      expect(OrderProvider.isReferenceQuery('CAF-20261017-0042'), isTrue);
      expect(OrderProvider.isReferenceQuery('012345678'), isFalse);
      await provider.lookup(reference);
      await provider.lookup('CAF-20261017-0042');
      expect(paths, contains('/api/orders/ref/$reference'));
      expect(paths, contains('/api/orders/ref/CAF-20261017-0042'));
      expect(provider.recentOrders, hasLength(2));
      provider.dispose();
    },
  );

  test(
    'an empty server history body is an error, not a fabricated order',
    () async {
      final local = await storage();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) async => http.Response('', 200)),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      await provider.loadMyOrders();
      expect(provider.recentOrders, isEmpty);
      expect(
        provider.errorMessage,
        contains('Could not load server order history'),
      );
      provider.dispose();
    },
  );

  test(
    'a response from an earlier customer session cannot enter current history',
    () async {
      final local = await storage();
      final response = Completer<http.Response>();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) => response.future),
      );
      final provider = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      provider.resetForSession('old-customer-token');
      final lookup = provider.lookupOrderByReference(reference);
      provider.resetForSession('new-customer-token');
      response.complete(http.Response(jsonEncode(serverOrder()), 200));
      expect(await lookup, isNull);
      expect(provider.recentOrders, isEmpty);
      expect(provider.activeOrder, isNull);
      provider.dispose();
    },
  );

  test(
    'server stamps replace inflated local balance without deleting legacy history',
    () async {
      SharedPreferences.setMockInitialValues({'loyalty_stamps_012345678': 9});
      final local = await LocalStorageService.init();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((request) async {
          if (request.url.path == '/api/health') {
            return http.Response('{}', 200);
          }
          if (request.url.path == '/api/auth/login') {
            return http.Response(
              jsonEncode({
                'access_token': 'server-token',
                'user': {
                  'full_name': 'Test Customer',
                  'phone': '012345678',
                  'email': null,
                  'loyalty_stamps': 2,
                },
              }),
              200,
            );
          }
          if (request.url.path == '/api/auth/me') {
            return http.Response(
              jsonEncode({'phone': '012345678', 'loyalty_stamps': 3}),
              200,
            );
          }
          return http.Response('{}', 404);
        }),
      );
      final user = UserProvider(localStorageService: local, apiService: api);
      expect(
        await user.login(identifier: '012345678', password: 'test-only'),
        isTrue,
      );
      expect(user.loyaltyStamps, 2);
      expect(user.legacyLocalStamps, 9);
      expect(await user.refreshServerLoyalty(), isTrue);
      expect(user.loyaltyStamps, 3);
      expect(local.getLoyaltyStamps('012345678'), 9);
      expect(local.getConfirmedLoyaltyStamps('012345678'), 3);
      user.dispose();
    },
  );

  test('development API defaults use the Brew & Boba backend port', () {
    expect(AppConfig.defaultApiBaseUrl, 'http://localhost:8001');
  });

  testWidgets(
    'checkout keeps the cart and does not open tracking after a network failure',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_name': 'Test Customer',
        'customer_phone': '012345678',
        'customer_auth_token': 'server-token',
        'server_account_phone': '012345678',
      });
      final local = await LocalStorageService.init();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((request) async {
          if (request.url.path == '/api/orders') {
            throw const SocketException('offline');
          }
          if (request.url.path == '/api/auth/me') {
            return http.Response(
              '{"phone":"012345678","loyalty_stamps":0}',
              200,
            );
          }
          return http.Response('{}', 200);
        }),
      );
      final cart = CartProvider(localStorageService: local)..addItem(drink());
      final orders = OrderProvider(
        orderRepository: OrderRepository(
          apiService: api,
          localStorageService: local,
        ),
      );
      final user = UserProvider(localStorageService: local, apiService: api);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: cart),
            ChangeNotifierProvider.value(value: orders),
            ChangeNotifierProvider.value(value: user),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => ElevatedButton(
                  onPressed: () => CheckoutSheet.show(context),
                  child: const Text('Open checkout'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open checkout'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm & Place Order'));
      await tester.pumpAndSettle();
      expect(cart.items, hasLength(1));
      expect(orders.submissionState, OrderSubmissionState.preview);
      expect(orders.activeOrder, isNull);
      expect(find.text('Live Order Tracker'), findsNothing);
    },
  );
}
