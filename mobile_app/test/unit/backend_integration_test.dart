import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/data/models/cart_item_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  HttpOverrides.global = null;
  TestWidgetsFlutterBinding.ensureInitialized();

  late Process serverProcess;
  late String baseUrl;
  late ApiService apiService;
  late LocalStorageService localStorage;

  setUpAll(() async {
    HttpOverrides.global = null;
    SharedPreferences.setMockInitialValues({});
    localStorage = await LocalStorageService.init();

    // Start ephemeral Node.js test server
    final completer = Completer<int>();
    serverProcess = await Process.start(
      'node',
      ['../backend/scripts/run-test-backend.mjs'],
    );

    serverProcess.stdout
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen((line) {
          if (line.startsWith('TEST_SERVER_READY:') && !completer.isCompleted) {
            final portStr = line.split(':')[1].trim();
            final port = int.parse(portStr);
            completer.complete(port);
          }
        });

    serverProcess.stderr
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen((_) {});

    final port = await completer.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        serverProcess.kill();
        throw TimeoutException('Node.js test backend server failed to start within 15 seconds.');
      },
    );

    baseUrl = 'http://127.0.0.1:$port';
    apiService = ApiService(baseUrl: baseUrl);
  });

  tearDownAll(() async {
    serverProcess.kill(ProcessSignal.sigterm);
    await serverProcess.exitCode.timeout(
      const Duration(seconds: 5),
      onTimeout: () {
        serverProcess.kill(ProcessSignal.sigkill);
        return 0;
      },
    );
  });

  group('Mobile App -> Node.js Backend Integration', () {
    test('1. Health check returns healthy from live backend', () async {
      final isHealthy = await apiService.checkHealth();
      expect(isHealthy, isTrue);
    });

    test('2. Catalog categories and products retrieve seeded items correctly', () async {
      final categories = await apiService.getCategories();
      expect(categories, isNotEmpty);
      expect(categories.first.id, greaterThan(0));
      expect(categories.first.name, isNotEmpty);

      final allProducts = await apiService.getProducts();
      expect(allProducts, isNotEmpty);
      final firstProduct = allProducts.first;
      expect(firstProduct.id, greaterThan(0));
      expect(firstProduct.name, isNotEmpty);
      expect(firstProduct.basePriceUsd, greaterThan(0));

      // Category filter
      final filtered = await apiService.getProducts(
        categoryId: firstProduct.categoryId,
      );
      expect(filtered, isNotEmpty);
      expect(filtered.every((p) => p.categoryId == firstProduct.categoryId), isTrue);

      // Search filter
      final searched = await apiService.getProducts(
        search: firstProduct.name.substring(0, 3),
      );
      expect(searched, isNotEmpty);
      expect(searched.any((p) => p.id == firstProduct.id), isTrue);
    });

    test('3. ShopRepository interacts seamlessly with live backend catalog', () async {
      final repo = ShopRepository(apiService: apiService);
      final cats = await repo.getCategories();
      final prods = await repo.getProducts();

      expect(cats, isNotEmpty);
      expect(prods, isNotEmpty);
    });

    test('4. Customer auth lifecycle: registration, login, and profile fetching', () async {
      final uniquePhone = '011${DateTime.now().millisecondsSinceEpoch % 1000000}';
      final uniqueEmail = 'flutter_customer_${DateTime.now().millisecondsSinceEpoch}@example.com';
      const password = 'flutterPassword123';

      // Register
      final regRes = await apiService.registerCustomer(
        fullName: 'Flutter Test Customer',
        phone: uniquePhone,
        email: uniqueEmail,
        password: password,
      );
      expect(regRes['access_token'], isNotNull);
      final user = regRes['user'] as Map<String, dynamic>;
      expect(user['full_name'], 'Flutter Test Customer');
      expect(user['phone'], uniquePhone);

      // Login
      final loginRes = await apiService.loginCustomer(
        identifier: uniquePhone,
        password: password,
      );
      final token = loginRes['access_token'] as String;
      expect(token, isNotEmpty);

      // Fetch profile
      final me = await apiService.getCustomerMe(token);
      expect(me['id'], user['id']);
      expect(me['phone'], uniquePhone);
    });

    test('5. Order placement, retrieval by reference, phone lookup, and my orders history', () async {
      final uniquePhone = '089${DateTime.now().millisecondsSinceEpoch % 1000000}';
      const password = 'mobileOrderPassword123';

      final reg = await apiService.registerCustomer(
        fullName: 'Flutter Drinker',
        phone: uniquePhone,
        password: password,
      );
      final token = reg['access_token'] as String;
      apiService.updateAuthToken(token);

      final products = await apiService.getProducts();
      expect(products, isNotEmpty);
      final product = products.first;

      final cartItem = CartItemModel(
        product: product,
        quantity: 2,
        size: 'Large',
        sugarLevel: '50%',
        iceLevel: 'Normal Ice',
        toppings: ['Brown Sugar Pearls'],
      );

      // Place order via ApiService
      final createdOrder = await apiService.createOrder(
        customerName: 'Flutter Drinker',
        customerPhone: uniquePhone,
        items: [cartItem],
        paymentMethod: 'cash',
        idempotencyKey: 'flutter-key-${DateTime.now().millisecondsSinceEpoch}',
      );

      expect(createdOrder.id, greaterThan(0));
      expect(createdOrder.orderNumber, startsWith('ORD-'));
      expect(createdOrder.customerName, 'Flutter Drinker');
      expect(createdOrder.customerPhone, uniquePhone);
      expect(createdOrder.orderStatus, 'pending');
      expect(createdOrder.items, isNotEmpty);

      // Lookup by reference
      final fetchedByRef = await apiService.getOrderByReference(createdOrder.orderNumber);
      expect(fetchedByRef.id, createdOrder.id);
      expect(fetchedByRef.orderNumber, createdOrder.orderNumber);

      // Lookup by phone
      final phoneOrders = await apiService.getOrdersByPhone(uniquePhone);
      expect(phoneOrders, isNotEmpty);
      expect(phoneOrders.any((o) => o.id == createdOrder.id), isTrue);

      // Lookup my orders
      final myOrders = await apiService.getMyOrders();
      expect(myOrders, isNotEmpty);
      expect(myOrders.any((o) => o.id == createdOrder.id), isTrue);
    });

    test('6. OrderRepository placeOrder end-to-end integration', () async {
      final uniquePhone = '088${DateTime.now().millisecondsSinceEpoch % 1000000}';
      const password = 'repoPassword123';

      final reg = await apiService.registerCustomer(
        fullName: 'Repo Customer',
        phone: uniquePhone,
        password: password,
      );
      final token = reg['access_token'] as String;
      apiService.updateAuthToken(token);

      final products = await apiService.getProducts();
      final product = products.first;

      final cartItem = CartItemModel(
        product: product,
        quantity: 1,
        size: 'Medium',
        sugarLevel: '100%',
        iceLevel: 'No Ice',
      );

      final orderRepo = OrderRepository(
        apiService: apiService,
        localStorageService: localStorage,
      );

      final placed = await orderRepo.placeOrder(
        customerName: 'Repo Customer',
        customerPhone: uniquePhone,
        items: [cartItem],
        paymentMethod: 'cash',
      );

      expect(placed.id, greaterThan(0));
      expect(placed.orderNumber, startsWith('ORD-'));
      expect(placed.customerName, 'Repo Customer');
    });
  });
}
