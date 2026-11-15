import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/core/theme/app_colors.dart';
import 'package:mobile_app/data/models/cart_item_model.dart';
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
import 'package:mobile_app/ui/features/cart/widgets/empty_cart_view.dart';
import 'package:mobile_app/ui/navigation/main_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _OfflineApi extends ApiService {
  @override
  Future<bool> checkHealth() async => false;
}

Future<CartProvider> _cart() async {
  SharedPreferences.setMockInitialValues({});
  final storage = await LocalStorageService.init();
  return CartProvider(localStorageService: storage);
}

void main() {
  testWidgets('empty order shows the registered illustration and action', (
    tester,
  ) async {
    final cart = await _cart();
    addTearDown(cart.dispose);
    var explored = false;

    for (final (width, height, scale) in [
      (320.0, 568.0, 1.3),
      (320.0, 640.0, 1.0),
      (390.0, 844.0, 1.0),
      (430.0, 932.0, 1.5),
    ]) {
      await tester.binding.setSurfaceSize(Size(width, height));
      await tester.pumpWidget(
        ChangeNotifierProvider.value(
          value: cart,
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(scale),
                disableAnimations: true,
              ),
              child: child!,
            ),
            home: CartScreen(onExploreMenu: () => explored = true),
          ),
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull, reason: '$width x $height');
      expect(find.byType(EmptyCartView), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(EmptyCartView),
          matching: find.byType(Scaffold),
        ),
        findsNothing,
      );
      expect(
        tester
            .widget<Container>(find.byKey(const Key('empty-cart-header')))
            .color,
        AppColors.primary,
      );
      expect(
        tester
            .widget<ColoredBox>(find.byKey(const Key('empty-cart-content')))
            .color,
        AppColors.background,
      );
      expect(find.text('Your Order'), findsOneWidget);
      expect(
        tester.widget<Text>(find.text('Your Order')).style!.color,
        Colors.white,
      );
      expect(find.text('Your bag is empty'), findsOneWidget);
      expect(
        find.text('Looks like you haven’t added any coffees or milk teas yet!'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<Text>(
              find.text(
                'Looks like you haven’t added any coffees or milk teas yet!',
              ),
            )
            .style!
            .color,
        AppColors.primary,
      );
      final button = tester.widget<ElevatedButton>(
        find.descendant(
          of: find.byType(EmptyCartView),
          matching: find.byType(ElevatedButton),
        ),
      );
      expect(
        button.style!.backgroundColor!.resolve(<WidgetState>{}),
        AppColors.primary,
      );
      expect(
        button.style!.foregroundColor!.resolve(<WidgetState>{}),
        Colors.white,
      );
      final image = tester.widget<Image>(
        find.byKey(const Key('empty-bag-illustration')),
      );
      expect(
        (image.image as AssetImage).assetName,
        'assets/images/empty_bag_illustration.png',
      );
      expect(image.fit, BoxFit.contain);
      expect(image.semanticLabel, isNotEmpty);
    }

    await tester.tap(find.text('Explore Menu'));
    expect(explored, isTrue);
    await tester.binding.setSurfaceSize(null);
  });

  testWidgets('populated order retains items and checkout controls', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 568));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final cart = await _cart();
    addTearDown(cart.dispose);
    final item = CartItemModel(
      product: const ProductModel(
        id: 42,
        name: 'Brown Sugar Boba',
        categoryId: 2,
        basePriceUsd: 3.25,
      ),
      size: 'Large',
      toppings: const ['Brown Sugar Pearls'],
      quantity: 2,
    );
    cart.addItem(item);

    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: cart,
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(1.3)),
            child: child!,
          ),
          home: const CartScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(EmptyCartView), findsNothing);
    expect(find.byType(CartItemTile), findsOneWidget);
    expect(find.text('Proceed to Checkout'), findsOneWidget);
    expect(cart.items.single.id, item.id);
    expect(cart.items.single.product.id, 42);
    expect(cart.items.single.size, 'Large');
    expect(cart.items.single.toppings, ['Brown Sugar Pearls']);
    expect(cart.items.single.quantity, 2);
    expect(cart.subtotalUsd, item.subtotalUsd);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Explore Menu changes the selected bottom tab', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    SharedPreferences.setMockInitialValues({});
    final storage = await LocalStorageService.init();
    final api = _OfflineApi();
    final cart = CartProvider(localStorageService: storage);
    final shop = ShopProvider(shopRepository: ShopRepository(apiService: api));
    final user = UserProvider(localStorageService: storage, apiService: api);
    final orders = OrderProvider(
      orderRepository: OrderRepository(
        apiService: api,
        localStorageService: storage,
      ),
    );
    addTearDown(() {
      cart.dispose();
      shop.dispose();
      user.dispose();
      orders.dispose();
    });

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: cart),
          ChangeNotifierProvider.value(value: shop),
          ChangeNotifierProvider.value(value: user),
          ChangeNotifierProvider.value(value: orders),
        ],
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              padding: const EdgeInsets.only(top: 59, bottom: 34),
              textScaler: const TextScaler.linear(1.3),
            ),
            child: child!,
          ),
          home: const MainScreen(),
        ),
      ),
    );
    await tester.pump();
    await tester.tap(find.byKey(const Key('nav-bag')));
    await tester.pump();
    expect(find.text('Your bag is empty'), findsOneWidget);
    expect(find.byType(EmptyCartFooterWave), findsOneWidget);
    expect(
      tester.getRect(find.byType(ElevatedButton).last).bottom,
      lessThan(tester.getRect(find.byType(EmptyCartFooterWave)).top),
    );
    expect(
      tester.getBottomLeft(find.byKey(const Key('nav-bag'))).dy,
      lessThan(810),
    );
    expect(tester.takeException(), isNull);
    expect(
      tester
          .widget<Semantics>(
            find
                .ancestor(
                  of: find.byKey(const Key('nav-bag')),
                  matching: find.byType(Semantics),
                )
                .first,
          )
          .properties
          .selected,
      isTrue,
    );

    await tester.tap(find.text('Explore Menu'));
    await tester.pump();
    expect(find.byKey(const Key('home-search')), findsOneWidget);
    expect(find.byType(EmptyCartFooterWave), findsNothing);
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
    expect(
      tester
          .widget<Semantics>(
            find
                .ancestor(
                  of: find.byKey(const Key('nav-bag')),
                  matching: find.byType(Semantics),
                )
                .first,
          )
          .properties
          .selected,
      isFalse,
    );
  });
}
