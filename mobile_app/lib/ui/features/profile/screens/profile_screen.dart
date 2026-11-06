import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../providers/user_provider.dart';
import '../../auth/screens/auth_screen.dart';

/// Customer profile, authentication, loyalty punch card, and café information.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  bool _isEditingProfile = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<UserProvider>();
    _nameController = TextEditingController(text: user.customerName);
    _phoneController = TextEditingController(text: user.customerPhone);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    final user = context.read<UserProvider>();
    await user.saveProfile(
      name: _nameController.text,
      phone: _phoneController.text,
    );
    setState(() => _isEditingProfile = false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Profile saved successfully!'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  Future<void> _openAuthScreen({required bool isRegister}) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AuthScreen(initialIsRegister: isRegister),
      ),
    );
    if (!mounted) return;
    final user = context.read<UserProvider>();
    _nameController.text = user.customerName;
    _phoneController.text = user.customerPhone;
  }

  Future<void> _handleLogout() async {
    final user = context.read<UserProvider>();
    await user.logout();
    setState(() {
      _isEditingProfile = false;
      _nameController.clear();
      _phoneController.clear();
    });
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('You have been signed out.'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profile & Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Customer Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        user.customerName.isNotEmpty
                            ? user.customerName.substring(0, 1).toUpperCase()
                            : 'C',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  user.customerName.isNotEmpty
                                      ? user.customerName
                                      : 'Guest Customer',
                                  style: AppTypography.titleLarge,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (user.isAuthenticated) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withAlpha(25),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Text(
                                    'Member',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user.customerPhone.isNotEmpty
                                ? user.customerPhone
                                : 'No phone saved',
                            style: AppTypography.bodyMedium,
                          ),
                          if (user.customerEmail.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              user.customerEmail,
                              style: AppTypography.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        _isEditingProfile ? Icons.close : Icons.edit_outlined,
                        color: AppColors.primary,
                      ),
                      onPressed: () {
                        setState(() {
                          _isEditingProfile = !_isEditingProfile;
                          if (_isEditingProfile) {
                            _nameController.text = user.customerName;
                            _phoneController.text = user.customerPhone;
                          }
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (!user.isAuthenticated)
                  Row(
                    children: [
                      Expanded(
                        child: CustomButton(
                          text: 'Sign In',
                          height: 44,
                          icon: const Icon(Icons.login_rounded, size: 18),
                          onPressed: () => _openAuthScreen(isRegister: false),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: CustomButton(
                          text: 'Register',
                          height: 44,
                          isOutlined: true,
                          icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
                          onPressed: () => _openAuthScreen(isRegister: true),
                        ),
                      ),
                    ],
                  )
                else
                  CustomButton(
                    text: 'Sign Out',
                    height: 44,
                    isOutlined: true,
                    icon: const Icon(Icons.logout_rounded, size: 18),
                    onPressed: _handleLogout,
                  ),
                if (_isEditingProfile) ...[
                  const Divider(height: 24, color: AppColors.surfaceBorder),
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Your Name', style: AppTypography.titleSmall),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameController,
                          decoration: const InputDecoration(hintText: 'e.g. John Doe'),
                          validator: (val) =>
                              val == null || val.trim().length < 2 ? 'Minimum 2 characters' : null,
                        ),
                        const SizedBox(height: 12),
                        const Text('Phone Number', style: AppTypography.titleSmall),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(hintText: 'e.g. 012 345 678'),
                          validator: (val) =>
                              val == null || val.trim().length < 8 ? 'Minimum 8 digits' : null,
                        ),
                        const SizedBox(height: 16),
                        CustomButton(
                          text: 'Save Details',
                          height: 46,
                          onPressed: _saveProfile,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Digital Café Loyalty Punch Card
          _buildLoyaltyCard(user),
          const SizedBox(height: 20),

          // Café Store Details
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Store Information', style: AppTypography.titleSmall),
                const SizedBox(height: 14),
                _buildInfoTile(
                  icon: Icons.storefront_rounded,
                  title: AppConfig.appName,
                  subtitle: AppConfig.storeAddress,
                ),
                const Divider(height: 20, color: AppColors.surfaceBorder),
                _buildInfoTile(
                  icon: Icons.phone_outlined,
                  title: 'Order Hotline',
                  subtitle: AppConfig.storePhone,
                ),
                const Divider(height: 20, color: AppColors.surfaceBorder),
                _buildInfoTile(
                  icon: Icons.access_time_rounded,
                  title: 'Opening Hours',
                  subtitle: AppConfig.storeHours,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // App Version footer
          Center(
            child: Text(
              '${AppConfig.appName} Mobile v1.0.0\nCrafted with Flutter & Clean Architecture',
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoyaltyCard(UserProvider user) {
    final totalStamps = user.loyaltyStamps;
    final currentCycleStamps = totalStamps % 10;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(20),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.loyalty_rounded, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Café Punch Card',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Confirmed café order stamps',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$currentCycleStamps / 10',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 10 Stamp Grid (2 rows of 5)
          LayoutBuilder(
            builder: (context, constraints) {
              final itemSize = (constraints.maxWidth - (4 * 8)) / 5;
              return Wrap(
                spacing: 8,
                runSpacing: 10,
                children: List.generate(10, (index) {
                  final stampNumber = index + 1;
                  final isCompleted = index < currentCycleStamps;
                  final isFreeDrinkSlot = index == 9;

                  return Container(
                    width: itemSize,
                    height: itemSize,
                    decoration: BoxDecoration(
                      color: isCompleted
                          ? (isFreeDrinkSlot ? AppColors.secondary.withAlpha(40) : AppColors.primary.withAlpha(20))
                          : AppColors.surfaceMuted,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isCompleted
                            ? (isFreeDrinkSlot ? AppColors.secondary : AppColors.primary)
                            : AppColors.surfaceBorder,
                        width: isCompleted ? 2 : 1,
                      ),
                    ),
                    child: Center(
                      child: isCompleted
                          ? Icon(
                              isFreeDrinkSlot ? Icons.card_giftcard_rounded : Icons.check_circle_rounded,
                              color: isFreeDrinkSlot ? AppColors.secondary : AppColors.primary,
                              size: itemSize * 0.5,
                            )
                          : isFreeDrinkSlot
                              ? Icon(
                                  Icons.star_rounded,
                                  color: AppColors.textTertiary,
                                  size: itemSize * 0.5,
                                )
                              : Text(
                                  '$stampNumber',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textTertiary,
                                  ),
                                ),
                    ),
                  );
                }),
              );
            },
          ),

          const SizedBox(height: 14),

          // Reward status banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    user.hasServerSession
                        ? '$totalStamps confirmed stamp(s). ${user.loyaltyIsFresh ? 'Synced with the café.' : 'Last confirmed balance; reconnect to refresh.'} Reward availability is confirmed by the café.'
                        : 'Sign in to the café server to see confirmed stamps.',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          if (user.legacyLocalStamps > 0 && user.legacyLocalStamps != totalStamps) ...[
            const SizedBox(height: 8),
            Text(
              'Earlier device-only balance: ${user.legacyLocalStamps} (unverified; not added to confirmed rewards).',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}
