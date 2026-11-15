import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/cart_provider.dart';
import 'package:mobile_app/providers/order_provider.dart';
import 'package:mobile_app/providers/shop_provider.dart';
import 'package:mobile_app/providers/user_provider.dart';
import 'package:mobile_app/ui/features/menu/screens/menu_screen.dart';
import 'package:mobile_app/ui/features/menu/widgets/brand_banner_carousel.dart';
import 'package:mobile_app/ui/features/menu/widgets/brand_category_icon.dart';
import 'package:mobile_app/ui/features/menu/widgets/product_card.dart';
import 'package:mobile_app/ui/navigation/main_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TestApi extends ApiService {
  @override
  Future<bool> checkHealth() async => false;
}

class TestShopRepository extends ShopRepository {
  TestShopRepository({required super.apiService});
  @override
  Future<List<CategoryModel>> getCategories() async => const [
    CategoryModel(id: 1, name: 'Coffee'),
    CategoryModel(id: 2, name: 'Milk Tea'),
    CategoryModel(id: 3, name: 'Fruit Tea'),
    CategoryModel(id: 4, name: 'Smoothies'),
    CategoryModel(id: 5, name: 'Matcha'),
  ];
  @override
  Future<List<ProductModel>> getProducts({
    int? categoryId,
    String? search,
  }) async => const [
    ProductModel(
      id: 1,
      name: 'Iced Latte',
      categoryId: 1,
      description: 'Espresso and milk',
      basePriceUsd: 2.50,
    ),
    ProductModel(
      id: 2,
      name: 'Classic Milk Tea',
      categoryId: 2,
      description: 'Black tea and boba',
      basePriceUsd: 2.75,
    ),
  ];
}

Future<
  ({
    ShopProvider shop,
    CartProvider cart,
    UserProvider user,
    OrderProvider orders,
  })
>
providers() async {
  SharedPreferences.setMockInitialValues({'customer_name': 'Sam'});
  final storage = await LocalStorageService.init();
  final api = TestApi();
  final shop = ShopProvider(
    shopRepository: TestShopRepository(apiService: api),
  );
  await shop.initialize();
  return (
    shop: shop,
    cart: CartProvider(localStorageService: storage),
    user: UserProvider(localStorageService: storage, apiService: api),
    orders: OrderProvider(
      orderRepository: OrderRepository(
        apiService: api,
        localStorageService: storage,
      ),
    ),
  );
}

Future<void> pumpHome(
  WidgetTester tester,
  double width, {
  bool mainScreen = false,
  double textScale = 1,
  bool reduceMotion = false,
}) async {
  await tester.binding.setSurfaceSize(Size(width, 800));
  final state = await providers();
  addTearDown(() async {
    state.shop.dispose();
    state.cart.dispose();
    state.user.dispose();
    state.orders.dispose();
    await tester.binding.setSurfaceSize(null);
  });
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: state.shop),
        ChangeNotifierProvider.value(value: state.cart),
        ChangeNotifierProvider.value(value: state.user),
        ChangeNotifierProvider.value(value: state.orders),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: reduceMotion,
          ),
          child: child!,
        ),
        home: mainScreen ? const MainScreen() : const MenuScreen(),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('Home omits greeting and offline preview but keeps search', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    expect(find.textContaining('Hello,'), findsNothing);
    expect(find.text('Good to see you!'), findsNothing);
    expect(find.textContaining('Offline preview:'), findsNothing);
    expect(find.byKey(const Key('home-search')), findsOneWidget);
  });

  testWidgets('banner dots and swipes show complete artwork without overlays', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    final shop = tester.element(find.byType(MenuScreen)).read<ShopProvider>();
    expect(find.byType(BrandBannerCarousel), findsOneWidget);
    expect(find.text('Fresh Brew, Happy You!'), findsNothing);
    expect(find.byKey(const Key('banner-action-0')), findsNothing);
    final first = tester.widget<Image>(
      find.byKey(const Key('home-banner-image-0')),
    );
    expect(first.image, isA<AssetImage>());
    expect(
      (first.image as AssetImage).assetName,
      'assets/home_refresh/banners/banner_01.png',
    );
    expect(first.fit, BoxFit.contain);
    await tester.tap(find.byKey(const Key('banner-dot-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('home-banner-image-1')), findsOneWidget);
    final second = tester.widget<Image>(
      find.byKey(const Key('home-banner-image-1')),
    );
    expect(
      (second.image as AssetImage).assetName,
      'assets/home_refresh/banners/banner_02.png',
    );
    expect(find.byKey(const Key('banner-active-dot-1')), findsOneWidget);
    await tester.drag(
      find.byKey(const Key('home-banner-pages')),
      const Offset(-340, 0),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('home-banner-image-2')), findsOneWidget);
    final third = tester.widget<Image>(
      find.byKey(const Key('home-banner-image-2')),
    );
    expect(
      (third.image as AssetImage).assetName,
      'assets/home_refresh/banners/banner_03.png',
    );
    expect(find.byKey(const Key('banner-active-dot-2')), findsOneWidget);
    await tester.tap(find.byKey(const Key('banner-dot-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('home-banner-image-1')));
    await tester.pumpAndSettle();
    expect(shop.selectedCategoryId, 1);
    expect(shop.filteredProducts.length, 1);
  });

  testWidgets('carousel advances every five seconds and wraps to first', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    expect(find.byKey(const Key('banner-active-dot-0')), findsOneWidget);
    for (final index in [1, 2, 0]) {
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.byKey(Key('banner-active-dot-$index')), findsOneWidget);
    }
  });

  testWidgets('manual swipe delays auto advance for eight seconds', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    await tester.drag(
      find.byKey(const Key('home-banner-pages')),
      const Offset(-340, 0),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('banner-active-dot-1')), findsOneWidget);
    await tester.pump(const Duration(seconds: 7));
    expect(find.byKey(const Key('banner-active-dot-1')), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('banner-active-dot-2')), findsOneWidget);
  });

  testWidgets('carousel pauses in background and disposes its timer', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump(const Duration(seconds: 7));
    expect(find.byKey(const Key('banner-active-dot-0')), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('banner-active-dot-1')), findsOneWidget);
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tester.pump(const Duration(seconds: 12));
    expect(tester.takeException(), isNull);
  });

  testWidgets('reduced motion keeps manual carousel controls', (tester) async {
    await pumpHome(tester, 390, reduceMotion: true);
    await tester.pump(const Duration(seconds: 7));
    expect(find.byKey(const Key('banner-active-dot-0')), findsOneWidget);
    await tester.tap(find.byKey(const Key('banner-dot-2')));
    await tester.pump();
    expect(find.byKey(const Key('banner-active-dot-2')), findsOneWidget);
  });

  testWidgets('category names select their distinct uploaded assets', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    const expected = {
      'All Drinks': 'all_drinks.png',
      'Coffee': 'coffee.png',
      'Milk Tea': 'milk_tea.png',
      'Fruit Tea': 'fruit_tea.png',
      'Smoothies': 'smoothies.png',
      'Matcha': 'matcha.png',
    };
    for (final entry in expected.entries) {
      expect(BrandCategoryIcon.assetFor(entry.key), entry.value);
    }
    expect(BrandCategoryIcon.assetFor('Unknown'), isNull);
    final allDrinksImage = tester.widget<Image>(
      find.descendant(
        of: find.byKey(const Key('category-all')),
        matching: find.byType(Image),
      ),
    );
    expect(
      (allDrinksImage.image as AssetImage).assetName,
      'assets/home_refresh/categories/all_drinks.png',
    );
    expect(allDrinksImage.fit, BoxFit.contain);
    final asset = await rootBundle.load(
      'assets/home_refresh/categories/all_drinks.png',
    );
    expect(asset.lengthInBytes, greaterThan(0));
    final icons = tester
        .widgetList<BrandCategoryIcon>(find.byType(BrandCategoryIcon))
        .toList();
    expect(
      icons.map((icon) => icon.categoryName),
      containsAll(['Coffee', 'Milk Tea', 'Fruit Tea']),
    );
    await tester.drag(find.byType(ListView), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is BrandCategoryIcon && widget.categoryName == 'Matcha',
      ),
      findsOneWidget,
    );
  });

  testWidgets('search and category use real catalog filters', (tester) async {
    await pumpHome(tester, 390);
    final shop = tester.element(find.byType(MenuScreen)).read<ShopProvider>();
    await tester.enterText(find.byKey(const Key('home-search')), 'boba');
    await tester.pump();
    expect(shop.filteredProducts.single.name, 'Classic Milk Tea');
    await tester.tap(find.byKey(const Key('category-1')));
    await tester.pumpAndSettle();
    expect(shop.searchQuery, isEmpty);
    expect(shop.selectedCategoryId, 1);
    expect(shop.filteredProducts.single.name, 'Iced Latte');
    expect(find.text('Coffee Drinks'), findsOneWidget);
    expect(find.byKey(const Key('selected-coffee')), findsOneWidget);
    expect(
      tester
          .widgetList<ProductCard>(find.byType(ProductCard))
          .map((card) => card.product.name),
      ['Iced Latte'],
    );
    await tester.tap(find.byKey(const Key('category-all')));
    await tester.pumpAndSettle();
    expect(shop.selectedCategoryId, 0);
    expect(shop.filteredProducts.length, 2);
    expect(find.byKey(const Key('selected-all-drinks')), findsOneWidget);
    expect(find.text('Featured Drinks'), findsOneWidget);
  });

  testWidgets('empty backend category shows resettable empty state', (
    tester,
  ) async {
    await pumpHome(tester, 390);
    final shop = tester.element(find.byType(MenuScreen)).read<ShopProvider>();
    await tester.tap(find.byKey(const Key('category-3')));
    await tester.pumpAndSettle();
    expect(shop.selectedCategoryId, 3);
    expect(shop.filteredProducts, isEmpty);
    expect(find.text('Fruit Tea Drinks'), findsOneWidget);
    expect(find.text('No Fruit Tea drinks yet'), findsOneWidget);
    await tester.tap(find.text('All Drinks').last);
    await tester.pumpAndSettle();
    expect(shop.selectedCategoryId, 0);
  });

  testWidgets('carousel stays paused while another tab is active', (
    tester,
  ) async {
    await pumpHome(tester, 390, mainScreen: true);
    await tester.tap(find.byKey(const Key('nav-orders')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 12));
    await tester.tap(find.byKey(const Key('nav-home')));
    await tester.pump();
    expect(find.byKey(const Key('banner-active-dot-0')), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('banner-active-dot-1')), findsOneWidget);
  });

  testWidgets('product plus opens customization', (tester) async {
    await pumpHome(tester, 390);
    await tester.ensureVisible(find.byTooltip('Customize Iced Latte'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Customize Iced Latte'));
    await tester.pumpAndSettle();
    expect(find.text('Add to Cart'), findsOneWidget);
  });

  testWidgets('navigation keeps four working tabs', (tester) async {
    await pumpHome(tester, 600, mainScreen: true);
    expect(find.byKey(const Key('nav-home')), findsOneWidget);
    await tester.tap(find.byKey(const Key('nav-profile')));
    await tester.pump();
    expect(find.byKey(const Key('nav-profile')), findsOneWidget);
    await tester.tap(find.byKey(const Key('nav-orders')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('nav-bag')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('nav-home')));
    await tester.pump();
    expect(find.byType(MenuScreen), findsOneWidget);
  });

  testWidgets('last featured card can scroll clear of navigation', (
    tester,
  ) async {
    await pumpHome(tester, 390, mainScreen: true);
    final card = find.byWidgetPredicate(
      (widget) => widget is ProductCard && widget.product.id == 2,
    );
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -450));
    await tester.pumpAndSettle();
    await tester.ensureVisible(card);
    await tester.pumpAndSettle();
    final navTop = tester.getTopLeft(find.byKey(const Key('nav-home'))).dy;
    expect(tester.getBottomLeft(card).dy, lessThan(navTop));
  });

  testWidgets('home fits phone widths and larger text', (tester) async {
    for (final width in [320.0, 360.0, 390.0, 430.0]) {
      await pumpHome(tester, width);
      expect(tester.takeException(), isNull, reason: 'width $width');
      expect(find.byKey(const Key('home-banner-carousel')), findsOneWidget);
    }
    await pumpHome(tester, 320, textScale: 1.3);
    expect(tester.takeException(), isNull);
  });
}
