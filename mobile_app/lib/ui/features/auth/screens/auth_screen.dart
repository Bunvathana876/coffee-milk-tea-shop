import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../providers/user_provider.dart';

/// Customer Login & Registration screen with tab switcher and form validation.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, this.initialIsRegister = false});

  final bool initialIsRegister;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  late bool _isRegister;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _isRegister = widget.initialIsRegister;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<UserProvider>().clearError();
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _identifierController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _toggleMode(bool registerMode) {
    if (_isRegister == registerMode) return;
    context.read<UserProvider>().clearError();
    setState(() {
      _isRegister = registerMode;
    });
  }

  Future<void> _submit() async {
    if (context.read<UserProvider>().isLoading) return;
    if (!_formKey.currentState!.validate()) return;

    final userProvider = context.read<UserProvider>();
    bool success = false;

    if (_isRegister) {
      success = await userProvider.register(
        fullName: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        email: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        password: _passwordController.text,
      );
    } else {
      success = await userProvider.login(
        identifier: _identifierController.text.trim(),
        password: _passwordController.text,
      );
    }

    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _isRegister
                ? 'Welcome to ${AppConfig.appName}, ${userProvider.customerName}!'
                : 'Welcome back, ${userProvider.customerName}!',
          ),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context, true);
    }
  }

  bool _showForgot = false;

  static const _cobalt = AppColors.primary;
  static const _cream = AppColors.background;

  InputDecoration _authField(String label, IconData icon, {Widget? suffix}) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(24),
      borderSide: const BorderSide(color: _cream, width: 1.5),
    );
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _cream),
      prefixIcon: Icon(icon, color: _cream),
      suffixIcon: suffix,
      filled: false,
      enabledBorder: border,
      border: border,
      focusedBorder: border.copyWith(
        borderSide: const BorderSide(color: AppColors.secondary, width: 2),
      ),
      errorBorder: border,
      focusedErrorBorder: border,
      errorStyle: const TextStyle(color: _cream),
      errorMaxLines: 3,
    );
  }

  Widget _brand(String mascot) => Column(
    children: [
      Image.asset(
        'assets/login/login_wordmark_cream.png',
        height: _responsiveBrandHeight(140, 100),
        fit: BoxFit.contain,
        semanticLabel: 'Brew & Boba Café',
      ),
      const SizedBox(height: 12),
      Image.asset(
        mascot,
        height: _responsiveBrandHeight(200, 130),
        fit: BoxFit.contain,
        excludeFromSemantics: true,
      ),
    ],
  );

  double _responsiveBrandHeight(double preferred, double minimum) {
    final availableHeight = MediaQuery.sizeOf(context).height;
    return (availableHeight * (preferred / 850)).clamp(minimum, preferred);
  }

  Widget _authButton(
    String label,
    VoidCallback? action, {
    bool loading = false,
  }) {
    final scaledLabel = MediaQuery.textScalerOf(context).scale(15);
    final buttonHeight = (scaledLabel * 2 + 22).clamp(52.0, 88.0);
    if (action == null) {
      return SizedBox(
        height: buttonHeight,
        child: ElevatedButton(
          onPressed: null,
          style: ElevatedButton.styleFrom(
            disabledBackgroundColor: _cream,
            disabledForegroundColor: _cobalt,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
        ),
      );
    }
    return CustomButton(
      text: label,
      onPressed: action,
      isLoading: loading,
      backgroundColor: _cream,
      foregroundColor: _cobalt,
      height: buttonHeight,
    );
  }

  Widget _authScaffold(Widget child) => Scaffold(
    backgroundColor: _cobalt,
    appBar: AppBar(
      backgroundColor: _cobalt,
      iconTheme: const IconThemeData(color: _cream),
      leading: IconButton(
        tooltip: 'Back',
        icon: const Icon(Icons.arrow_back),
        onPressed: () {
          if (_showForgot) {
            setState(() => _showForgot = false);
          } else if (Navigator.canPop(context)) {
            Navigator.pop(context);
          } else {
            _toggleMode(false);
          }
        },
      ),
    ),
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: child,
          ),
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();
    if (_showForgot) return _buildForgot();
    if (!_isRegister) return _buildLogin(user);
    return _authScaffold(
      Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _brand('assets/auth/mascot_signup_thumbs_up.png'),
            const SizedBox(height: 24),
            TextFormField(
              controller: _nameController,
              style: const TextStyle(color: _cream),
              textInputAction: TextInputAction.next,
              decoration: _authField('Full Name', Icons.person_outline_rounded),
              validator: (v) => (v?.trim().length ?? 0) < 2
                  ? 'Please enter your name (at least 2 characters)'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailController,
              style: const TextStyle(color: _cream),
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: _authField('Email', Icons.mail_outline_rounded),
              validator: (v) =>
                  v != null &&
                      v.trim().isNotEmpty &&
                      !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
                  ? 'Please enter a valid email address'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _phoneController,
              style: const TextStyle(color: _cream),
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: _authField('Phone Number', Icons.phone_outlined),
              validator: (v) =>
                  (v ?? '').replaceAll(RegExp(r'\D'), '').length < 8
                  ? 'Please enter a valid phone number (at least 8 digits)'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passwordController,
              style: const TextStyle(color: _cream),
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              decoration: _authField(
                'Password',
                Icons.lock_outline_rounded,
                suffix: IconButton(
                  tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: _cream,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              validator: (v) => (v?.length ?? 0) < 6
                  ? 'Password must be at least 6 characters'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirmPasswordController,
              style: const TextStyle(color: _cream),
              obscureText: _obscureConfirmPassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: _authField(
                'Confirm Password',
                Icons.lock_outline_rounded,
                suffix: IconButton(
                  tooltip: _obscureConfirmPassword
                      ? 'Show confirm password'
                      : 'Hide confirm password',
                  icon: Icon(
                    _obscureConfirmPassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: _cream,
                  ),
                  onPressed: () => setState(
                    () => _obscureConfirmPassword = !_obscureConfirmPassword,
                  ),
                ),
              ),
              validator: (v) => v != _passwordController.text
                  ? 'Passwords do not match'
                  : null,
            ),
            if (user.errorMessage != null) ...[
              const SizedBox(height: 12),
              Semantics(
                liveRegion: true,
                child: Text(
                  user.errorMessage!,
                  style: const TextStyle(color: _cream),
                ),
              ),
            ],
            const SizedBox(height: 24),
            _authButton('Sign Up', _submit, loading: user.isLoading),
            const SizedBox(height: 12),
            TextButton(
              onPressed: user.isLoading ? null : () => _toggleMode(false),
              child: const Text(
                'Already have an account? Log In',
                textAlign: TextAlign.center,
                style: TextStyle(color: _cream),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForgot() => _authScaffold(
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _brand('assets/auth/mascot_forgot_boba_toast.png'),
        const SizedBox(height: 10),
        const Text(
          'Forgot Password?',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: _cream,
            fontSize: 30,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Enter your email address to reset your password.',
          textAlign: TextAlign.center,
          style: TextStyle(color: _cream, fontSize: 16),
        ),
        const SizedBox(height: 24),
        TextFormField(
          controller: _emailController,
          style: const TextStyle(color: _cream),
          keyboardType: TextInputType.emailAddress,
          decoration: _authField('Email', Icons.mail_outline_rounded),
        ),
        const SizedBox(height: 14),
        const Text(
          'Password reset is currently unavailable. No email will be sent.',
          textAlign: TextAlign.center,
          style: TextStyle(color: _cream, fontSize: 13),
        ),
        const SizedBox(height: 18),
        _authButton('Send Reset Link', null),
        const SizedBox(height: 16),
        TextButton.icon(
          onPressed: () => setState(() => _showForgot = false),
          icon: const Icon(Icons.arrow_back, color: _cream),
          label: const Text('Back to Log In', style: TextStyle(color: _cream)),
        ),
      ],
    ),
  );

  Widget _buildLogin(UserProvider user) {
    final outline = OutlineInputBorder(
      borderRadius: BorderRadius.circular(24),
      borderSide: const BorderSide(color: AppColors.background, width: 1.5),
    );
    InputDecoration field(String label, IconData icon) => InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: AppColors.background),
      prefixIcon: Icon(icon, color: AppColors.background),
      filled: false,
      enabledBorder: outline,
      border: outline,
      focusedBorder: outline.copyWith(
        borderSide: const BorderSide(color: AppColors.secondary, width: 2),
      ),
      errorStyle: const TextStyle(color: AppColors.secondary),
      errorMaxLines: 3,
    );
    return Scaffold(
      backgroundColor: AppColors.primary,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: AppColors.background),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: AutofillGroup(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Image.asset(
                        'assets/login/login_wordmark_cream.png',
                        height: 140,
                        fit: BoxFit.contain,
                        semanticLabel: 'Brew & Boba Café',
                      ),
                      const SizedBox(height: 12),
                      Image.asset(
                        'assets/login/login_mascot_waving.png',
                        height: 200,
                        fit: BoxFit.contain,
                        excludeFromSemantics: true,
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _identifierController,
                        style: const TextStyle(color: AppColors.background),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.username],
                        decoration: field(
                          'Email or phone',
                          Icons.mail_outline_rounded,
                        ),
                        validator: (value) {
                          final input = value?.trim() ?? '';
                          if (input.isEmpty) {
                            return 'Enter your email or phone number';
                          }
                          if (input.contains('@')) {
                            if (!RegExp(
                              r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                            ).hasMatch(input)) {
                              return 'Enter a valid email address';
                            }
                          } else if (!RegExp(
                            r'^\+?[0-9 ()-]{8,20}$',
                          ).hasMatch(input)) {
                            return 'Enter a valid email or phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        style: const TextStyle(color: AppColors.background),
                        obscureText: _obscurePassword,
                        enableSuggestions: false,
                        autocorrect: false,
                        autofillHints: const [AutofillHints.password],
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        decoration:
                            field(
                              'Password',
                              Icons.lock_outline_rounded,
                            ).copyWith(
                              suffixIcon: IconButton(
                                tooltip: _obscurePassword
                                    ? 'Show password'
                                    : 'Hide password',
                                onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword,
                                ),
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined,
                                  color: AppColors.background,
                                ),
                              ),
                            ),
                        validator: (value) => value == null || value.isEmpty
                            ? 'Enter your password'
                            : null,
                      ),
                      if (user.errorMessage != null) ...[
                        const SizedBox(height: 16),
                        Semantics(
                          liveRegion: true,
                          child: Text(
                            user.errorMessage!,
                            style: const TextStyle(color: AppColors.background),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      CustomButton(
                        text: 'Log In',
                        onPressed: _submit,
                        isLoading: user.isLoading,
                        backgroundColor: AppColors.background,
                        foregroundColor: AppColors.primary,
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => setState(() => _showForgot = true),
                        child: const Text(
                          'Forgot Password?',
                          style: TextStyle(color: AppColors.background),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: user.isLoading
                            ? null
                            : () => _toggleMode(true),
                        child: const Text(
                          "Don't have an account? Sign Up",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.background),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
