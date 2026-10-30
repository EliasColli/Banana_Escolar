import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/auth_repository.dart';
import '../data/models/user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dio: ref.watch(dioProvider),
    storage: ref.watch(tokenStorageProvider),
  );
});

final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(
  AuthController.new,
);

class AuthController extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async {
    return ref.watch(authRepositoryProvider).restore();
  }

  Future<void> login({required String correo, required String password}) async {
    final user = await ref
        .read(authRepositoryProvider)
        .login(correo: correo, password: password);
    state = AsyncData(user);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}
