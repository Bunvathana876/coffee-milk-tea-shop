import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/order_model.dart';

/// 4-Stage visual order progress tracker.
/// Displays Pending -> Preparing -> Ready -> Completed.
///
/// If [order] is null or [isNeutralPreview] is true, displays an honest
/// neutral preview where all steps are inactive.
/// If [order] is cancelled, displays a distinct cancellation state and
/// never presents the order as completed.
class OrderStatusTracker extends StatelessWidget {
  const OrderStatusTracker({
    super.key,
    this.order,
    this.isNeutralPreview = false,
    this.onTap,
  });

  final OrderModel? order;
  final bool isNeutralPreview;
  final VoidCallback? onTap;

  static const List<_StatusStepConfig> _steps = [
    _StatusStepConfig(
      label: 'Pending',
      assetPath: 'assets/images/orders_v4/icons/status_pending_96.png',
    ),
    _StatusStepConfig(
      label: 'Preparing',
      assetPath: 'assets/images/orders_v4/icons/status_preparing_96.png',
    ),
    _StatusStepConfig(
      label: 'Ready',
      assetPath: 'assets/images/orders_v4/icons/status_ready_96.png',
    ),
    _StatusStepConfig(
      label: 'Completed',
      assetPath: 'assets/images/orders_v4/icons/status_completed_96.png',
    ),
  ];

  int _getStepIndex(String? status) {
    if (status == null) return -1;
    switch (status.toLowerCase().trim()) {
      case 'pending':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
        return 2;
      case 'completed':
        return 3;
      default:
        return -1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCancelled = order?.orderStatus.toLowerCase().trim() == 'cancelled';
    final currentStep = (isNeutralPreview || order == null || isCancelled)
        ? -1
        : _getStepIndex(order!.orderStatus);
    final hasOrder = order != null && !isNeutralPreview;
    final progressLabel = !hasOrder
        ? 'Order status guide. No active order.'
        : isCancelled
        ? 'Order ${order!.orderNumber} cancelled.'
        : currentStep < 0
        ? 'Order ${order!.orderNumber} status ${order!.orderStatus}.'
        : 'Order ${order!.orderNumber} ${_steps[currentStep].label}.';

    final card = Semantics(
      container: true,
      label: progressLabel,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFFFFDF8),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF0E5D3), width: 1.0),
          boxShadow: [
            BoxShadow(
              color: AppColors.bobaPearl.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hasOrder) ...[
              Wrap(
                spacing: 8,
                runSpacing: 4,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (isCancelled) ...[
                    Image.asset(
                      'assets/images/orders_v4/icons/status_cancelled_96.png',
                      width: 18,
                      height: 18,
                    ),
                  ],
                  Text(
                    isCancelled
                        ? 'ORDER CANCELLED'
                        : currentStep == 3
                        ? 'ORDER COMPLETED'
                        : 'LIVE ORDER STATUS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isCancelled
                          ? AppColors.statusCancelled
                          : AppColors.primaryDark,
                      letterSpacing: 0.6,
                    ),
                  ),
                  Text(
                    order!.orderNumber,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // 4 Step Icons and Labels
            Row(
              children: List.generate(_steps.length, (index) {
                final step = _steps[index];
                final isCurrentStep = !isCancelled && currentStep == index;

                return Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        step.assetPath,
                        width: 30,
                        height: 30,
                        fit: BoxFit.contain,
                        semanticLabel: '${step.label} stage',
                      ),
                      const SizedBox(height: 5),
                      // Step Label
                      Text(
                        step.label,
                        style: TextStyle(
                          fontSize: MediaQuery.sizeOf(context).width < 360
                              ? 10.5
                              : 11.5,
                          fontWeight: isCurrentStep
                              ? FontWeight.w800
                              : FontWeight.w700,
                          color: AppColors.primaryDark,
                        ),
                        maxLines: 2,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                );
              }),
            ),

            const SizedBox(height: 9),

            // Connecting progress timeline line and markers
            SizedBox(
              height: 22,
              child: CustomPaint(
                painter: _TrackerProgressPainter(
                  currentStep: currentStep,
                  isCancelled: isCancelled,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: card,
      );
    }

    return card;
  }
}

class _StatusStepConfig {
  final String label;
  final String assetPath;

  const _StatusStepConfig({required this.label, required this.assetPath});
}

class _TrackerProgressPainter extends CustomPainter {
  final int currentStep;
  final bool isCancelled;

  const _TrackerProgressPainter({
    required this.currentStep,
    required this.isCancelled,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const stepCount = 4;
    final columnWidth = size.width / stepCount;
    final centerY = size.height / 2;

    final inactiveLinePaint = Paint()
      ..color = const Color(0xFFD0DBE8)
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;

    final activeLinePaint = Paint()
      ..color = const Color(0xFFFFC231)
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
      Offset(columnWidth / 2, centerY),
      Offset(size.width - columnWidth / 2, centerY),
      inactiveLinePaint,
    );
    if (!isCancelled && currentStep > 0) {
      canvas.drawLine(
        Offset(columnWidth / 2, centerY),
        Offset((currentStep + 0.5) * columnWidth, centerY),
        activeLinePaint,
      );
    }

    // Draw markers for each step
    for (int i = 0; i < stepCount; i++) {
      final x = (i + 0.5) * columnWidth;
      final center = Offset(x, centerY);

      final reached = !isCancelled && currentStep >= i;
      canvas.drawCircle(
        center,
        10,
        Paint()
          ..color = reached ? const Color(0xFFFFA600) : const Color(0xFFD0DBE8),
      );
      canvas.drawCircle(center, 5, Paint()..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(covariant _TrackerProgressPainter oldDelegate) =>
      oldDelegate.currentStep != currentStep ||
      oldDelegate.isCancelled != isCancelled;
}
