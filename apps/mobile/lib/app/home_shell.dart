import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/data/models/user.dart';
import '../features/profile/presentation/profile_page.dart';
import '../features/reports/presentation/new_report_page.dart';
import '../features/reports/presentation/report_providers.dart';
import '../features/reports/presentation/reports_page.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.user});

  final User user;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;
  late final List<_Tab> _tabs = _buildTabs();

  List<_Tab> _buildTabs() {
    final reportsTitle = switch (widget.user.rol) {
      UserRole.admin => 'Historial general',
      UserRole.tecnico => 'Mi bandeja',
      UserRole.usuario => 'Mis reportes',
    };

    if (widget.user.rol == UserRole.tecnico) {
      return [
        _Tab(
          title: reportsTitle,
          icon: Icons.inbox_outlined,
          selectedIcon: Icons.inbox_rounded,
          page: ReportsPage(user: widget.user),
        ),
        _Tab(
          title: 'Mi perfil',
          icon: Icons.person_outline,
          selectedIcon: Icons.person_rounded,
          page: ProfilePage(user: widget.user),
        ),
      ];
    }

    return [
      _Tab(
        title: reportsTitle,
        icon: Icons.list_alt_outlined,
        selectedIcon: Icons.list_alt_rounded,
        page: ReportsPage(user: widget.user),
      ),
      _Tab(
        title: 'Nuevo reporte',
        icon: Icons.add_circle_outline,
        selectedIcon: Icons.add_circle_rounded,
        page: const NewReportPage(),
      ),
      _Tab(
        title: 'Mi perfil',
        icon: Icons.person_outline,
        selectedIcon: Icons.person_rounded,
        page: ProfilePage(user: widget.user),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _tabs[_index].title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            Text(
              widget.user.nombre,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          if (_index == 0)
            IconButton(
              tooltip: 'Actualizar',
              onPressed: () => ref.invalidate(reportsProvider),
              icon: const Icon(Icons.refresh_rounded),
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: _tabs.map((tab) => tab.page).toList(growable: false),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: _tabs
            .map(
              (tab) => NavigationDestination(
                icon: Icon(tab.icon),
                selectedIcon: Icon(tab.selectedIcon),
                label: tab.title,
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}

class _Tab {
  const _Tab({
    required this.title,
    required this.icon,
    required this.selectedIcon,
    required this.page,
  });

  final String title;
  final IconData icon;
  final IconData selectedIcon;
  final Widget page;
}
