import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/cart_provider.dart';
import '../features/menu/screens/menu_screen.dart';
import '../features/cart/screens/cart_screen.dart';
import '../features/cart/widgets/empty_cart_view.dart';
import '../features/orders/screens/order_history_screen.dart';
import '../features/profile/screens/profile_screen.dart';

/// Keeps all four existing destinations alive while styling the navigation.
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int currentIndex = 0;

  void navigateToTab(int index) => setState(() => currentIndex = index);

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final screens = [
      MenuScreen(
        isActive: currentIndex == 0,
        onNavigateToCart: () => navigateToTab(2),
        onNavigateToProfile: () => navigateToTab(3),
      ),
      OrderHistoryScreen(onExploreMenu: () => navigateToTab(0)),
      CartScreen(onExploreMenu: () => navigateToTab(0)),
      ProfileScreen(onViewOrders: () => navigateToTab(1)),
    ];
    const labels = ['Home', 'Orders', 'Bag', 'Profile'];
    const assets = ['home', 'orders', 'bag', 'profile'];
    final emptyBagSelected = currentIndex == 2 && cart.isEmpty;
    final navigationBar = SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Container(
        height: 72,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: AppColors.bobaPearl,
          borderRadius: BorderRadius.circular(40),
        ),
        child: Row(
          children: List.generate(4, (index) {
            final selected = currentIndex == index;
            final icon = Image.asset(
              'assets/home/icons/png/${assets[index]}.png',
              width: 28,
              height: 28,
              color: selected ? AppColors.primary : AppColors.secondaryLight,
            );
            return Expanded(
              child: Semantics(
                selected: selected,
                button: true,
                label: labels[index],
                child: InkWell(
                  key: Key('nav-${labels[index].toLowerCase()}'),
                  onTap: () => navigateToTab(index),
                  borderRadius: BorderRadius.circular(32),
                  child: Center(
                    child: Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.secondaryLight
                            : Colors.transparent,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: index == 2 && !cart.isEmpty
                            ? Badge(
                                label: Text('${cart.totalQuantity}'),
                                backgroundColor: AppColors.primary,
                                child: icon,
                              )
                            : icon,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: currentIndex == 0 || currentIndex == 3 || emptyBagSelected
          ? SystemUiOverlayStyle.light.copyWith(
              statusBarColor: Colors.transparent,
            )
          : SystemUiOverlayStyle.dark.copyWith(
              statusBarColor: Colors.transparent,
            ),
      child: Scaffold(
        backgroundColor: currentIndex == 0
            ? AppColors.primary
            : AppColors.background,
        body: IndexedStack(index: currentIndex, children: screens),
        bottomNavigationBar: emptyBagSelected
            ? ColoredBox(
                color: AppColors.primary,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [const EmptyCartFooterWave(), navigationBar],
                ),
              )
            : navigationBar,
      ),
    );
  }
}
