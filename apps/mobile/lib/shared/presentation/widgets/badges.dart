import 'package:flutter/material.dart';

import '../../../features/reports/data/models/report.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final ReportStatus status;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (status) {
      ReportStatus.pendiente => (const Color(0xFFFEF3C7), const Color(0xFF92400E)),
      ReportStatus.enProceso => (const Color(0xFFE0F2FE), const Color(0xFF075985)),
      ReportStatus.completado => (const Color(0xFFD1FAE5), const Color(0xFF065F46)),
    };
    return _Pill(label: status.label, background: background, foreground: foreground);
  }
}

class PriorityChip extends StatelessWidget {
  const PriorityChip({super.key, required this.priority});

  final Priority priority;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (priority) {
      Priority.alta => (const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
      Priority.media => (const Color(0xFFFFEDD5), const Color(0xFF9A3412)),
      Priority.baja => (const Color(0xFFF1F5F9), const Color(0xFF475569)),
    };
    return _Pill(label: 'Prioridad ${priority.label}', background: background, foreground: foreground);
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.background, required this.foreground});

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
