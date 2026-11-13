import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('customer order requests send the current bearer token', () async {
    final requests = <http.Request>[];
    final client = MockClient((request) async {
      requests.add(request);
      return http.Response('{"detail":"Unauthorized"}', 401);
    });
    final api = ApiService(baseUrl: 'http://example.test', client: client);
    api.updateAuthToken('test-customer-token');

    await expectLater(
      api.createOrder(
        customerName: 'Test',
        customerPhone: '012345678',
        items: [],
        idempotencyKey: 'test-key-12345678',
      ),
      throwsA(isA<HttpException>()),
    );
    await expectLater(
      api.getOrdersByPhone('012345678'),
      throwsA(isA<HttpException>()),
    );
    await expectLater(
      api.getOrderByReference('ORD-TEST'),
      throwsA(isA<HttpException>()),
    );

    expect(requests.map((request) => request.method), ['POST', 'GET', 'GET']);
    for (final request in requests) {
      expect(request.headers['authorization'], 'Bearer test-customer-token');
    }
    expect(requests.first.headers['idempotency-key'], 'test-key-12345678');
    client.close();
  });

  test(
    'authentication rejection cannot become a simulated placed order',
    () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient(
          (_) async =>
              http.Response('{"detail":"Invalid customer token."}', 401),
        ),
      );
      api.updateAuthToken('expired-test-token');
      final repository = OrderRepository(
        apiService: api,
        localStorageService: storage,
      );

      await expectLater(
        repository.placeOrder(
          customerName: 'Test',
          customerPhone: '012345678',
          items: [],
        ),
        throwsA(isA<HttpException>()),
      );
      expect(storage.getRecentOrderRefs(), isEmpty);
    },
  );

  test(
    'network outage does not create a server order or history reference',
    () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final api = ApiService(
        baseUrl: 'http://example.test',
        client: MockClient((_) async => throw const SocketException('offline')),
      );
      final repository = OrderRepository(
        apiService: api,
        localStorageService: storage,
      );

      await expectLater(
        repository.placeOrder(
          customerName: 'Test',
          customerPhone: '012345678',
          items: [],
        ),
        throwsA(isA<SocketException>()),
      );
      expect(storage.getRecentOrderRefs(), isEmpty);
      expect(storage.getPendingOrder(), isNotNull);
    },
  );

  test('retrying the same mobile order reuses its idempotency key', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = await LocalStorageService.init();
    final keys = <String?>[];
    final api = ApiService(
      baseUrl: 'http://example.test',
      client: MockClient((request) async {
        keys.add(request.headers['idempotency-key']);
        if (keys.length == 1) throw const SocketException('offline');
        return http.Response('{"detail":"Rejected"}', 422);
      }),
    );
    final repository = OrderRepository(
      apiService: api,
      localStorageService: storage,
    );
    await expectLater(
      repository.placeOrder(
        customerName: 'Test',
        customerPhone: '012345678',
        items: [],
      ),
      throwsA(isA<SocketException>()),
    );
    await expectLater(
      repository.placeOrder(
        customerName: 'Test',
        customerPhone: '012345678',
        items: [],
      ),
      throwsA(isA<HttpException>()),
    );
    expect(keys, hasLength(2));
    expect(keys.first, isNotEmpty);
    expect(keys[1], keys.first);
  });
}
