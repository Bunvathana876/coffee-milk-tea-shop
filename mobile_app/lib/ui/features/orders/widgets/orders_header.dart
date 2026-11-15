import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

/// Cobalt brand header for the Your Orders V4 screen.
/// Includes centered café branding, left-aligned title & subtitle,
/// smiling barista illustration, and decorative layered wave transition.
class OrdersHeader extends StatelessWidget {
  const OrdersHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final isCompact = screenWidth < 360;
    final baristaWidth = isCompact ? 82.0 : 94.0;

    return Container(
      color: AppColors.primary,
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 2),
            // The Home wordmark stacks BREW & BOBA on three lines. This
            // compact lockup matches the single-line Orders reference.
            Semantics(
              label: 'Brew & Boba Café',
              child: ExcludeSemantics(
                child: Column(
                  children: [
                    Text(
                      'BREW & BOBA',
                      style: TextStyle(
                        fontSize: isCompact ? 18 : 20,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                        color: Colors.white,
                      ),
                    ),
                    const Text(
                      '—  café  —',
                      style: TextStyle(
                        fontFamily: 'serif',
                        fontStyle: FontStyle.italic,
                        fontSize: 15,
                        height: 0.95,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Row with title/subtitle on left and barista illustration on right
            Padding(
              padding: EdgeInsets.fromLTRB(
                isCompact ? 16 : 20,
                0,
                isCompact ? 12 : 16,
                0,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Left: shopping bag icon, bold title, and subtitle
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Image.asset(
                                'assets/images/orders_v4/icons/header_bag_white_96.png',
                                width: isCompact ? 22 : 26,
                                height: isCompact ? 22 : 26,
                                fit: BoxFit.contain,
                                semanticLabel: 'Shopping Bag',
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  'Your Orders',
                                  style: TextStyle(
                                    fontSize: isCompact ? 21 : 25,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: -0.4,
                                  ),
                                  maxLines: 2,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Track and check your café orders.',
                            style: TextStyle(
                              fontSize: isCompact ? 12 : 13,
                              fontWeight: FontWeight.w400,
                              color: Colors.white.withValues(alpha: 0.88),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Right: smiling café barista holding coffee cup
                  Image.asset(
                    'assets/images/orders_v4/illustrations/orders_header_barista_512.png',
                    width: baristaWidth,
                    height: baristaWidth,
                    fit: BoxFit.contain,
                    semanticLabel: 'Smiling café barista holding a cup',
                  ),
                ],
              ),
            ),

            // Decorative layered wave transition (cobalt -> gold -> white -> cream)
            const SizedBox(
              width: double.infinity,
              height: 26,
              child: CustomPaint(painter: OrdersWavePainter()),
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom painter rendering the layered wave transition
/// from cobalt blue into the warm cream background.
class OrdersWavePainter extends CustomPainter {
  const OrdersWavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;

    // Base fill with cobalt blue
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.primary);

    // 1. Golden-yellow accent ribbon
    final goldPath = Path()
      ..moveTo(0, height * 0.38)
      ..cubicTo(
        width * 0.28,
        height * 0.82,
        width * 0.65,
        height * 0.05,
        width,
        height * 0.58,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(goldPath, Paint()..color = const Color(0xFFFFC231));

    // 2. Crisp white transition ribbon
    final whitePath = Path()
      ..moveTo(0, height * 0.56)
      ..cubicTo(
        width * 0.30,
        height * 0.94,
        width * 0.68,
        height * 0.26,
        width,
        height * 0.76,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(whitePath, Paint()..color = Colors.white);

    // 3. Warm cream ribbon blending into the page background
    final creamPath = Path()
      ..moveTo(0, height * 0.72)
      ..cubicTo(
        width * 0.32,
        height * 1.05,
        width * 0.70,
        height * 0.48,
        width,
        height * 0.90,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(creamPath, Paint()..color = const Color(0xFFFFF9F0));
  }

  @override
  bool shouldRepaint(covariant OrdersWavePainter oldDelegate) => false;
}
