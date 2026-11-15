import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
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
import 'package:mobile_app/ui/features/auth/screens/auth_screen.dart';
import 'package:mobile_app/ui/features/orders/screens/order_history_screen.dart';
import 'package:mobile_app/ui/features/orders/screens/order_tracking_screen.dart';
import 'package:mobile_app/ui/features/orders/widgets/order_card.dart';
import 'package:mobile_app/ui/features/orders/widgets/order_status_tracker.dart';
import 'package:mobile_app/ui/features/orders/widgets/orders_empty_state.dart';
import 'package:mobile_app/ui/features/orders/widgets/orders_header.dart';
import 'package:mobile_app/ui/navigation/main_screen.dart';

class MockShopProvider extends ShopProvider {
  MockShopProvider({
    required super.shopRepository,
    List<ProductModel>? initialProducts,
  }) {
    if (initialProducts != null) _testProducts = List.from(initialProducts);
  }

  List<ProductModel> _testProducts = [];

  @override
  List<ProductModel> get products => List.unmodifiable(_testProducts);

  void setTestProducts(List<ProductModel> products) {
    _testProducts = List.from(products);
    notifyListeners();
  }
}

/// Test mock for OrderProvider allowing full deterministic control over order states.
class MockOrderProvider extends OrderProvider {
  MockOrderProvider({
    required super.orderRepository,
    List<OrderModel>? initialOrders,
    bool initialLoading = false,
    String? initialError,
    String sessionToken = 'test_token',
  }) {
    if (initialOrders != null) _testOrders = List.from(initialOrders);
    _testLoading = initialLoading;
    _testError = initialError;
    resetForSession(sessionToken);
  }

  List<OrderModel> _testOrders = [];
  bool _testLoading = false;
  String? _testError;
  bool loadMyOrdersCalled = false;

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
  Future<void> loadMyOrders() async {
    loadMyOrdersCalled = true;
    notifyListeners();
  }
}

OrderModel createSampleOrder({
  int id = 101,
  String orderNumber = 'CAF-101-TEST',
  String orderStatus = 'pending',
  String paymentStatus = 'paid',
  double totalUsd = 4.50,
}) {
  return OrderModel(
    id: id,
    orderNumber: orderNumber,
    customerName: 'Sokha Chan',
    customerPhone: '012345678',
    subtotalUsd: totalUsd,
    totalUsd: totalUsd,
    totalKhr: totalUsd * 4100,
    paymentStatus: paymentStatus,
    orderStatus: orderStatus,
    createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
    items: [
      const OrderItemModel(
        id: 1,
        productId: 1,
        productName: 'Signature Milk Tea',
        quantity: 1,
        unitPriceUsd: 2.50,
        subtotalUsd: 2.50,
        size: 'Medium',
        sugarLevel: '50%',
        iceLevel: 'Normal Ice',
        toppings: 'Boba Pearls',
      ),
      const OrderItemModel(
        id: 2,
        productId: 2,
        productName: 'Brown Sugar Boba',
        quantity: 1,
        unitPriceUsd: 2.00,
        subtotalUsd: 2.00,
        size: 'Regular',
        sugarLevel: '70%',
        iceLevel: 'Less Ice',
        toppings: '',
      ),
    ],
  );
}

Widget createOrdersTestApp({
  required UserProvider userProvider,
  required OrderProvider orderProvider,
  required CartProvider cartProvider,
  ShopProvider? shopProvider,
  VoidCallback? onExploreMenu,
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
        ChangeNotifierProvider<UserProvider>.value(value: userProvider),
        ChangeNotifierProvider<OrderProvider>.value(value: orderProvider),
        ChangeNotifierProvider<CartProvider>.value(value: cartProvider),
        ChangeNotifierProvider<ShopProvider>.value(
          value:
              shopProvider ??
              MockShopProvider(
                shopRepository: ShopRepository(apiService: ApiService()),
              ),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: OrderHistoryScreen(onExploreMenu: onExploreMenu),
      ),
    ),
  );
}

Future<void> pumpOrdersApp(
  WidgetTester tester, {
  required UserProvider userProvider,
  required OrderProvider orderProvider,
  required CartProvider cartProvider,
  ShopProvider? shopProvider,
  VoidCallback? onExploreMenu,
  double width = 390,
  double height = 844,
  double textScale = 1.0,
  bool settle = true,
}) async {
  await tester.binding.setSurfaceSize(Size(width, height));
  addTearDown(() async {
    await tester.binding.setSurfaceSize(null);
  });
  await tester.pumpWidget(
    createOrdersTestApp(
      userProvider: userProvider,
      orderProvider: orderProvider,
      cartProvider: cartProvider,
      shopProvider: shopProvider,
      onExploreMenu: onExploreMenu,
      width: width,
      height: height,
      textScale: textScale,
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  test('V4 artwork and status icons are bundled', () async {
    for (final path in [
      'assets/images/orders_v4/illustrations/orders_header_barista_512.png',
      'assets/images/orders_v4/illustrations/no_orders_illustration_800.png',
      'assets/images/orders_v4/icons/header_bag_white_96.png',
      'assets/images/orders_v4/icons/status_pending_96.png',
      'assets/images/orders_v4/icons/status_preparing_96.png',
      'assets/images/orders_v4/icons/status_ready_96.png',
      'assets/images/orders_v4/icons/status_completed_96.png',
      'assets/images/orders_v4/icons/status_cancelled_96.png',
      'assets/images/orders_v4/icons/nav_orders_96.png',
      'assets/images/orders_v4/icons/ui_cup_white_96.png',
      'assets/images/orders_v4/icons/ui_arrow_right_white_96.png',
    ]) {
      expect((await rootBundle.load(path)).lengthInBytes, greaterThan(0));
    }
  });

  testWidgets(
    '1. Header renders branding, title, barista and wave transition',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_auth_token': 'test_token',
        'server_account_phone': '012345678',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );
      final order = MockOrderProvider(
        orderRepository: OrderRepository(
          apiService: ApiService(),
          localStorageService: storage,
        ),
        sessionToken: 'test_token',
      );

      final cart = CartProvider(localStorageService: storage);
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: order,
        cartProvider: cart,
      );

      // Verify OrdersHeader
      expect(find.byType(OrdersHeader), findsOneWidget);
      expect(find.bySemanticsLabel('Brew & Boba Café'), findsOneWidget);
      expect(find.text('BREW & BOBA'), findsOneWidget);
      expect(find.text('Your Orders'), findsOneWidget);
      expect(find.text('Track and check your café orders.'), findsOneWidget);
      expect(find.bySemanticsLabel('Shopping Bag'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Smiling café barista holding a cup'),
        findsOneWidget,
      );
      expect(find.byType(CustomPaint), findsWidgets);
    },
  );

  testWidgets(
    '2. Four-stage tracker card renders neutral preview for empty orders',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_auth_token': 'test_token',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );
      final order = MockOrderProvider(
        orderRepository: OrderRepository(
          apiService: ApiService(),
          localStorageService: storage,
        ),
        initialOrders: [],
        sessionToken: 'test_token',
      );

      final cart = CartProvider(localStorageService: storage);
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: order,
        cartProvider: cart,
      );

      // Tracker card exists
      expect(find.byType(OrderStatusTracker), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Semantics &&
              widget.properties.label == 'Order status guide. No active order.',
        ),
        findsOneWidget,
      );
      expect(find.text('LIVE ORDER STATUS'), findsNothing);

      // Four steps present
      expect(find.text('Pending'), findsOneWidget);
      expect(find.text('Preparing'), findsOneWidget);
      expect(find.text('Ready'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
    },
  );

  testWidgets('Loading shows progress without an empty-order claim', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'customer_auth_token': 'test_token',
    });
    final storage = await LocalStorageService.init();
    final user = UserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );
    final orders = MockOrderProvider(
      orderRepository: OrderRepository(
        apiService: ApiService(),
        localStorageService: storage,
      ),
      initialLoading: true,
      sessionToken: 'test_token',
    );
    await pumpOrdersApp(
      tester,
      userProvider: user,
      orderProvider: orders,
      cartProvider: CartProvider(localStorageService: storage),
      settle: false,
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('No orders yet!'), findsNothing);
    orders.setTestLoading(false);
    await tester.pumpAndSettle();
    expect(find.text('No orders yet!'), findsOneWidget);
  });

  testWidgets('3. Tracker correctly reflects active order stages', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'customer_auth_token': 'test_token',
    });
    final storage = await LocalStorageService.init();
    final user = UserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );

    // Test Pending stage
    final pendingOrder = createSampleOrder(
      orderNumber: 'CAF-PENDING',
      orderStatus: 'pending',
    );
    final orderProvider = MockOrderProvider(
      orderRepository: OrderRepository(
        apiService: ApiService(),
        localStorageService: storage,
      ),
      initialOrders: [pendingOrder],
      sessionToken: 'test_token',
    );

    final cart = CartProvider(localStorageService: storage);
    await pumpOrdersApp(
      tester,
      userProvider: user,
      orderProvider: orderProvider,
      cartProvider: cart,
    );

    expect(find.text('LIVE ORDER STATUS'), findsOneWidget);
    expect(find.text('CAF-PENDING'), findsWidgets);

    // Switch to Preparing
    orderProvider.setTestOrders([
      createSampleOrder(orderNumber: 'CAF-PREPARING', orderStatus: 'preparing'),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('CAF-PREPARING'), findsWidgets);

    // Switch to Ready
    orderProvider.setTestOrders([
      createSampleOrder(orderNumber: 'CAF-READY', orderStatus: 'ready'),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('CAF-READY'), findsWidgets);

    // Switch to Completed
    orderProvider.setTestOrders([
      createSampleOrder(orderNumber: 'CAF-COMPLETED', orderStatus: 'completed'),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('ORDER COMPLETED'), findsOneWidget);
    expect(find.text('CAF-COMPLETED'), findsWidgets);
  });

  testWidgets('4. Cancelled order shows cancelled badge and not completed', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'customer_auth_token': 'test_token',
    });
    final storage = await LocalStorageService.init();
    final user = UserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );
    final cancelledOrder = createSampleOrder(
      orderNumber: 'CAF-CANCELLED',
      orderStatus: 'cancelled',
    );
    final orderProvider = MockOrderProvider(
      orderRepository: OrderRepository(
        apiService: ApiService(),
        localStorageService: storage,
      ),
      initialOrders: [cancelledOrder],
      sessionToken: 'test_token',
    );

    final cart = CartProvider(localStorageService: storage);
    await pumpOrdersApp(
      tester,
      userProvider: user,
      orderProvider: orderProvider,
      cartProvider: cart,
    );

    expect(find.text('ORDER CANCELLED'), findsOneWidget);
    expect(find.text('Cancelled'), findsWidgets);
    expect(find.text('ORDER COMPLETED'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label == 'Order CAF-CANCELLED cancelled.',
      ),
      findsOneWidget,
    );
  });

  testWidgets(
    '5. Empty state shows V4 illustration, copy, and Explore Menu button navigates',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_auth_token': 'test_token',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );
      final orderProvider = MockOrderProvider(
        orderRepository: OrderRepository(
          apiService: ApiService(),
          localStorageService: storage,
        ),
        initialOrders: [],
        sessionToken: 'test_token',
      );

      final cart = CartProvider(localStorageService: storage);
      bool exploreMenuTapped = false;
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: orderProvider,
        cartProvider: cart,
        onExploreMenu: () => exploreMenuTapped = true,
      );

      expect(find.byType(OrdersEmptyState), findsOneWidget);
      expect(
        find.bySemanticsLabel('Empty shopping bag with boba tea drink'),
        findsOneWidget,
      );
      expect(find.text('No orders yet!'), findsOneWidget);
      expect(
        find.text(
          'You haven’t placed any orders.\nExplore our menu and order your favorite drinks!',
        ),
        findsOneWidget,
      );

      final exploreBtn = find.byKey(const Key('explore-menu-btn'));
      expect(exploreBtn, findsOneWidget);

      await tester.ensureVisible(exploreBtn);
      await tester.tap(exploreBtn);
      await tester.pumpAndSettle();
      expect(exploreMenuTapped, isTrue);
    },
  );

  testWidgets('6. Guest state displays sign in prompt and opens auth screen', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final storage = await LocalStorageService.init();
    final user = UserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );
    final orderProvider = MockOrderProvider(
      orderRepository: OrderRepository(
        apiService: ApiService(),
        localStorageService: storage,
      ),
      sessionToken: '',
    );

    final cart = CartProvider(localStorageService: storage);
    await pumpOrdersApp(
      tester,
      userProvider: user,
      orderProvider: orderProvider,
      cartProvider: cart,
    );

    expect(find.text('Sign in to view orders'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    final signInBtn = find.byKey(const Key('guest-sign-in-btn'));
    expect(signInBtn, findsOneWidget);

    await tester.ensureVisible(signInBtn);
    await tester.tap(signInBtn);
    await tester.pumpAndSettle();

    // Verify AuthScreen was pushed
    expect(find.byType(AuthScreen), findsOneWidget);
  });

  testWidgets('7. Real order card displays items, prices, and reorder action', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'customer_auth_token': 'test_token',
    });
    final storage = await LocalStorageService.init();
    final user = UserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );
    final sampleOrder = createSampleOrder(
      orderNumber: 'CAF-2026-REORDER',
      totalUsd: 4.50,
    ).copyWith(totalKhr: 19000);
    final orderProvider = MockOrderProvider(
      orderRepository: OrderRepository(
        apiService: ApiService(),
        localStorageService: storage,
      ),
      initialOrders: [sampleOrder],
      sessionToken: 'test_token',
    );

    final cartProvider = CartProvider(localStorageService: storage);
    final shopProvider = MockShopProvider(
      shopRepository: ShopRepository(apiService: ApiService()),
      initialProducts: [
        ProductModel(
          id: 1,
          name: 'Signature Milk Tea',
          categoryId: 1,
          basePriceUsd: 2.50,
          isAvailable: true,
        ),
        ProductModel(
          id: 2,
          name: 'Brown Sugar Boba',
          categoryId: 1,
          basePriceUsd: 2.00,
          isAvailable: true,
        ),
      ],
    );

    await pumpOrdersApp(
      tester,
      userProvider: user,
      orderProvider: orderProvider,
      cartProvider: cartProvider,
      shopProvider: shopProvider,
    );

    expect(find.byType(OrderCard), findsOneWidget);
    expect(find.text('CAF-2026-REORDER'), findsWidgets);
    expect(find.text('19,000 ៛'), findsOneWidget);

    // Reorder button
    final reorderBtn = find.text('Reorder Items');
    expect(reorderBtn, findsOneWidget);

    await tester.ensureVisible(reorderBtn);
    await tester.tap(reorderBtn);
    await tester.pumpAndSettle();

    // Verify items added to cart
    expect(cartProvider.totalQuantity, 2);
    expect(find.byType(SnackBar), findsOneWidget);

    await tester.tap(find.byType(OrderCard));
    await tester.pumpAndSettle();
    expect(find.byType(OrderTrackingScreen), findsOneWidget);
    orderProvider.resetForSession('');
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('8. Error banner displays message and Retry reloads orders', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'customer_auth_token': 'test_token',
    });
    final storage = await LocalStorageService.init();
    final user = UserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );
    final orderProvider = MockOrderProvider(
      orderRepository: OrderRepository(
        apiService: ApiService(),
        localStorageService: storage,
      ),
      initialOrders: [],
      initialError: 'Server could not be reached.',
      sessionToken: 'test_token',
    );

    final cart = CartProvider(localStorageService: storage);
    await pumpOrdersApp(
      tester,
      userProvider: user,
      orderProvider: orderProvider,
      cartProvider: cart,
    );

    expect(find.text('Server could not be reached.'), findsOneWidget);
    expect(find.text('No orders yet!'), findsNothing);
    expect(find.text('Could not load your orders'), findsOneWidget);
    final retryBtn = find.text('Retry');
    expect(retryBtn, findsOneWidget);

    await tester.tap(retryBtn);
    await tester.pumpAndSettle();
    expect(orderProvider.loadMyOrdersCalled, isTrue);
  });

  testWidgets(
    '9. Responsive layouts and 200% text scaling render without overflows',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_auth_token': 'test_token',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );
      final sampleOrder = createSampleOrder();
      final orderProvider = MockOrderProvider(
        orderRepository: OrderRepository(
          apiService: ApiService(),
          localStorageService: storage,
        ),
        initialOrders: [sampleOrder],
        sessionToken: 'test_token',
      );

      final cart = CartProvider(localStorageService: storage);

      // Narrow screen (320px)
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: orderProvider,
        cartProvider: cart,
        width: 320,
        height: 568,
      );
      expect(tester.takeException(), isNull);

      orderProvider.setTestOrders([]);
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: orderProvider,
        cartProvider: cart,
        width: 320,
        height: 568,
        textScale: 2.0,
        onExploreMenu: () {},
      );
      expect(tester.takeException(), isNull);

      // Wide screen (430px)
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: orderProvider,
        cartProvider: cart,
        width: 430,
        height: 932,
      );
      expect(tester.takeException(), isNull);

      // Large text scaling (200%)
      orderProvider.setTestOrders([sampleOrder]);
      await pumpOrdersApp(
        tester,
        userProvider: user,
        orderProvider: orderProvider,
        cartProvider: cart,
        width: 390,
        height: 844,
        textScale: 2.0,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    '10. MainScreen navigation selects Orders tab with light status bar',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_auth_token': 'test_token',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );
      final orderProvider = MockOrderProvider(
        orderRepository: OrderRepository(
          apiService: ApiService(),
          localStorageService: storage,
        ),
        initialOrders: [],
        sessionToken: 'test_token',
      );
      final shopProvider = ShopProvider(
        shopRepository: ShopRepository(apiService: ApiService()),
      );

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() async {
        await tester.binding.setSurfaceSize(null);
      });

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<UserProvider>.value(value: user),
            ChangeNotifierProvider<OrderProvider>.value(value: orderProvider),
            ChangeNotifierProvider<CartProvider>(
              create: (_) => CartProvider(localStorageService: storage),
            ),
            ChangeNotifierProvider<ShopProvider>.value(value: shopProvider),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const MainScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap Orders tab (nav-orders)
      final ordersTab = find.byKey(const Key('nav-orders'));
      expect(ordersTab, findsOneWidget);

      await tester.tap(ordersTab);
      await tester.pumpAndSettle();

      // OrderHistoryScreen is now active
      expect(find.byType(OrderHistoryScreen), findsOneWidget);
      expect(find.byType(OrdersHeader), findsOneWidget);
      expect(
        tester
            .widget<Semantics>(
              find
                  .ancestor(of: ordersTab, matching: find.byType(Semantics))
                  .first,
            )
            .properties
            .selected,
        isTrue,
      );

      final exploreButton = find.byKey(const Key('explore-menu-btn'));
      await tester.ensureVisible(exploreButton);
      await tester.tap(exploreButton);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<Semantics>(
              find
                  .ancestor(
                    of: find.byKey(const Key('nav-home')),
                    matching: find.byType(Semantics),
                  )
                  .first,
            )
            .properties
            .selected,
        isTrue,
      );

      await tester.tap(ordersTab);
      await tester.pumpAndSettle();

      // Verify AnnotatedRegion light overlay
      final annotatedRegion = tester
          .widget<AnnotatedRegion<SystemUiOverlayStyle>>(
            find.byType(AnnotatedRegion<SystemUiOverlayStyle>),
          );
      expect(
        annotatedRegion.value.statusBarIconBrightness,
        Brightness.light,
      ); // light icons on cobalt header
    },
  );
}
