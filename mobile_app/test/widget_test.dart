import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/widgets/status_badge.dart';
import 'package:mobile_app/core/widgets/empty_state.dart';
import 'package:mobile_app/ui/features/menu/widgets/category_chip.dart';
import 'package:mobile_app/ui/features/menu/widgets/product_card.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/shop_repository.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/providers/shop_provider.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/ui/features/menu/widgets/product_detail_sheet.dart';
import 'package:mobile_app/data/models/cart_item_model.dart';

void main() {
  testWidgets(
    'StatusBadge renders pending, preparing, and ready states correctly',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                StatusBadge(status: 'pending'),
                StatusBadge(status: 'preparing'),
                StatusBadge(status: 'ready'),
                StatusBadge(status: 'completed'),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Received'), findsOneWidget);
      expect(find.text('Preparing'), findsOneWidget);
      expect(find.text('Ready for Pickup'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
    },
  );

  testWidgets('CategoryChip displays count and triggers onTap', (
    WidgetTester tester,
  ) async {
    bool tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CategoryChip(
            label: 'Milk Tea',
            count: 4,
            isSelected: true,
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Milk Tea'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);

    await tester.tap(find.byType(CategoryChip));
    expect(tapped, isTrue);
  });

  testWidgets('EmptyState displays title, description and button', (
    WidgetTester tester,
  ) async {
    bool actionClicked = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EmptyState(
            icon: Icons.coffee,
            title: 'No drinks found',
            description: 'Try searching again',
            actionLabel: 'Browse All',
            onAction: () => actionClicked = true,
          ),
        ),
      ),
    );

    expect(find.text('No drinks found'), findsOneWidget);
    expect(find.text('Try searching again'), findsOneWidget);
    expect(find.text('Browse All'), findsOneWidget);

    await tester.tap(find.text('Browse All'));
    expect(actionClicked, isTrue);
  });

  testWidgets('drink cards fit representative phone and tablet widths', (
    WidgetTester tester,
  ) async {
    const product = ProductModel(
      id: 1,
      name: 'Brown Sugar Milk Tea',
      categoryId: 1,
      categoryName: 'Milk Tea',
      basePriceUsd: 3.5,
    );
    final shop = ShopProvider(
      shopRepository: ShopRepository(apiService: ApiService()),
    );
    addTearDown(shop.dispose);

    for (final width in [320.0, 360.0, 390.0, 430.0, 600.0]) {
      await tester.binding.setSurfaceSize(Size(width, 720));
      final columns = width < 350
          ? 1
          : width < 600
          ? 2
          : 3;
      await tester.pumpWidget(
        ChangeNotifierProvider.value(
          value: shop,
          child: MaterialApp(
            home: Scaffold(
              body: Center(
                child: SizedBox(
                  width: (width - 40 - 14 * (columns - 1)) / columns,
                  height: width < 350 ? 310 : 318,
                  child: ProductCard(product: product, onTap: () {}),
                ),
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull, reason: 'width $width');
      expect(find.text('Brown Sugar Milk Tea'), findsOneWidget);
    }
    await tester.binding.setSurfaceSize(null);
  });

  testWidgets('drink card stays readable with larger system text', (
    WidgetTester tester,
  ) async {
    const product = ProductModel(
      id: 2,
      name: 'Brown Sugar Milk Tea',
      categoryId: 1,
      categoryName: 'Milk Tea',
      basePriceUsd: 3.5,
    );
    final shop = ShopProvider(
      shopRepository: ShopRepository(apiService: ApiService()),
    );
    addTearDown(shop.dispose);
    await tester.binding.setSurfaceSize(const Size(360, 720));
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: shop,
        child: MaterialApp(
          home: Scaffold(
            body: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(1.3)),
              child: Center(
                child: SizedBox(
                  width: 153,
                  height: 372,
                  child: ProductCard(product: product, onTap: () {}),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
    await tester.binding.setSurfaceSize(null);
  });
  testWidgets('customization keeps selected size when adding to the bag', (
    tester,
  ) async {
    final shop = ShopProvider(
      shopRepository: ShopRepository(apiService: ApiService()),
    );
    addTearDown(shop.dispose);
    CartItemModel? added;
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: shop,
        child: MaterialApp(
          home: Scaffold(
            body: ProductDetailSheet(
              product: const ProductModel(
                id: 1,
                name: 'Test drink',
                categoryId: 1,
                basePriceUsd: 3,
              ),
              onAddToCart: (item) => added = item,
            ),
          ),
        ),
      ),
    );
    await tester.ensureVisible(find.text('Large'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Large'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add to Cart'));
    expect(added?.size, 'Large');
    expect(added?.product.id, 1);
  });
}
