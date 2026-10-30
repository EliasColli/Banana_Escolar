class AppConfig {
  /// Emulador Android: 10.0.2.2 apunta al host.
  /// Pasar con --dart-define=API_BASE_URL=http://192.168.1.10:3000/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/v1',
  );
}
