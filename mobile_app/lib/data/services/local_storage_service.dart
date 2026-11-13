import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart_item_model.dart';

/// Clean wrapper around SharedPreferences for persistent customer data.
class LocalStorageService {
  static const String _keyCustomerName = 'customer_name';
  static const String _keyCustomerPhone = 'customer_phone';
  static const String _keyCustomerEmail = 'customer_email';
  static const String _keyAuthToken = 'customer_auth_token';
  static const String _keyLocalAccounts = 'local_customer_accounts';
  static const String _keyCustomApiUrl = 'custom_api_url';
  static const String _keyCartItems = 'saved_cart_items';
  static const String _keyRecentOrderRefs = 'recent_order_refs';
  static const String _keyFavoriteItems = 'saved_favorite_items';
  static const String _keyLoyaltyStamps = 'loyalty_stamps_';
  static const String _keyConfirmedLoyaltyStamps = 'confirmed_loyalty_stamps_';
  static const String _keyAccountPhone = 'server_account_phone';
  static const String _keyPendingOrder = 'pending_server_order';

  final SharedPreferences _prefs;

  LocalStorageService(this._prefs);

  static Future<LocalStorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalStorageService(prefs);
  }

  // Customer Name
  String? getCustomerName() => _prefs.getString(_keyCustomerName);
  Future<bool> setCustomerName(String name) =>
      _prefs.setString(_keyCustomerName, name);

  // Customer Phone
  String? getCustomerPhone() => _prefs.getString(_keyCustomerPhone);
  Future<bool> setCustomerPhone(String phone) =>
      _prefs.setString(_keyCustomerPhone, phone);

  // Customer Email
  String? getCustomerEmail() => _prefs.getString(_keyCustomerEmail);
  Future<bool> setCustomerEmail(String email) =>
      _prefs.setString(_keyCustomerEmail, email);

  // Customer Auth Token
  String? getAuthToken() => _prefs.getString(_keyAuthToken);
  Future<bool> setAuthToken(String token) =>
      _prefs.setString(_keyAuthToken, token);
  Future<bool> clearCustomerAuth() async {
    await _prefs.remove(_keyAuthToken);
    await _prefs.remove(_keyCustomerName);
    await _prefs.remove(_keyCustomerPhone);
    await _prefs.remove(_keyCustomerEmail);
    await _prefs.remove(_keyAccountPhone);
    return true;
  }

  String? getAccountPhone() => _prefs.getString(_keyAccountPhone);
  Future<bool> setAccountPhone(String phone) =>
      _prefs.setString(_keyAccountPhone, phone);

  /// Stores one unresolved submission. Its payload is a local cart fingerprint,
  /// not a server order or a payment receipt.
  Map<String, String>? getPendingOrder() {
    final raw = _prefs.getString(_keyPendingOrder);
    if (raw == null) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map ||
          value['identity'] is! String ||
          value['key'] is! String) {
        return null;
      }
      return {
        'identity': value['identity'] as String,
        'key': value['key'] as String,
      };
    } catch (_) {
      return null;
    }
  }

  Future<bool> savePendingOrder(String identity, String key) =>
      _prefs.setString(
        _keyPendingOrder,
        jsonEncode({'identity': identity, 'key': key}),
      );
  Future<bool> clearPendingOrder() => _prefs.remove(_keyPendingOrder);

  Future<bool> clearPendingOrderIfMatches(String identity, String key) {
    final pending = getPendingOrder();
    if (pending?['identity'] != identity || pending?['key'] != key) {
      return Future.value(false);
    }
    return clearPendingOrder();
  }

  // Offline Fallback Account Registry (when server is unreachable)
  List<Map<String, dynamic>> getLocalAccounts() {
    final raw = _prefs.getString(_keyLocalAccounts);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveLocalAccounts(List<Map<String, dynamic>> accounts) {
    return _prefs.setString(_keyLocalAccounts, jsonEncode(accounts));
  }

  // Custom API URL
  String? getCustomApiUrl() => _prefs.getString(_keyCustomApiUrl);
  Future<bool> setCustomApiUrl(String url) =>
      _prefs.setString(_keyCustomApiUrl, url);
  Future<bool> clearCustomApiUrl() => _prefs.remove(_keyCustomApiUrl);

  // Cart Persistence
  List<CartItemModel> getCartItems() {
    final rawJson = _prefs.getString(_keyCartItems);
    if (rawJson == null || rawJson.isEmpty) return [];
    try {
      final List<dynamic> list = jsonDecode(rawJson) as List<dynamic>;
      return list
          .map((item) => CartItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveCartItems(List<CartItemModel> items) {
    final list = items.map((i) => i.toJson()).toList();
    return _prefs.setString(_keyCartItems, jsonEncode(list));
  }

  // Recent Order Numbers / Refs (for instant tracking lookup)
  List<String> getRecentOrderRefs() {
    return _prefs.getStringList(_keyRecentOrderRefs) ?? [];
  }

  Future<bool> addRecentOrderRef(String orderRef) async {
    final list = getRecentOrderRefs();
    if (!list.contains(orderRef)) {
      list.insert(0, orderRef);
      if (list.length > 20) {
        list.removeRange(20, list.length);
      }
      return _prefs.setStringList(_keyRecentOrderRefs, list);
    }
    return true;
  }

  // Favorite Customized Items Persistence
  List<CartItemModel> getFavoriteItems() {
    final rawJson = _prefs.getString(_keyFavoriteItems);
    if (rawJson == null || rawJson.isEmpty) return [];
    try {
      final List<dynamic> list = jsonDecode(rawJson) as List<dynamic>;
      return list
          .map((item) => CartItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveFavoriteItems(List<CartItemModel> items) {
    final list = items.map((i) => i.toJson()).toList();
    return _prefs.setString(_keyFavoriteItems, jsonEncode(list));
  }

  // Loyalty Points / Stamps (linked to customer phone number)
  int getLoyaltyStamps(String phone) {
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.isEmpty) return 0;
    return _prefs.getInt('$_keyLoyaltyStamps$cleanPhone') ?? 0;
  }

  Future<bool> setLoyaltyStamps(String phone, int stamps) {
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.isEmpty) return Future.value(false);
    return _prefs.setInt('$_keyLoyaltyStamps$cleanPhone', stamps);
  }

  int? getConfirmedLoyaltyStamps(String phone) {
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.isEmpty) return null;
    return _prefs.getInt('$_keyConfirmedLoyaltyStamps$cleanPhone');
  }

  Future<bool> setConfirmedLoyaltyStamps(String phone, int stamps) {
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.isEmpty || stamps < 0) return Future.value(false);
    return _prefs.setInt('$_keyConfirmedLoyaltyStamps$cleanPhone', stamps);
  }

  Future<bool> addLoyaltyStamps(String phone, int additionalStamps) {
    final current = getLoyaltyStamps(phone);
    return setLoyaltyStamps(phone, current + additionalStamps);
  }
}
