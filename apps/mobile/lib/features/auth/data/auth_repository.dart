import 'package:dio/dio.dart';

import '../../../core/storage/token_storage.dart';
import 'models/user.dart';
class AuthRepository {
  AuthRepository({required this.dio, required this.storage});

  final Dio dio;
  final TokenStorage storage;

  Future<User> login({required String correo, required String password}) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'correo': correo, 'password': password},
    );
    final data = response.data!;
    await storage.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<User?> restore() async {
    final accessToken = await storage.readAccessToken();
    if (accessToken == null || accessToken.isEmpty) return null;
    try {
      final response = await dio.get<Map<String, dynamic>>('/auth/me');
      return User.fromJson(response.data!);
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        await storage.clear();
      }
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await dio.post<void>('/auth/logout');
    } on DioException {
      // Se limpia la sesión local aunque falle la revocación remota.
    } finally {
      await storage.clear();
    }
  }
}
