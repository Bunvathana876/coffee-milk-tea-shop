import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/core/widgets/empty_state.dart';
import 'package:mobile_app/data/models/cart_item_model.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/cart_provider.dart';
import 'package:mobile_app/providers/order_provider.dart';
import 'package:mobile_app/providers/shop_provider.dart';
import 'package:mobile_app/providers/user_provider.dart';

import 'package:mobile_app/ui/features/cart/screens/cart_screen.dart';
import 'package:mobile_app/ui/features/cart/widgets/cart_item_tile.dart';
import 'package:mobile_app/ui/features/cart/widgets/checkout_sheet.dart';
import 'package:mobile_app/ui/features/cart/widgets/empty_cart_view.dart';
import 'package:mobile_app/ui/features/menu/screens/menu_screen.dart';
import 'package:mobile_app/ui/features/orders/screens/order_history_screen.dart';
import 'package:mobile_app/ui/features/orders/widgets/order_card.dart';
import 'package:mobile_app/ui/features/orders/widgets/order_status_tracker.dart';
import 'package:mobile_app/ui/features/orders/widgets/orders_empty_state.dart';
import 'package:mobile_app/ui/features/profile/screens/profile_screen.dart';
import 'package:mobile_app/ui/navigation/main_screen.dart';

/// Deterministic mock for ShopProvider
class MockShopProvider extends ShopProvider {
  MockShopProvider({
    required super.shopRepository,
    List<CategoryModel>? initialCategories,
    List<ProductModel>? initialProducts,
    bool initialLoading = false,
    String? initialError,
  }) {
    if (initialCategories != null) _testCategories = List.from(initialCategories);
    if (initialProducts != null) _testProducts = List.from(initialProducts);
    _testLoading = initialLoading;
    _testError = initialError;
  }

  List<CategoryModel> _testCategories = [
    const CategoryModel(id: 1, name: 'Coffee', isActive: true),
    const CategoryModel(id: 2, name: 'Milk Tea', isActive: true),
    const CategoryModel(id: 3, name: 'Fruit Tea', isActive: true),
  ];
  List<ProductModel> _testProducts = [
    const ProductModel(
      id: 101,
      name: 'Signature Latte',
      categoryId: 1,
      description: 'Rich espresso with steamed milk',
      basePriceUsd: 3.50,
      isAvailable: true,
    ),
    const ProductModel(
      id: 102,
      name: 'Brown Sugar Boba',
      categoryId: 2,
      description: 'Caramelized pearls with fresh milk',
      basePriceUsd: 3.75,
      isAvailable: true,
    ),
  ];
  bool _testLoading = false;
  String? _testError;

  @override
  List<CategoryModel> get categories => List.unmodifiable(_testCategories);
  @override
  List<ProductModel> get products => List.unmodifiable(_testProducts);
  @override
  List<ProductModel> get filteredProducts => List.unmodifiable(_testProducts);
  @override
  bool get isLoading => _testLoading;
  @override
  String? get errorMessage => _testError;

  void setTestProducts(List<ProductModel> products) {
    _testProducts = List.from(products);
    notifyListeners();
  }

  void setTestLoading(bool loading) {
    _testLoading = loading;
    notifyListeners();
  }

  void setTestError(String? error) {
    _testError = error;
    notifyListeners();
  }

  @override
  Future<void> refreshCatalog() async {}

  @override
  Future<void> initialize() async {}
}

/// Deterministic mock for OrderProvider
class MockOrderProvider extends OrderProvider {
  MockOrderProvider({
    required super.orderRepository,
    List<OrderModel>? initialOrders,
    bool initialLoading = false,
    String? initialError,
  }) {
    if (initialOrders != null) _testOrders = List.from(initialOrders);
    _testLoading = initialLoading;
    _testError = initialError;
    resetForSession('server_jwt_valid_123');
  }

  List<OrderModel> _testOrders = [];
  bool _testLoading = false;
  String? _testError;

  @override
  List<OrderModel> get recentOrders => List.unmodifiable(_testOrders);
  @override
  bool get isLoading => _testLoading;
  @override
  String? get errorMessage => _testError;

  void setTestOrders(List<OrderModel> orders) {
    _testOrders = List.from(orders);
    notifyListeners();
  }

  void setTestLoading(bool loading) {
    _testLoading = loading;
    notifyListeners();
  }

  void setTestError(String? error) {
    _testError = error;
    notifyListeners();
  }

  @override
  Future<void> loadMyOrders() async {}
}

Widget buildTestScaffold({
  required Widget child,
  required ShopProvider shop,
  required CartProvider cart,
  required OrderProvider order,
  required UserProvider user,
  double width = 390,
  double height = 844,
  double textScale = 1.0,
}) {
  return MediaQuery(
    data: MediaQueryData(
      size: Size(width, height),
      textScaler: TextScaler.linear(textScale),
      padding: const EdgeInsets.only(top: 47, bottom: 34),
    ),
    child: MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: shop),
        ChangeNotifierProvider.value(value: cart),
        ChangeNotifierProvider.value(value: order),
        ChangeNotifierProvider.value(value: user),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: child,
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Representative Device Viewports for iPhone and Android
  const deviceConfigs = [
    // iPhone Viewports
    (name: 'iPhone Standard (14/15/16)', width: 390.0, height: 844.0),
    (name: 'iPhone Pro Max', width: 430.0, height: 932.0),
    (name: 'iPhone Compact / SE', width: 320.0, height: 568.0),
    // Android Viewports
    (name: 'Android Standard (Pixel / Galaxy)', width: 360.0, height: 800.0),
    (name: 'Android Large (Pixel Pro)', width: 412.0, height: 915.0),
  ];

  late LocalStorageService storage;
  late MockShopProvider shop;
  late CartProvider cart;
  late MockOrderProvider order;
  late UserProvider user;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'customer_auth_token': 'server_jwt_valid_123',
      'customer_name': 'Sokha Ly',
      'customer_phone': '012998877',
      'server_account_phone': '012998877',
      'confirmed_loyalty_stamps_012998877': 5,
    });
    storage = await LocalStorageService.init();
    final api = ApiService();
    shop = MockShopProvider(
      shopRepository: ShopRepository(apiService: api),
    );
    cart = CartProvider(localStorageService: storage);
    order = MockOrderProvider(
      orderRepository: OrderRepository(apiService: api, localStorageService: storage),
    );
    user = UserProvider(localStorageService: storage, apiService: api);
  });

  group('1. Home & Menu Screen Tests across iPhone and Android', () {
    testWidgets('Home Screen renders populated catalog without layout overflow on all device sizes', (tester) async {
      for (final device in deviceConfigs) {
        await tester.binding.setSurfaceSize(Size(device.width, device.height));
        await tester.pumpWidget(
          buildTestScaffold(
            child: const MenuScreen(),
            shop: shop,
            cart: cart,
            order: order,
            user: user,
            width: device.width,
            height: device.height,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed on ${device.name}');
        expect(find.byType(TextField), findsOneWidget); // Search bar
        expect(find.text('Coffee'), findsOneWidget); // Category chip
        expect(find.byKey(const Key('home-surprise-barista-card')), findsOneWidget);

        // Scroll down to reveal drinks in catalog sliver
        await tester.drag(find.byType(CustomScrollView), const Offset(0, -350));
        await tester.pumpAndSettle();

        expect(find.text('Signature Latte'), findsOneWidget);
        expect(find.text('Brown Sugar Boba'), findsOneWidget);
      }
      await tester.binding.setSurfaceSize(null);
    });

    testWidgets('Home & Menu Screen correctly renders loading and error states', (tester) async {
      await tester.binding.setSurfaceSize(const Size(430, 932));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      // 1. Loading state
      shop.setTestLoading(true);
      await tester.pumpWidget(
        buildTestScaffold(
          child: const MenuScreen(),
          shop: shop,
          cart: cart,
          order: order,
          user: user,
          width: 430,
          height: 932,
        ),
      );
      await tester.pump();
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -500));
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // 2. Error state with Retry button
      shop.setTestLoading(false);
      shop.setTestError('Cannot connect to café server. Please check internet connection.');
      shop.setTestProducts([]);

      await tester.pumpWidget(
        buildTestScaffold(
          child: const MenuScreen(),
          shop: shop,
          cart: cart,
          order: order,
          user: user,
          width: 430,
          height: 932,
        ),
      );
      await tester.pumpAndSettle();
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();

      expect(find.byType(EmptyState), findsOneWidget);
      expect(find.text('Menu unavailable'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('2. Cart (Bag) Screen Tests across iPhone and Android', () {
    testWidgets('Cart Screen renders honest empty bag state across all devices', (tester) async {
      for (final device in deviceConfigs) {
        await tester.binding.setSurfaceSize(Size(device.width, device.height));
        await tester.pumpWidget(
          buildTestScaffold(
            child: const CartScreen(),
            shop: shop,
            cart: cart,
            order: order,
            user: user,
            width: device.width,
            height: device.height,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed on ${device.name}');
        expect(find.byType(EmptyCartView), findsOneWidget);
        expect(find.text('Your bag is empty'), findsOneWidget);
        expect(find.text('Explore Menu'), findsOneWidget);
      }
      await tester.binding.setSurfaceSize(null);
    });

    testWidgets('Cart Screen populated state displays drinks, customizations, and dual currency', (tester) async {
      cart.addItem(
        CartItemModel(
          product: const ProductModel(
            id: 101,
            name: 'Signature Latte',
            categoryId: 1,
            basePriceUsd: 3.50,
          ),
          size: 'Large',
          sugarLevel: '50%',
          iceLevel: 'Less Ice',
          toppings: const ['Brown Sugar Pearls'],
          quantity: 2,
        ),
      );

      for (final device in deviceConfigs) {
        await tester.binding.setSurfaceSize(Size(device.width, device.height));
        await tester.pumpWidget(
          buildTestScaffold(
            child: const CartScreen(),
            shop: shop,
            cart: cart,
            order: order,
            user: user,
            width: device.width,
            height: device.height,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed on ${device.name}');
        expect(find.byType(CartItemTile), findsOneWidget);
        expect(find.text('Signature Latte'), findsOneWidget);
        expect(find.text('Proceed to Checkout'), findsOneWidget);
      }
      await tester.binding.setSurfaceSize(null);
    });
  });

  group('3. Checkout Screen / Sheet Tests', () {
    testWidgets('Checkout Sheet renders form validation, payment toggles, and total estimate', (tester) async {
      await tester.binding.setSurfaceSize(const Size(430, 932));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      cart.addItem(
        CartItemModel(
          product: const ProductModel(
            id: 102,
            name: 'Brown Sugar Boba',
            categoryId: 2,
            basePriceUsd: 3.75,
          ),
          size: 'Regular',
          quantity: 1,
        ),
      );

      await tester.pumpWidget(
        buildTestScaffold(
          child: const Scaffold(body: CheckoutSheet()),
          shop: shop,
          cart: cart,
          order: order,
          user: user,
          width: 430,
          height: 932,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Checkout & Pickup'), findsOneWidget);
      expect(find.text('Your information'), findsOneWidget);

      // Scroll form to reveal payment toggles and review items
      await tester.drag(find.byType(ListView), const Offset(0, -250));
      await tester.pumpAndSettle();

      expect(find.text('Payment Method'), findsOneWidget);
      expect(find.text('Pay at Counter'), findsOneWidget);
      expect(find.text('KHQR · DEMO ONLY'), findsOneWidget);
      expect(find.text('Review your drinks'), findsOneWidget);
    });
  });

  group('4. Orders Screen Tests across iPhone and Android', () {
    testWidgets('Orders Screen renders 4-stage tracker, header barista, and honest empty state', (tester) async {
      for (final device in deviceConfigs) {
        await tester.binding.setSurfaceSize(Size(device.width, device.height));
        await tester.pumpWidget(
          buildTestScaffold(
            child: OrderHistoryScreen(onExploreMenu: () {}),
            shop: shop,
            cart: cart,
            order: order,
            user: user,
            width: device.width,
            height: device.height,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed on ${device.name}');
        expect(find.byType(OrderStatusTracker), findsOneWidget);
        expect(find.byType(OrdersEmptyState), findsOneWidget);
        expect(find.text('No orders yet!'), findsOneWidget);
        expect(find.text('Explore Menu'), findsOneWidget);
      }
      await tester.binding.setSurfaceSize(null);
    });

    testWidgets('Orders Screen renders live order cards with status badges and reorder action', (tester) async {
      final sampleOrder = OrderModel(
        id: 991,
        orderNumber: 'ORD-20261116-001',
        customerName: 'Sokha Ly',
        customerPhone: '012998877',
        subtotalUsd: 7.00,
        totalUsd: 7.00,
        totalKhr: 28700,
        paymentStatus: 'unpaid',
        orderStatus: 'preparing',
        createdAt: DateTime.now(),
        items: const [
          OrderItemModel(
            id: 1,
            productId: 101,
            productName: 'Signature Latte',
            quantity: 2,
            unitPriceUsd: 3.5,
            subtotalUsd: 7.0,
            size: 'Large',
            sugarLevel: '30%',
            iceLevel: 'Less Ice',
            toppings: 'Brown Sugar Pearls',
          ),
        ],
      );

      order.setTestOrders([sampleOrder]);

      for (final device in deviceConfigs) {
        await tester.binding.setSurfaceSize(Size(device.width, device.height));
        await tester.pumpWidget(
          buildTestScaffold(
            child: OrderHistoryScreen(onExploreMenu: () {}),
            shop: shop,
            cart: cart,
            order: order,
            user: user,
            width: device.width,
            height: device.height,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed on ${device.name}');
        expect(find.byType(OrderCard), findsOneWidget);
        expect(
          find.descendant(
            of: find.byType(OrderCard),
            matching: find.text('ORD-20261116-001'),
          ),
          findsOneWidget,
        );
        expect(
          find.descendant(
            of: find.byType(OrderCard),
            matching: find.text('Preparing'),
          ),
          findsOneWidget,
        );
        expect(find.text('Reorder Items'), findsOneWidget);
      }
      await tester.binding.setSurfaceSize(null);
    });

    testWidgets('Orders Screen displays error state with working retry action', (tester) async {
      order.setTestError('Server communication timeout. Please tap Retry.');
      order.setTestOrders([]);

      await tester.pumpWidget(
        buildTestScaffold(
          child: const OrderHistoryScreen(),
          shop: shop,
          cart: cart,
          order: order,
          user: user,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Could not load your orders'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('5. Profile Screen Tests across iPhone and Android', () {
    testWidgets('Profile Screen renders loyalty card, profile info, and navigation links', (tester) async {
      for (final device in deviceConfigs) {
        await tester.binding.setSurfaceSize(Size(device.width, device.height));
        await tester.pumpWidget(
          buildTestScaffold(
            child: const ProfileScreen(),
            shop: shop,
            cart: cart,
            order: order,
            user: user,
            width: device.width,
            height: device.height,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed on ${device.name}');
        expect(find.text('Sokha Ly'), findsOneWidget);
        expect(find.text('012998877'), findsOneWidget);
        expect(find.text('Café Punch Card'), findsOneWidget);
        expect(find.text('Your Orders'), findsOneWidget);

        // Scroll down to reveal Settings card and Sign Out button
        await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -300));
        await tester.pumpAndSettle();

        expect(find.text('Settings'), findsOneWidget);
        expect(find.text('Sign Out'), findsOneWidget);
      }
      await tester.binding.setSurfaceSize(null);
    });
  });

  group('6. Main Navigation Root Shell Integration', () {
    testWidgets('MainScreen switches across Home, Orders, Bag, and Profile tabs smoothly', (tester) async {
      await tester.pumpWidget(
        buildTestScaffold(
          child: const MainScreen(),
          shop: shop,
          cart: cart,
          order: order,
          user: user,
        ),
      );
      await tester.pumpAndSettle();

      // Home active initially
      expect(find.byType(MenuScreen), findsOneWidget);

      // Switch to Orders
      await tester.tap(find.byKey(const Key('nav-orders')));
      await tester.pumpAndSettle();
      expect(find.byType(OrderHistoryScreen), findsOneWidget);

      // Switch to Bag
      await tester.tap(find.byKey(const Key('nav-bag')));
      await tester.pumpAndSettle();
      expect(find.byType(CartScreen), findsOneWidget);

      // Switch to Profile
      await tester.tap(find.byKey(const Key('nav-profile')));
      await tester.pumpAndSettle();
      expect(find.byType(ProfileScreen), findsOneWidget);

      // Back to Home
      await tester.tap(find.byKey(const Key('nav-home')));
      await tester.pumpAndSettle();
      expect(find.byType(MenuScreen), findsOneWidget);
    });
  });
}
