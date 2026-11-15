import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/core/config/app_config.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
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
import 'package:mobile_app/ui/features/profile/screens/profile_screen.dart';
import 'package:mobile_app/ui/features/profile/screens/settings_screen.dart';
import 'package:mobile_app/ui/navigation/main_screen.dart';

class MockUserProvider extends UserProvider {
  MockUserProvider({
    required super.localStorageService,
    required super.apiService,
  });

  bool saveProfileCalled = false;
  String? savedName;
  String? savedPhone;

  @override
  Future<void> saveProfile({
    required String name,
    required String phone,
    String? email,
  }) async {
    saveProfileCalled = true;
    savedName = name;
    savedPhone = phone;
    await super.saveProfile(name: name, phone: phone, email: email);
  }
}

Widget createProfileTestApp({
  required UserProvider userProvider,
  VoidCallback? onViewOrders,
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
    child: ChangeNotifierProvider<UserProvider>.value(
      value: userProvider,
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: ProfileScreen(onViewOrders: onViewOrders),
      ),
    ),
  );
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  testWidgets(
    '1. Guest profile renders header, welcome message, and auth actions',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      await tester.pumpWidget(createProfileTestApp(userProvider: user));
      await tester.pumpAndSettle();

      // Header & branding
      expect(find.text('Profile'), findsOneWidget);
      expect(find.bySemanticsLabel('Brew & Boba Café'), findsOneWidget);

      // Guest card
      expect(find.text('Welcome to Brew & Boba!'), findsOneWidget);
      expect(find.byKey(const Key('profile-sign-in-button')), findsOneWidget);
      expect(find.byKey(const Key('profile-register-button')), findsOneWidget);

      // Authenticated elements must NOT show
      expect(find.text('Member'), findsNothing);
      expect(find.byKey(const Key('profile-edit-button')), findsNothing);
      expect(find.byKey(const Key('profile-sign-out-button')), findsNothing);

      // Common cards exist
      expect(find.text('Your Orders'), findsOneWidget);
      expect(find.text('Café Punch Card'), findsOneWidget);
      expect(find.text('Store Information'), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
    },
  );

  testWidgets(
    '2. Authenticated profile renders real customer details, member badge, and sign out',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_name': 'Sophea Kim',
        'customer_phone': '+855 12 345 678',
        'customer_auth_token': 'local_token_mock',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      await tester.pumpWidget(createProfileTestApp(userProvider: user));
      await tester.pumpAndSettle();

      // Authenticated details
      expect(find.text('Sophea Kim'), findsOneWidget);
      expect(find.text('+855 12 345 678'), findsOneWidget);
      expect(find.text('Member'), findsOneWidget);
      expect(find.byKey(const Key('profile-edit-button')), findsOneWidget);
      expect(find.byKey(const Key('profile-sign-out-button')), findsOneWidget);

      // Guest buttons must NOT show
      expect(find.byKey(const Key('profile-sign-in-button')), findsNothing);
      expect(find.byKey(const Key('profile-register-button')), findsNothing);
    },
  );

  testWidgets(
    '3. Sign In and Register actions open AuthScreen with appropriate mode',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      await tester.pumpWidget(createProfileTestApp(userProvider: user));
      await tester.pumpAndSettle();

      // Tap Sign In
      await tester.tap(find.byKey(const Key('profile-sign-in-button')));
      await tester.pumpAndSettle();
      expect(find.byType(AuthScreen), findsOneWidget);
      expect(find.text('Log In'), findsWidgets);

      // Go back
      Navigator.of(tester.element(find.byType(AuthScreen))).pop();
      await tester.pumpAndSettle();

      // Tap Register
      await tester.tap(find.byKey(const Key('profile-register-button')));
      await tester.pumpAndSettle();
      expect(find.byType(AuthScreen), findsOneWidget);
      expect(find.text('Sign Up'), findsWidgets);
      expect(find.text('Confirm Password'), findsOneWidget);
    },
  );

  testWidgets('4. Edit Profile action toggles form and saves updated details', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'customer_name': 'Sophea Kim',
      'customer_phone': '+855 12 345 678',
      'customer_auth_token': 'local_token_mock',
    });
    final storage = await LocalStorageService.init();
    final user = MockUserProvider(
      localStorageService: storage,
      apiService: ApiService(),
    );

    await tester.pumpWidget(createProfileTestApp(userProvider: user));
    await tester.pumpAndSettle();

    // Edit form initially hidden
    expect(find.byKey(const Key('profile-edit-name-field')), findsNothing);

    // Tap edit button to open form
    await tester.tap(find.byKey(const Key('profile-edit-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('profile-edit-name-field')), findsOneWidget);
    expect(find.byKey(const Key('profile-edit-phone-field')), findsOneWidget);

    // Change name
    await tester.enterText(
      find.byKey(const Key('profile-edit-name-field')),
      'Chanthou Seng',
    );
    await tester.tap(find.byKey(const Key('profile-save-button')));
    await tester.pumpAndSettle();

    expect(user.saveProfileCalled, isTrue);
    expect(user.savedName, 'Chanthou Seng');
    expect(find.text('Profile saved successfully!'), findsOneWidget);
  });

  testWidgets(
    '5. Your Orders card triggers onViewOrders callback or navigates',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      bool ordersCallbackInvoked = false;
      await tester.pumpWidget(
        createProfileTestApp(
          userProvider: user,
          onViewOrders: () => ordersCallbackInvoked = true,
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('profile-orders-card')));
      await tester.pumpAndSettle();

      expect(ordersCallbackInvoked, isTrue);
    },
  );

  testWidgets(
    '6. Settings card navigates to SettingsScreen with connection test',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      await tester.pumpWidget(createProfileTestApp(userProvider: user));
      await tester.pumpAndSettle();

      await tester.ensureVisible(
        find.byKey(const Key('profile-settings-card')),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('profile-settings-card')));
      await tester.pumpAndSettle();

      // In SettingsScreen
      expect(find.byType(SettingsScreen), findsOneWidget);
      expect(find.text('Café API Server'), findsOneWidget);
      expect(
        find.byKey(const Key('settings-test-connection-button')),
        findsOneWidget,
      );

      // Pop back to Profile
      await tester.tap(find.byKey(const Key('settings-back-button')));
      await tester.pumpAndSettle();
      expect(find.byType(ProfileScreen), findsOneWidget);
    },
  );

  testWidgets(
    '7. Loyalty punch card displays real progress and 10 stamp positions',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_name': 'Sophea Kim',
        'customer_phone': '012345678',
        'server_account_phone': '012345678',
        'customer_auth_token': 'server_token_123',
        'confirmed_loyalty_stamps_012345678': 7,
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      await tester.pumpWidget(createProfileTestApp(userProvider: user));
      await tester.pumpAndSettle();

      expect(find.text('7 / 10'), findsOneWidget);
      expect(find.text('Café Punch Card'), findsOneWidget);
      // 7 completed stamps have check icons
      expect(find.byIcon(Icons.check_rounded), findsNWidgets(7));
    },
  );

  testWidgets(
    '8. Store Information card displays storefront image and verified details',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      await tester.pumpWidget(createProfileTestApp(userProvider: user));
      await tester.pumpAndSettle();

      expect(find.text('Store Information'), findsOneWidget);
      expect(find.text(AppConfig.storeAddress), findsOneWidget);
      expect(find.text(AppConfig.storePhone), findsOneWidget);
      expect(find.text(AppConfig.storeHours), findsOneWidget);
    },
  );

  testWidgets(
    '9. Responsive layout fits narrow and large devices without overflow',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'customer_name': 'Very Long Customer Name For Responsive Testing',
        'customer_phone': '+855 12 345 678',
        'customer_auth_token': 'local_token_mock',
      });
      final storage = await LocalStorageService.init();
      final user = UserProvider(
        localStorageService: storage,
        apiService: ApiService(),
      );

      final widths = [320.0, 360.0, 390.0, 430.0];
      for (final width in widths) {
        await tester.pumpWidget(
          createProfileTestApp(
            userProvider: user,
            width: width,
            height: 568.0,
            textScale: 1.3,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
    },
  );

  testWidgets(
    '10. Bottom navigation in MainScreen switches to Profile and back',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await LocalStorageService.init();
      final api = ApiService();
      final shopRepo = ShopRepository(apiService: api);
      final orderRepo = OrderRepository(
        apiService: api,
        localStorageService: storage,
      );

      final shopProvider = ShopProvider(
        shopRepository: shopRepo,
        localStorageService: storage,
      );
      final cartProvider = CartProvider(localStorageService: storage);
      final orderProvider = OrderProvider(orderRepository: orderRepo);
      final userProvider = UserProvider(
        localStorageService: storage,
        apiService: api,
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: shopProvider),
            ChangeNotifierProvider.value(value: cartProvider),
            ChangeNotifierProvider.value(value: orderProvider),
            ChangeNotifierProvider.value(value: userProvider),
          ],
          child: const MaterialApp(home: MainScreen()),
        ),
      );
      await tester.pump();

      // Switch to profile tab
      await tester.tap(find.byKey(const Key('nav-profile')));
      await tester.pumpAndSettle();

      expect(find.byType(ProfileScreen), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);

      // Switch to orders tab from profile card
      await tester.tap(find.byKey(const Key('profile-orders-card')));
      await tester.pumpAndSettle();

      expect(find.byType(OrderHistoryScreen), findsOneWidget);
    },
  );
}
