import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../providers/user_provider.dart';

/// Settings screen for API connection testing, developer diagnostics, and app info.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _apiUrlController;
  bool _isTesting = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<UserProvider>();
    _apiUrlController = TextEditingController(text: user.apiUrl);
  }

  @override
  void dispose() {
    _apiUrlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    setState(() => _isTesting = true);
    final user = context.read<UserProvider>();
    await user.checkServerConnection();
    if (!mounted) return;
    setState(() => _isTesting = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          user.isServerOnline
              ? 'Café server is online and reachable!'
              : 'Cannot connect to café server. Check the URL and network.',
        ),
        backgroundColor: user.isServerOnline
            ? AppColors.matcha
            : AppColors.accentRed,
      ),
    );
  }

  Future<void> _saveApiUrl() async {
    final user = context.read<UserProvider>();
    await user.updateApiUrl(_apiUrlController.text);
    if (!mounted) return;

    if (user.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(user.errorMessage!),
          backgroundColor: AppColors.accentRed,
        ),
      );
    } else {
      _apiUrlController.text = user.apiUrl;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Server URL updated successfully.'),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  Future<void> _resetApiUrl() async {
    final user = context.read<UserProvider>();
    await user.updateApiUrl('');
    if (!mounted) return;
    _apiUrlController.text = user.apiUrl;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Reset to default development server URL.'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.primary,
          elevation: 0,
          leading: IconButton(
            key: const Key('settings-back-button'),
            icon: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: Colors.white,
              size: 20,
            ),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text(
            'Settings',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 20,
            ),
          ),
          centerTitle: true,
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Server Connection Card
            _buildCard(
              title: 'Café API Server',
              icon: Icons.dns_rounded,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Connection Status',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: user.isServerOnline
                            ? AppColors.statusCompletedBg
                            : AppColors.statusCancelledBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: user.isServerOnline
                              ? AppColors.statusCompleted
                              : AppColors.statusCancelled,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: user.isServerOnline
                                  ? AppColors.statusCompleted
                                  : AppColors.statusCancelled,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            user.isServerOnline ? 'Online' : 'Offline',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: user.isServerOnline
                                  ? AppColors.statusCompleted
                                  : AppColors.statusCancelled,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Active Endpoint',
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.surfaceBorder),
                  ),
                  child: Text(
                    user.apiUrl,
                    style: const TextStyle(
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (!kReleaseMode) ...[
                  Text(
                    'Custom Server Address',
                    style: AppTypography.bodySmall.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    key: const Key('settings-api-url-field'),
                    controller: _apiUrlController,
                    decoration: InputDecoration(
                      hintText: 'http://127.0.0.1:8003',
                      fillColor: AppColors.surfaceMuted,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: AppColors.surfaceBorder,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: AppColors.surfaceBorder,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: CustomButton(
                          key: const Key('settings-save-url-button'),
                          text: 'Save URL',
                          height: 40,
                          onPressed: _saveApiUrl,
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        key: const Key('settings-reset-url-button'),
                        onPressed: _resetApiUrl,
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(80, 40),
                          side: const BorderSide(
                            color: AppColors.surfaceBorder,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Reset'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                const SizedBox(height: 4),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    key: const Key('settings-test-connection-button'),
                    onPressed: _isTesting ? null : _testConnection,
                    icon: _isTesting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded, size: 16),
                    label: Text(_isTesting ? 'Testing...' : 'Test Connection'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // App Information Card
            _buildCard(
              title: 'App Information',
              icon: Icons.info_outline_rounded,
              children: [
                _buildInfoRow('Application', AppConfig.appName),
                const Divider(height: 16, color: AppColors.surfaceBorder),
                _buildInfoRow('Tagline', AppConfig.appTagline),
                const Divider(height: 16, color: AppColors.surfaceBorder),
                _buildInfoRow('Version', 'v1.0.0+1'),
                const Divider(height: 16, color: AppColors.surfaceBorder),
                _buildInfoRow(
                  'Exchange Rate',
                  '1 USD = ${AppConfig.khrExchangeRate.toInt()} KHR',
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Café Policies & Demo Notice
            _buildCard(
              title: 'Café Policies & Notices',
              icon: Icons.verified_user_outlined,
              children: [
                Text(
                  'Payment & Order Demonstration',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'The KHQR payment screen is a safe demonstration workflow. No real financial transactions are executed, and simulated orders are prepared for in-store pickup.',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Offline Fallback',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'If the café API cannot be reached, the application provides an offline menu preview and local calculation estimates.',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            Center(
              child: Text(
                '${AppConfig.appName} • Phase 5 Profile Redesign\nClean Architecture & Flutter',
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.surfaceBorder, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTypography.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
