import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/providers/user_provider.dart';
import 'package:mobile_app/ui/features/auth/screens/auth_screen.dart';

class TestUser extends UserProvider {
  TestUser(LocalStorageService storage)
    : super(localStorageService: storage, apiService: ApiService());
  int calls = 0;
  @override
  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    calls++;
    return true;
  }
}

void main() {
  testWidgets(
    'login validates, toggles visibility, and returns after submission',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final user = TestUser(await LocalStorageService.init());
      await tester.pumpWidget(
        ChangeNotifierProvider<UserProvider>.value(
          value: user,
          child: MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(builder: (_) => const AuthScreen()),
                  ),
                  child: const Text('Open login'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open login'));
      await tester.pumpAndSettle();
      expect(find.byType(Image), findsNWidgets(2));
      await tester.ensureVisible(find.text('Log In'));
      await tester.tap(find.text('Log In'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your password'), findsOneWidget);
      expect(user.calls, 0);
      await tester.enterText(
        find.byType(TextFormField).first,
        'customer@example.com',
      );
      await tester.enterText(find.byType(TextFormField).last, 'test-password');
      await tester.ensureVisible(find.byTooltip('Show password'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Show password'));
      await tester.pump();
      expect(find.byTooltip('Hide password'), findsOneWidget);
      await tester.ensureVisible(find.text('Log In'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Log In'));
      await tester.pumpAndSettle();
      expect(user.calls, 1);
      expect(find.text('Open login'), findsOneWidget);
    },
  );
}
