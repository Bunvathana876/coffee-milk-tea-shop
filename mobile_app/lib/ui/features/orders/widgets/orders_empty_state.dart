import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Empty orders illustration and Explore Menu CTA for Your Orders V4.
class OrdersEmptyState extends StatelessWidget {
  const OrdersEmptyState({super.key, this.onExploreMenu});

  final VoidCallback? onExploreMenu;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final isCompact = screenWidth < 360;
    final illustrationWidth = (screenWidth * 0.61).clamp(180.0, 238.0);

    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 16 : 24,
          vertical: isCompact ? 12 : 18,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/orders_v4/illustrations/no_orders_illustration_800.png',
              width: illustrationWidth,
              fit: BoxFit.contain,
              semanticLabel: 'Empty shopping bag with boba tea drink',
            ),
            SizedBox(height: isCompact ? 8 : 12),

            // Bold cobalt title
            Text(
              'No orders yet!',
              style: AppTypography.displayMedium.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),

            // Description copy
            Text(
              'You haven’t placed any orders.\nExplore our menu and order your favorite drinks!',
              style: AppTypography.bodyMedium.copyWith(height: 1.45),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: isCompact ? 18 : 24),

            // Large cobalt-blue pill button
            if (onExploreMenu != null)
              SizedBox(
                width: (screenWidth - 48).clamp(0.0, 292.0),
                height: 54,
                child: Material(
                  color: AppColors.primary,
                  elevation: 4,
                  shadowColor: AppColors.primary.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(28),
                  child: InkWell(
                    key: const Key('explore-menu-btn'),
                    onTap: onExploreMenu,
                    borderRadius: BorderRadius.circular(28),
                    child: Semantics(
                      button: true,
                      label: 'Explore Menu',
                      child: ExcludeSemantics(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              'assets/images/orders_v4/icons/ui_cup_white_96.png',
                              width: 20,
                              height: 20,
                              fit: BoxFit.contain,
                              semanticLabel: 'Coffee Cup',
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              'Explore Menu',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.1,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Image.asset(
                              'assets/images/orders_v4/icons/ui_arrow_right_white_96.png',
                              width: 16,
                              height: 16,
                              fit: BoxFit.contain,
                              semanticLabel: 'Arrow Right',
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
