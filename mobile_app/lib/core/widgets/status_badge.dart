import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Visual status pill for order tracking and lists.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 12,
  });

  final String status;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final (textColor, bgColor, icon, label) = _resolveStatusProperties(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: textColor.withAlpha(60), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: fontSize + 2, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  (Color, Color, IconData, String) _resolveStatusProperties(String status) {
    final lower = status.toLowerCase();
    switch (lower) {
      case 'pending':
        return (
          AppColors.statusPending,
          AppColors.statusPendingBg,
          Icons.access_time_rounded,
          'Received',
        );
      case 'preparing':
        return (
          AppColors.statusPreparing,
          AppColors.statusPreparingBg,
          Icons.blender_rounded,
          'Preparing',
        );
      case 'ready':
        return (
          AppColors.statusReady,
          AppColors.statusReadyBg,
          Icons.check_circle_outline_rounded,
          'Ready for Pickup',
        );
      case 'completed':
        return (
          AppColors.statusCompleted,
          AppColors.statusCompletedBg,
          Icons.verified_rounded,
          'Completed',
        );
      case 'cancelled':
        return (
          AppColors.statusCancelled,
          AppColors.statusCancelledBg,
          Icons.cancel_outlined,
          'Cancelled',
        );
      default:
        return (
          AppColors.textSecondary,
          AppColors.surfaceMuted,
          Icons.info_outline_rounded,
          status,
        );
    }
  }
}
