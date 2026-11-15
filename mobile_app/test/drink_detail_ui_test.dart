import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/cart_provider.dart';
import 'package:mobile_app/providers/shop_provider.dart';
import 'package:mobile_app/ui/features/menu/widgets/product_detail_sheet.dart';
import 'package:mobile_app/ui/features/menu/widgets/drink_hero_artwork.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const drink = ProductModel(
  id: 11,
  name: 'Brown Sugar Milk Tea',
  categoryId: 2,
  categoryName: 'Milk Tea',
  description: 'Black tea with brown sugar',
  basePriceUsd: 3,
);

Future<CartProvider> pumpDetail(
  WidgetTester tester, {
  ProductModel product = drink,
  double width = 390,
  double height = 780,
  double textScale = 1,
  double bottomInset = 0,
  bool asRoute = false,
}) async {
  SharedPreferences.setMockInitialValues({});
  final storage = await LocalStorageService.init();
  final cart = CartProvider(localStorageService: storage);
  final shop = ShopProvider(
    shopRepository: ShopRepository(apiService: ApiService()),
  );
  addTearDown(() async {
    cart.dispose();
    shop.dispose();
    await tester.binding.setSurfaceSize(null);
  });
  await tester.binding.setSurfaceSize(Size(width, height));
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: shop),
        ChangeNotifierProvider.value(value: cart),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            padding: EdgeInsets.only(bottom: bottomInset),
          ),
          child: child!,
        ),
        home: asRoute
            ? Scaffold(
                body: Builder(
                  builder: (context) => TextButton(
                    onPressed: () => ProductDetailSheet.show(
                      context,
                      product: product,
                      onAddToCart: cart.addItem,
                    ),
                    child: const Text('Open drink'),
                  ),
                ),
              )
            : ProductDetailSheet(product: product, onAddToCart: cart.addItem),
      ),
    ),
  );
  if (asRoute) {
    await tester.tap(find.text('Open drink'));
    await tester.pumpAndSettle();
  }
  return cart;
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'opaque product photo fills the navy hero without a cream frame',
    (tester) async {
      final bytes = await rootBundle.load(
        'assets/drink_details/navy_cafe_pattern.png',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 390,
              height: 340,
              child: DrinkHeroArtwork(
                imageUrl: null,
                imageProvider: MemoryImage(bytes.buffer.asUint8List()),
                productName: drink.name,
                size: 300,
                heroHeight: 340,
                imageTop: 50,
              ),
            ),
          ),
        ),
      );
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 150)),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drink-hero-photo')), findsOneWidget);
      expect(find.byKey(const Key('drink-hero-cutout')), findsNothing);
      final heroPhoto = tester.widgetList<Image>(find.byType(Image)).single;
      expect(heroPhoto.fit, BoxFit.cover);
      expect(
        tester.getSize(find.byKey(const Key('drink-hero-photo'))).height,
        340,
      );
      expect(tester.takeException(), isNull);
    },
  );

  test('only a genuine transparent edge qualifies as a cutout', () {
    final pixels = ByteData(5 * 5 * 4);
    for (var i = 0; i < 25; i++) {
      pixels.setUint8(i * 4 + 3, 255);
    }
    expect(hasTransparentCutoutEdges(pixels, 5, 5), isFalse);

    for (final point in [(0, 0), (4, 0), (0, 4), (4, 4)]) {
      pixels.setUint8((point.$2 * 5 + point.$1) * 4 + 3, 0);
    }
    expect(hasTransparentCutoutEdges(pixels, 5, 5), isFalse);

    for (final point in [(2, 0), (2, 4), (0, 2), (4, 2)]) {
      pixels.setUint8((point.$2 * 5 + point.$1) * 4 + 3, 0);
    }
    expect(hasTransparentCutoutEdges(pixels, 5, 5), isTrue);
  });

  testWidgets('detail uses real cup assets and fallback without fake options', (
    tester,
  ) async {
    await pumpDetail(tester);
    expect(
      find.byKey(const Key('drink-detail-image-fallback')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('drink-detail-image-card')), findsNothing);
    expect(find.byType(DrinkHeroArtwork), findsOneWidget);
    final pattern = await rootBundle.load(
      'assets/drink_details/navy_cafe_pattern.png',
    );
    expect(pattern.lengthInBytes, greaterThan(0));
    expect(find.text('Brown Sugar Milk Tea'), findsOneWidget);
    expect(find.text('Size options'), findsOneWidget);
    expect(find.text('Ice level'), findsOneWidget);
    expect(find.text('Sweetness level'), findsOneWidget);
    expect(find.text('Milk'), findsNothing);
    expect(find.text('Temperature'), findsNothing);
    expect(find.textContaining('Save preferences'), findsNothing);
    for (final size in ['Small', 'Medium', 'Large']) {
      final image = tester.widget<Image>(find.byKey(Key('size-icon-$size')));
      expect(image.fit, BoxFit.contain);
      expect(
        (image.image as AssetImage).assetName,
        'assets/drink_detail/size_icons/cup_${size.toLowerCase()}.png',
      );
      final bytes = await rootBundle.load(
        'assets/drink_detail/size_icons/cup_${size.toLowerCase()}.png',
      );
      expect(bytes.lengthInBytes, greaterThan(0));
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('selected options drive real total and one cart entry', (
    tester,
  ) async {
    final cart = await pumpDetail(tester);
    expect(
      tester.widget<Text>(find.byKey(const Key('drink-detail-total-usd'))).data,
      '\$3.30',
    );
    await tapVisible(tester, find.byKey(const Key('size-Large')));
    await tapVisible(tester, find.byKey(const Key('ice-Less Ice')));
    await tapVisible(tester, find.byKey(const Key('sugar-25%')));
    await tapVisible(
      tester,
      find.byKey(const Key('topping-Brown Sugar Pearls')),
    );
    await tapVisible(tester, find.byTooltip('Increase quantity'));
    expect(
      tester.widget<Text>(find.byKey(const Key('drink-detail-total-usd'))).data,
      '\$8.20',
    );
    expect(
      tester.widget<Text>(find.byKey(const Key('drink-detail-total-khr'))).data,
      '33,620 ៛',
    );
    await tester.tap(find.byKey(const Key('drink-detail-add')));
    await tester.pump();
    expect(cart.items, hasLength(1));
    final item = cart.items.single;
    expect(item.size, 'Large');
    expect(item.iceLevel, 'Less Ice');
    expect(item.sugarLevel, '25%');
    expect(item.toppings, ['Brown Sugar Pearls']);
    expect(item.quantity, 2);
    expect(item.subtotalUsd, 8.2);
    expect(
      tester
          .widget<ElevatedButton>(find.byKey(const Key('drink-detail-add')))
          .onPressed,
      isNull,
    );
  });

  testWidgets('unavailable drink cannot be added', (tester) async {
    final cart = await pumpDetail(
      tester,
      product: drink.copyWith(isAvailable: false),
    );
    expect(find.text('Currently unavailable'), findsOneWidget);
    expect(find.text('Unavailable'), findsOneWidget);
    expect(
      tester
          .widget<ElevatedButton>(find.byKey(const Key('drink-detail-add')))
          .onPressed,
      isNull,
    );
    expect(cart.items, isEmpty);
  });

  testWidgets('settings scroll while the footer remains visible', (
    tester,
  ) async {
    for (final width in [320.0, 360.0, 390.0, 430.0]) {
      await pumpDetail(
        tester,
        width: width,
        height: 560,
        textScale: width == 320 ? 1.3 : 1,
      );
      await tester.ensureVisible(find.byKey(const Key('topping-Pudding')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('drink-detail-last-option')),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: 'width $width');
      expect(find.byKey(const Key('drink-detail-add')), findsOneWidget);
      final lastOptionBottom = tester
          .getBottomLeft(find.byKey(const Key('drink-detail-last-option')))
          .dy;
      final footerTop = tester
          .getTopLeft(find.byKey(const Key('drink-detail-footer')))
          .dy;
      expect(
        lastOptionBottom,
        lessThan(footerTop - 12),
        reason: 'width $width',
      );
      expect(
        tester.getBottomLeft(find.byKey(const Key('drink-detail-add'))).dy,
        lessThanOrEqualTo(560),
      );
    }
  });

  testWidgets('detail has one cream panel and footer covers the home inset', (
    tester,
  ) async {
    await pumpDetail(tester, bottomInset: 34);
    final content = tester.widget<Material>(
      find.byKey(const Key('drink-detail-content')),
    );
    expect(content.borderRadius, isNull);
    expect(
      tester.getBottomLeft(find.byKey(const Key('drink-detail-footer'))).dy,
      780,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Menu back returns to existing route', (tester) async {
    final cart = await pumpDetail(tester, asRoute: true);
    expect(find.byType(ProductDetailSheet), findsOneWidget);
    await tester.tap(find.byKey(const Key('drink-detail-back')));
    await tester.pumpAndSettle();
    expect(find.byType(ProductDetailSheet), findsNothing);
    expect(find.text('Open drink'), findsOneWidget);
    expect(cart.items, isEmpty);
  });

  testWidgets('long names and high prices stay usable on a small phone', (
    tester,
  ) async {
    await pumpDetail(
      tester,
      width: 320,
      height: 560,
      textScale: 1.3,
      product: drink.copyWith(
        name: 'Extra Long Brown Sugar Milk Tea With Coconut Jelly',
        basePriceUsd: 999999.99,
      ),
    );
    expect(tester.takeException(), isNull);
    expect(find.byKey(const Key('drink-detail-total-usd')), findsOneWidget);
    expect(find.byKey(const Key('drink-detail-add')), findsOneWidget);
  });
}
