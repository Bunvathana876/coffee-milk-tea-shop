import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/widgets/status_badge.dart';
import 'package:mobile_app/core/widgets/empty_state.dart';
import 'package:mobile_app/ui/features/menu/widgets/category_chip.dart';

void main() {
  testWidgets('StatusBadge renders pending, preparing, and ready states correctly', (WidgetTester tester) async {
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
  });

  testWidgets('CategoryChip displays count and triggers onTap', (WidgetTester tester) async {
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

  testWidgets('EmptyState displays title, description and button', (WidgetTester tester) async {
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
}
