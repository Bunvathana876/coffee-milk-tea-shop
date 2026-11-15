import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/user_provider.dart';
import 'package:mobile_app/ui/features/auth/screens/auth_screen.dart';

class SignupUser extends UserProvider {
  SignupUser(LocalStorageService storage)
    : super(localStorageService: storage, apiService: ApiService());
  int calls = 0;
  bool loading = false;
  @override
  bool get isLoading => loading;

  void setLoading(bool value) {
    loading = value;
    notifyListeners();
  }

  @override
  Future<bool> register({
    required String fullName,
    required String phone,
    String? email,
    required String password,
  }) async {
    calls++;
    expect(fullName, 'Sokha Chan');
    expect(phone, '012345678');
    expect(email, 'sokha@example.com');
    return false;
  }
}

void main() {
  Future<SignupUser> show(
    WidgetTester tester, {
    bool register = true,
    double width = 390,
    double textScale = 1,
  }) async {
    SharedPreferences.setMockInitialValues({});
    final user = SignupUser(await LocalStorageService.init());
    await tester.binding.setSurfaceSize(Size(width, 700));
    await tester.pumpWidget(
      ChangeNotifierProvider<UserProvider>.value(
        value: user,
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(textScale)),
            child: child!,
          ),
          home: AuthScreen(initialIsRegister: register),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return user;
  }

  testWidgets(
    'sign up validates, toggles visibility, and keeps the required API phone',
    (tester) async {
      final user = await show(tester);
      expect(find.text('Sign Up'), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(5));
      await tester.ensureVisible(find.text('Sign Up'));
      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();
      expect(find.textContaining('at least 2 characters'), findsOneWidget);
      expect(user.calls, 0);
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'Sokha Chan');
      await tester.enterText(fields.at(1), 'sokha@example.com');
      await tester.enterText(fields.at(2), '012345678');
      await tester.enterText(fields.at(3), 'password123');
      await tester.enterText(fields.at(4), 'wrong');
      await tester.ensureVisible(find.byTooltip('Show password'));
      await tester.tap(find.byTooltip('Show password'));
      await tester.pump();
      expect(find.byTooltip('Hide password'), findsOneWidget);
      await tester.ensureVisible(find.text('Sign Up'));
      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();
      expect(find.text('Passwords do not match'), findsOneWidget);
      await tester.enterText(fields.at(4), 'password123');
      await tester.ensureVisible(find.text('Sign Up'));
      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();
      expect(user.calls, 1);
    },
  );

  testWidgets('small sign up scrolls and returns to login', (tester) async {
    await show(tester, width: 320);
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Already have an account? Log In'));
    await tester.tap(find.text('Already have an account? Log In'));
    await tester.pumpAndSettle();
    expect(find.text('Log In'), findsOneWidget);
  });

  testWidgets('sign up stays scrollable with keyboard and larger text', (
    tester,
  ) async {
    tester.view.viewInsets = const FakeViewPadding(bottom: 300);
    addTearDown(tester.view.resetViewInsets);
    await show(tester, width: 320, textScale: 1.5);
    await tester.ensureVisible(find.text('Already have an account? Log In'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Sign Up'), findsOneWidget);
  });

  testWidgets('sign up disables submission while registration is loading', (
    tester,
  ) async {
    final user = await show(tester);
    user.setLoading(true);
    await tester.pump();
    final button = tester.widget<ElevatedButton>(
      find.byType(ElevatedButton).first,
    );
    expect(button.onPressed, isNull);
  });

  for (final width in [360.0, 390.0, 430.0]) {
    testWidgets('sign up layout at ${width.toInt()}dp', (tester) async {
      await show(tester, width: width);
      await tester.ensureVisible(find.text('Sign Up'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Sign Up'), findsOneWidget);
    });
  }

  testWidgets('forgot password is honest and navigates back', (tester) async {
    await show(tester, register: false);
    await tester.tap(find.text('Forgot Password?'));
    await tester.pumpAndSettle();
    expect(find.text('Send Reset Link'), findsOneWidget);
    expect(find.textContaining('No email will be sent'), findsOneWidget);
    final button = tester.widget<ElevatedButton>(
      find.widgetWithText(ElevatedButton, 'Send Reset Link'),
    );
    expect(button.onPressed, isNull);
    await tester.ensureVisible(find.text('Back to Log In'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Back to Log In'));
    await tester.pumpAndSettle();
    expect(find.text('Log In'), findsOneWidget);
  });
}
