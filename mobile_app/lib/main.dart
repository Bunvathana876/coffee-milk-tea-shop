import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:provider/provider.dart';
import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/shop_repository.dart';
import 'data/repositories/order_repository.dart';
import 'data/services/api_service.dart';
import 'data/services/local_storage_service.dart';
import 'providers/shop_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/order_provider.dart';
import 'providers/user_provider.dart';
import 'ui/navigation/main_screen.dart';
import 'ui/features/auth/screens/auth_screen.dart';
import 'ui/features/welcome/welcome_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize persistent storage
  final localStorageService = await LocalStorageService.init();

  // Initialize HTTP network service
  final savedApiUrl = localStorageService.getCustomApiUrl();
  final resolvedApiUrl = AppConfig.resolveApiBaseUrl(
    savedCustomApiUrl: savedApiUrl,
  );
  if (kDebugMode) {
    debugPrint('Café API base URL: $resolvedApiUrl');
  }
  final apiService = ApiService(baseUrl: resolvedApiUrl);

  // Initialize repositories
  final shopRepository = ShopRepository(apiService: apiService);
  final orderRepository = OrderRepository(
    apiService: apiService,
    localStorageService: localStorageService,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => ShopProvider(
            shopRepository: shopRepository,
            localStorageService: localStorageService,
          )..initialize(),
        ),
        ChangeNotifierProvider(
          create: (_) => CartProvider(localStorageService: localStorageService),
        ),
        ChangeNotifierProvider(
          create: (_) => OrderProvider(orderRepository: orderRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => UserProvider(
            localStorageService: localStorageService,
            apiService: apiService,
          ),
        ),
      ],
      child: const BrewAndBobaApp(),
    ),
  );
}

class BrewAndBobaApp extends StatelessWidget {
  const BrewAndBobaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: Builder(
        builder: (context) => WelcomeScreen(
          onLogin: () async {
            final signedIn = await Navigator.of(
              context,
            ).push<bool>(MaterialPageRoute(builder: (_) => const AuthScreen()));
            if (signedIn == true && context.mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute<void>(builder: (_) => const MainScreen()),
              );
            }
          },
          onMenu: () => Navigator.of(context).pushReplacement(
            MaterialPageRoute<void>(builder: (_) => const MainScreen()),
          ),
        ),
      ),
    );
  }
}
