import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../core/config/app_config.dart';
import '../../../shared/presentation/widgets/states.dart';
import '../../auth/data/models/user.dart';
import '../../auth/presentation/auth_providers.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key, required this.user});

  final User user;

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Deseas salir de tu cuenta en este dispositivo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initials = user.nombre
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((part) => part.isEmpty ? '' : part[0].toUpperCase())
        .join();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: ink,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Row(
            children: [
              Container(
                width: 62,
                height: 62,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: bananaYellow,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  initials.isEmpty ? '🍌' : initials,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.nombre,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(user.correo, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white12,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        user.rol.label,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SectionCard(
          child: Column(
            children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Aplicación',
                  style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
              ),
              const SizedBox(height: 8),
              InfoRow(label: 'Versión', value: '1.0.0'),
              InfoRow(label: 'API', value: AppConfig.apiBaseUrl),
              const InfoRow(label: 'Datos', value: 'Sintéticos · semilla 2026'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Seguridad',
                style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Los tokens se guardan en el almacenamiento seguro del dispositivo y se renuevan '
                'automáticamente. La aplicación solo se comunica con la API NestJS; nunca con MySQL.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.45),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: () => _logout(context, ref),
                icon: const Icon(Icons.logout_rounded, color: Color(0xFFB91C1C)),
                label: const Text('Cerrar sesión', style: TextStyle(color: Color(0xFFB91C1C))),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Banana Escolar · Gestión de incidencias escolares',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
