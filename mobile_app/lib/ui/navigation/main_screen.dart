import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/cart_provider.dart';
import '../features/menu/screens/menu_screen.dart';
import '../features/cart/screens/cart_screen.dart';
import '../features/orders/screens/order_history_screen.dart';
import '../features/profile/screens/profile_screen.dart';

/// Main navigation shell holding the bottom navigation bar and feature screens.
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  void _navigateToTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    final screens = [
      MenuScreen(onNavigateToCart: () => _navigateToTab(2)),
      OrderHistoryScreen(onExploreMenu: () => _navigateToTab(0)),
      CartScreen(onExploreMenu: () => _navigateToTab(0)),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _navigateToTab,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront_rounded),
            label: 'Menu',
          ),
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: !cart.isEmpty,
              label: Text('${cart.totalQuantity}'),
              backgroundColor: AppColors.secondary,
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: !cart.isEmpty,
              label: Text('${cart.totalQuantity}'),
              backgroundColor: AppColors.secondary,
              child: const Icon(Icons.shopping_bag_rounded),
            ),
            label: 'Bag',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
