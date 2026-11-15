import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key, required this.onMenu, required this.onLogin});
  final VoidCallback onMenu;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(
    value: SystemUiOverlayStyle.light,
    child: Scaffold(
      backgroundColor: AppColors.primary,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth.clamp(0.0, 480.0);
            final artHeight = (constraints.maxHeight * .43).clamp(200.0, 360.0);
            return SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Center(
                  child: SizedBox(
                    width: width,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 20,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Image.asset(
                            'assets/welcome/welcome_wordmark_cream.png',
                            height: (width * .46).clamp(120.0, 190.0),
                            fit: BoxFit.contain,
                            semanticLabel: 'Brew & Boba Café',
                          ),
                          const SizedBox(height: 12),
                          Image.asset(
                            'assets/welcome/welcome_mascot.png',
                            height: artHeight,
                            fit: BoxFit.contain,
                            excludeFromSemantics: true,
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Come for the brew,\nstay for the vibes.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.background,
                              fontSize: 24,
                              fontStyle: FontStyle.italic,
                              fontWeight: FontWeight.w600,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 28),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            alignment: WrapAlignment.center,
                            children: [
                              _button('Log In', Icons.login_rounded, onLogin),
                              _button(
                                'Menu',
                                Icons.local_cafe_outlined,
                                onMenu,
                              ),
                            ],
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
  );

  Widget _button(String label, IconData icon, VoidCallback? action) =>
      OutlinedButton.icon(
        onPressed: action,
        icon: Icon(icon, size: 22),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.background,
          disabledForegroundColor: AppColors.background.withAlpha(150),
          side: BorderSide(
            color: AppColors.background.withAlpha(action == null ? 150 : 255),
            width: 2,
          ),
          minimumSize: const Size(128, 54),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      );
}
