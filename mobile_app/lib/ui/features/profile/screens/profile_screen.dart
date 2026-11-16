import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../providers/user_provider.dart';
import '../../auth/screens/auth_screen.dart';
import '../../orders/screens/order_history_screen.dart';
import 'settings_screen.dart';

/// Customer profile, authentication status, café punch card, and store information.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.onViewOrders});

  final VoidCallback? onViewOrders;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  bool _isEditingProfile = false;

  static const Color _creamCardBg = Color(0xFFFFF9EE);
  static const Color _creamBorderColor = Color(0xFFECD6A9);
  static const Color _goldAccent = Color(0xFFD4AF37);

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

  void _navigateToOrders() {
    if (widget.onViewOrders != null) {
      widget.onViewOrders!();
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
      );
    }
  }

  void _navigateToSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SettingsScreen()),
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
        backgroundColor: AppColors.primary,
        body: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header with centered wordmark, left Profile title, and wave
              _buildHeader(),

              // Cards positioned over cobalt-blue background, overlapping wave
              Transform.translate(
                offset: const Offset(0, -18),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Profile Card
                      _buildProfileInfoCard(context, user),
                      const SizedBox(height: 12),

                      // Your Orders Card
                      _buildOrdersCard(),
                      const SizedBox(height: 12),

                      // Café Punch Card
                      _buildLoyaltyCard(user),
                      const SizedBox(height: 12),

                      // Store Information Card
                      _buildStoreInfoCard(),
                      const SizedBox(height: 12),

                      // Settings Card
                      _buildSettingsCard(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Header with centered wordmark, left-aligned Profile icon & heading, and decorative wave.
  Widget _buildHeader() {
    return Container(
      color: AppColors.primary,
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 6),
            // Centered BREW & BOBA café wordmark
            Center(
              child: Image.asset(
                'assets/welcome/welcome_wordmark_cream.png',
                width: 145,
                height: 36,
                fit: BoxFit.contain,
                semanticLabel: 'Brew & Boba Café',
              ),
            ),
            const SizedBox(height: 10),
            // Left-aligned Profile icon & heading matching reference
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Image.asset(
                    'assets/images/profile/icon_profile.png',
                    width: 24,
                    height: 24,
                    fit: BoxFit.contain,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Profile',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // Decorative layered wave transition
            const SizedBox(
              width: double.infinity,
              height: 34,
              child: CustomPaint(painter: _ProfileWavePainter()),
            ),
          ],
        ),
      ),
    );
  }

  /// Compact Profile Card overlapping the bottom of the header.
  Widget _buildProfileInfoCard(BuildContext context, UserProvider user) {
    final isAuth = user.isAuthenticated;

    return Container(
      decoration: BoxDecoration(
        color: _creamCardBg,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _creamBorderColor, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Circular profile avatar
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.secondaryLight,
                  border: Border.all(color: _creamBorderColor, width: 1.5),
                ),
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/profile/profile_avatar.png',
                    width: 54,
                    height: 54,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Customer Details or Welcome
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isAuth) ...[
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              user.customerName.isNotEmpty
                                  ? user.customerName
                                  : 'Café Member',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Member',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.customerPhone.isNotEmpty
                            ? user.customerPhone
                            : 'No phone saved',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ] else ...[
                      const Text(
                        'Welcome to Brew & Boba!',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Sign in or register to track stamps & orders',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Edit button
              if (isAuth)
                GestureDetector(
                  key: const Key('profile-edit-button'),
                  onTap: () {
                    setState(() {
                      _isEditingProfile = !_isEditingProfile;
                      if (_isEditingProfile) {
                        _nameController.text = user.customerName;
                        _phoneController.text = user.customerPhone;
                      }
                    });
                  },
                  child: Image.asset(
                    'assets/images/profile/icon_edit_button.png',
                    width: 32,
                    height: 32,
                    fit: BoxFit.contain,
                  ),
                ),
            ],
          ),

          // Guest Sign In / Register Buttons
          if (!isAuth) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: ElevatedButton.icon(
                      key: const Key('profile-sign-in-button'),
                      onPressed: () => _openAuthScreen(isRegister: false),
                      icon: Image.asset(
                        'assets/images/profile/icon_sign_in.png',
                        width: 15,
                        height: 15,
                        fit: BoxFit.contain,
                        color: Colors.white,
                      ),
                      label: const Text(
                        'Sign In',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: Colors.white,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: OutlinedButton.icon(
                      key: const Key('profile-register-button'),
                      onPressed: () => _openAuthScreen(isRegister: true),
                      icon: Image.asset(
                        'assets/images/profile/icon_register.png',
                        width: 15,
                        height: 15,
                        fit: BoxFit.contain,
                        color: AppColors.primary,
                      ),
                      label: const Text(
                        'Register',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: AppColors.primary,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(
                          color: AppColors.primary,
                          width: 1.2,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],

          // Authenticated Edit Form & Sign Out
          if (isAuth) ...[
            if (_isEditingProfile) ...[
              const Divider(height: 20, color: _creamBorderColor),
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your Name',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextFormField(
                      key: const Key('profile-edit-name-field'),
                      controller: _nameController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'e.g. John Doe',
                        fillColor: AppColors.surface,
                        filled: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(
                            color: _creamBorderColor,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(
                            color: _creamBorderColor,
                          ),
                        ),
                      ),
                      validator: (val) => val == null || val.trim().length < 2
                          ? 'Minimum 2 characters'
                          : null,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Phone Number',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextFormField(
                      key: const Key('profile-edit-phone-field'),
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'e.g. 012 345 678',
                        fillColor: AppColors.surface,
                        filled: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(
                            color: _creamBorderColor,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(
                            color: _creamBorderColor,
                          ),
                        ),
                      ),
                      validator: (val) => val == null || val.trim().length < 8
                          ? 'Minimum 8 digits'
                          : null,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: CustomButton(
                            key: const Key('profile-save-button'),
                            text: 'Save Details',
                            height: 38,
                            onPressed: _saveProfile,
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () =>
                              setState(() => _isEditingProfile = false),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(70, 38),
                            side: const BorderSide(color: _creamBorderColor),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text(
                            'Cancel',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  key: const Key('profile-sign-out-button'),
                  onPressed: _handleLogout,
                  icon: const Icon(
                    Icons.logout_rounded,
                    size: 14,
                    color: AppColors.accentRed,
                  ),
                  label: const Text(
                    'Sign Out',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.accentRed,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// Compact Your Orders Card.
  Widget _buildOrdersCard() {
    return Container(
      decoration: BoxDecoration(
        color: _creamCardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _creamBorderColor, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: const Key('profile-orders-card'),
          borderRadius: BorderRadius.circular(20),
          onTap: _navigateToOrders,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Row(
              children: [
                Image.asset(
                  'assets/images/profile/icon_orders.png',
                  width: 24,
                  height: 24,
                  fit: BoxFit.contain,
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Text(
                    'Your Orders',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Image.asset(
                  'assets/images/profile/icon_arrow_right.png',
                  width: 14,
                  height: 14,
                  fit: BoxFit.contain,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Compact horizontal Café Punch Card.
  Widget _buildLoyaltyCard(UserProvider user) {
    final totalStamps = user.isAuthenticated ? user.loyaltyStamps : 0;
    final currentCycleStamps = totalStamps % 10;

    return Container(
      decoration: BoxDecoration(
        color: _creamCardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _creamBorderColor, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with heading and small progress pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Café Punch Card',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  user.isAuthenticated ? '$currentCycleStamps / 10' : '0 / 10',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Body: Boba illustration on the left, 2 rows of 5 stamps on the right
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Image.asset(
                'assets/images/profile/loyalty_boba.png',
                width: 54,
                height: 68,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    const spacing = 5.0;
                    final stampSize =
                        ((constraints.maxWidth - (4 * spacing)) / 5).clamp(
                          24.0,
                          34.0,
                        );

                    return Wrap(
                      spacing: spacing,
                      runSpacing: 6,
                      children: List.generate(10, (index) {
                        final stampNumber = index + 1;
                        final isCompleted =
                            user.isAuthenticated && index < currentCycleStamps;
                        final isStarSlot = index == 9;

                        return Container(
                          width: stampSize,
                          height: stampSize,
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? (isStarSlot
                                      ? AppColors.secondary
                                      : AppColors.primary)
                                : const Color(0xFFFFFDF5),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isCompleted
                                  ? (isStarSlot
                                        ? const Color(0xFFD97706)
                                        : AppColors.primaryDark)
                                  : _goldAccent,
                              width: 1.0,
                            ),
                          ),
                          child: Center(
                            child: isStarSlot
                                ? Image.asset(
                                    'assets/images/profile/icon_star.png',
                                    width: stampSize * 0.52,
                                    height: stampSize * 0.52,
                                    fit: BoxFit.contain,
                                    color: isCompleted
                                        ? const Color(0xFFB45309)
                                        : _goldAccent,
                                  )
                                : isCompleted
                                ? Icon(
                                    Icons.check_rounded,
                                    size: stampSize * 0.55,
                                    color: Colors.white,
                                  )
                                : Text(
                                    '$stampNumber',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                          ),
                        );
                      }),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Compact horizontal Store Information Card.
  Widget _buildStoreInfoCard() {
    final hasAddress = AppConfig.storeAddress.isNotEmpty;
    final hasPhone = AppConfig.storePhone.isNotEmpty;
    final hasHours = AppConfig.storeHours.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: _creamCardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _creamBorderColor, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Store Information',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),

          // Horizontal layout: storefront on the left, thin golden vertical divider, details on the right
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/images/profile/cafe_storefront.png',
                  width: 88,
                  height: 80,
                  fit: BoxFit.contain,
                ),
                const SizedBox(width: 10),
                Container(width: 1, color: _goldAccent.withValues(alpha: 0.6)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        AppConfig.appName.isNotEmpty
                            ? AppConfig.appName
                            : 'Brew & Boba Café',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      if (hasAddress)
                        _buildStoreRow(
                          iconAsset: 'assets/images/profile/icon_location.png',
                          detail: AppConfig.storeAddress,
                        ),
                      const SizedBox(height: 3),
                      Container(height: 0.5, color: _creamBorderColor),
                      const SizedBox(height: 3),
                      if (hasPhone)
                        _buildStoreRow(
                          iconAsset: 'assets/images/profile/icon_phone.png',
                          detail: AppConfig.storePhone,
                        ),
                      const SizedBox(height: 3),
                      Container(height: 0.5, color: _creamBorderColor),
                      const SizedBox(height: 3),
                      if (hasHours)
                        _buildStoreRow(
                          iconAsset: 'assets/images/profile/icon_hours.png',
                          detail: AppConfig.storeHours,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStoreRow({required String iconAsset, required String detail}) {
    return Row(
      children: [
        Image.asset(
          iconAsset,
          width: 13,
          height: 13,
          fit: BoxFit.contain,
          color: AppColors.primary,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            detail,
            style: const TextStyle(
              fontSize: 10.5,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  /// Compact Settings Card.
  Widget _buildSettingsCard() {
    return Container(
      decoration: BoxDecoration(
        color: _creamCardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _creamBorderColor, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.bobaPearl.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: const Key('profile-settings-card'),
          borderRadius: BorderRadius.circular(20),
          onTap: _navigateToSettings,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Row(
              children: [
                Image.asset(
                  'assets/images/profile/icon_settings.png',
                  width: 24,
                  height: 24,
                  fit: BoxFit.contain,
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Text(
                    'Settings',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Image.asset(
                  'assets/images/profile/icon_arrow_right.png',
                  width: 14,
                  height: 14,
                  fit: BoxFit.contain,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Custom painter rendering the smooth decorative yellow, white, and cream wave ribbons.
class _ProfileWavePainter extends CustomPainter {
  const _ProfileWavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;

    // Fill base with cobalt blue
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.primary);

    // Golden-yellow ribbon curve
    final yellow = Path()
      ..moveTo(0, height * 0.40)
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
    canvas.drawPath(yellow, Paint()..color = const Color(0xFFF5E4AD));

    // Crisp white ribbon curve
    final white = Path()
      ..moveTo(0, height * 0.58)
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
    canvas.drawPath(white, Paint()..color = Colors.white);

    // Warm cream ribbon curve
    final cream = Path()
      ..moveTo(0, height * 0.74)
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
    canvas.drawPath(cream, Paint()..color = const Color(0xFFFFF9EE));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
