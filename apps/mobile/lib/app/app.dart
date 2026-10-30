import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/errors/api_exception.dart';
import '../features/auth/presentation/auth_providers.dart';
import '../features/auth/presentation/login_page.dart';
import 'home_shell.dart';
import 'theme.dart';

class BananaApp extends StatelessWidget {
  const BananaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Banana Escolar',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return auth.when(
      loading: () => const _SplashScreen(),
      error: (error, _) => LoginPage(initialError: ApiException.describe(error)),
      data: (user) => user == null ? const LoginPage() : HomeShell(user: user),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: bananaYellow,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Text('🍌', style: TextStyle(fontSize: 40)),
            ),
            const SizedBox(height: 18),
            const Text(
              'Banana Escolar',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: ink),
            ),
            const SizedBox(height: 18),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          ],
        ),
      ),
    );
  }
}
