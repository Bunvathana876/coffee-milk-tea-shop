import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Empty bag presentation. The parent keeps ownership of tab navigation.
class EmptyCartView extends StatelessWidget {
  const EmptyCartView({super.key, required this.onExploreMenu});

  final VoidCallback? onExploreMenu;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).height < 700;

    return Column(
      children: [
        Container(
          key: const Key('empty-cart-header'),
          width: double.infinity,
          color: AppColors.primary,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(20, compact ? 4 : 8, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/welcome/welcome_wordmark_cream.png',
                    width: compact ? 112 : 124,
                    height: compact ? 30 : 34,
                    fit: BoxFit.contain,
                    semanticLabel: 'Brew & Boba Café',
                  ),
                  SizedBox(height: compact ? 8 : 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.shopping_bag_outlined,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 10),
                      Flexible(
                        child: Text(
                          'Your Order',
                          textAlign: TextAlign.center,
                          style: AppTypography.displayLarge.copyWith(
                            color: Colors.white,
                            fontSize: compact ? 25 : 28,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        SizedBox(
          width: double.infinity,
          height: compact ? 42 : 48,
          child: const CustomPaint(painter: _OrderWavePainter()),
        ),
        Expanded(
          child: ColoredBox(
            key: const Key('empty-cart-content'),
            color: AppColors.background,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final contentHeight = constraints.maxHeight;
                final compactContent = contentHeight < 520;
                final illustrationSize = math.min(
                  math.min(
                    contentHeight * (compactContent ? 0.34 : 0.43),
                    264.0,
                  ),
                  math.max(120.0, constraints.maxWidth - 64),
                );
                final gap = compactContent ? 12.0 : 18.0;

                return SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: contentHeight),
                    child: Center(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          24,
                          gap,
                          24,
                          compactContent ? 16 : 28,
                        ),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 360),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Image.asset(
                                'assets/images/empty_bag_illustration.png',
                                key: const Key('empty-bag-illustration'),
                                width: illustrationSize,
                                height: illustrationSize,
                                fit: BoxFit.contain,
                                semanticLabel:
                                    'Illustration of an empty café shopping bag',
                              ),
                              SizedBox(height: gap),
                              Text(
                                'Your bag is empty',
                                textAlign: TextAlign.center,
                                style: AppTypography.displayMedium.copyWith(
                                  color: AppColors.bobaPearl,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'Looks like you haven’t added any coffees or milk teas yet!',
                                textAlign: TextAlign.center,
                                style: AppTypography.bodyLarge.copyWith(
                                  color: AppColors.primary,
                                  height: 1.5,
                                ),
                              ),
                              SizedBox(height: gap + 8),
                              ConstrainedBox(
                                constraints: const BoxConstraints(
                                  maxWidth: 320,
                                ),
                                child: SizedBox(
                                  width: double.infinity,
                                  height: 58,
                                  child: ElevatedButton(
                                    onPressed: onExploreMenu,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                      ),
                                      shape: const StadiumBorder(),
                                    ),
                                    child: const Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            'Explore Menu',
                                            textAlign: TextAlign.center,
                                            maxLines: 2,
                                          ),
                                        ),
                                        SizedBox(width: 8),
                                        Icon(
                                          Icons.arrow_forward_rounded,
                                          size: 22,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _OrderWavePainter extends CustomPainter {
  const _OrderWavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.primary);
    final width = size.width;
    final height = size.height;

    final yellow = Path()
      ..moveTo(0, height * 0.16)
      ..cubicTo(
        width * 0.25,
        height * 0.66,
        width * 0.65,
        0,
        width,
        height * 0.30,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(yellow, Paint()..color = AppColors.secondary);

    final white = Path()
      ..moveTo(0, height * 0.43)
      ..cubicTo(
        width * 0.28,
        height * 0.88,
        width * 0.68,
        height * 0.22,
        width,
        height * 0.55,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(white, Paint()..color = Colors.white);

    final cream = Path()
      ..moveTo(0, height * 0.68)
      ..cubicTo(
        width * 0.28,
        height,
        width * 0.68,
        height * 0.43,
        width,
        height * 0.75,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(cream, Paint()..color = AppColors.background);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Decorative transition between the cream cart body and blue navigation base.
class EmptyCartFooterWave extends StatelessWidget {
  const EmptyCartFooterWave({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: double.infinity,
    height: 24,
    child: CustomPaint(painter: _FooterWavePainter()),
  );
}

class _FooterWavePainter extends CustomPainter {
  const _FooterWavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.background);
    final width = size.width;
    final height = size.height;
    final yellow = Path()
      ..moveTo(0, height * 0.55)
      ..cubicTo(
        width * 0.34,
        height * 0.18,
        width * 0.68,
        height * 0.9,
        width,
        height * 0.34,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(yellow, Paint()..color = AppColors.secondary);

    final blue = Path()
      ..moveTo(0, height * 0.82)
      ..cubicTo(
        width * 0.34,
        height * 0.42,
        width * 0.68,
        height,
        width,
        height * 0.60,
      )
      ..lineTo(width, height)
      ..lineTo(0, height)
      ..close();
    canvas.drawPath(blue, Paint()..color = AppColors.primary);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
