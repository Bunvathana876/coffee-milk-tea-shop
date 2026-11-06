import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kReleaseMode;
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize persistent storage
  final localStorageService = await LocalStorageService.init();

  // Initialize HTTP network service
  final savedApiUrl = localStorageService.getCustomApiUrl();
  final configuredApiUrl = AppConfig.defaultApiBaseUrl;
  final apiService = ApiService(
    baseUrl: !kReleaseMode && savedApiUrl != null && savedApiUrl.isNotEmpty
        ? savedApiUrl
        : configuredApiUrl,
  );

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
      home: const MainScreen(),
    );
  }
}
