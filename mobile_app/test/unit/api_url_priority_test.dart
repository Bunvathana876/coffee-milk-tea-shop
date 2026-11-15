import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/config/app_config.dart';
import 'package:mobile_app/data/services/api_service.dart';
import 'package:mobile_app/data/services/local_storage_service.dart';
import 'package:mobile_app/providers/user_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineHealthApi extends ApiService {
  OfflineHealthApi({required super.baseUrl});

  @override
  Future<bool> checkHealth() async => false;
}

void main() {
  test('explicit URL wins over saved URL; defaults match simulators', () {
    expect(
      AppConfig.resolveApiBaseUrl(
        explicitApiUrl: 'http://127.0.0.1:8003/',
        savedCustomApiUrl: 'http://localhost:8000',
        releaseMode: false,
      ),
      'http://127.0.0.1:8003',
    );
    expect(
      AppConfig.resolveApiBaseUrl(
        explicitApiUrl: '',
        savedCustomApiUrl: 'http://localhost:8000',
        releaseMode: false,
        web: false,
        android: false,
      ),
      'http://127.0.0.1:8003',
    );
    expect(
      AppConfig.resolveApiBaseUrl(
        explicitApiUrl: '',
        releaseMode: false,
        web: false,
        android: false,
      ),
      'http://127.0.0.1:8003',
    );
    expect(
      AppConfig.resolveApiBaseUrl(
        explicitApiUrl: '',
        releaseMode: false,
        web: false,
        android: true,
      ),
      'http://10.0.2.2:8003',
    );
  });

  test('invalid saved URL is ignored, invalid explicit URL fails', () {
    for (final invalid in [
      'not-a-url',
      'http://user:pass@localhost:8003',
      'http://localhost:8003?token=x',
      'ftp://localhost:8003',
    ]) {
      expect(AppConfig.normalizeApiBaseUrl(invalid), isNull);
      expect(
        AppConfig.resolveApiBaseUrl(
          explicitApiUrl: '',
          savedCustomApiUrl: invalid,
          releaseMode: false,
          web: false,
          android: false,
        ),
        'http://127.0.0.1:8003',
      );
    }
    expect(
      () => AppConfig.resolveApiBaseUrl(
        explicitApiUrl: 'not-a-url',
        releaseMode: false,
      ),
      throwsStateError,
    );
    expect(
      () => AppConfig.resolveApiBaseUrl(
        explicitApiUrl: '',
        savedCustomApiUrl: 'http://localhost:8000',
        releaseMode: true,
      ),
      throwsStateError,
    );
    expect(
      () => AppConfig.resolveApiBaseUrl(
        explicitApiUrl: 'http://api.example.test',
        releaseMode: true,
      ),
      throwsStateError,
    );
    expect(
      AppConfig.resolveApiBaseUrl(
        explicitApiUrl: 'https://api.example.test',
        releaseMode: true,
      ),
      'https://api.example.test',
    );
  });

  test('startup leaves saved user data intact', () async {
    SharedPreferences.setMockInitialValues({
      'custom_api_url': 'http://localhost:8000',
      'saved_cart_items': '[]',
      'saved_favorite_items': '[]',
      'customer_name': 'Sam',
    });
    final storage = await LocalStorageService.init();
    final api = OfflineHealthApi(
      baseUrl: AppConfig.resolveApiBaseUrl(
        savedCustomApiUrl: storage.getCustomApiUrl(),
      ),
    );
    final user = UserProvider(localStorageService: storage, apiService: api);
    addTearDown(user.dispose);
    final prefs = await SharedPreferences.getInstance();

    final expectedUrl = AppConfig.configuredApiBaseUrl.isNotEmpty
        ? AppConfig.configuredApiBaseUrl
        : AppConfig.resolveApiBaseUrl(
            savedCustomApiUrl: 'http://localhost:8000',
          );
    expect(api.baseUrl, expectedUrl);
    expect(user.apiUrl, expectedUrl);
    expect(storage.getCustomApiUrl(), 'http://localhost:8000');
    expect(prefs.getString('saved_cart_items'), '[]');
    expect(prefs.getString('saved_favorite_items'), '[]');
    expect(prefs.getString('customer_name'), 'Sam');
  });
}
