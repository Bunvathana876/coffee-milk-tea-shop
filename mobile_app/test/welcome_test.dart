import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/ui/features/welcome/welcome_screen.dart';

void main() {
  testWidgets('welcome assets, login action and menu navigation', (
    tester,
  ) async {
    var loginTapped = false;
    for (final width in [320.0, 360.0, 390.0, 430.0]) {
      await tester.binding.setSurfaceSize(Size(width, 640));
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => WelcomeScreen(
              onLogin: () => loginTapped = true,
              onMenu: () => Navigator.pushReplacement(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const Scaffold(body: Text('Ordering menu')),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(Image), findsNWidgets(2));
      expect(find.text('Bookings'), findsNothing);
      await tester.ensureVisible(find.text('Log In'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Log In'));
      expect(loginTapped, isTrue);
      await tester.ensureVisible(find.text('Menu'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Menu'));
      await tester.pumpAndSettle();
      expect(find.text('Ordering menu'), findsOneWidget);
      expect(find.byType(WelcomeScreen), findsNothing);
      await tester.pumpWidget(const SizedBox());
    }
    await tester.binding.setSurfaceSize(null);
  });
}
