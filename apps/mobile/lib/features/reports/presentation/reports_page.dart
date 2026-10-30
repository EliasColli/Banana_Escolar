import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/presentation/widgets/badges.dart';
import '../../../shared/presentation/widgets/states.dart';
import '../../auth/data/models/user.dart';
import '../data/models/report.dart';
import 'report_detail_page.dart';
import 'report_providers.dart';

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key, required this.user});

  final User user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(reportsProvider);
    final status = ref.watch(reportsStatusProvider);

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          color: Colors.white,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _FilterChip(
                  label: 'Todos',
                  selected: status == null,
                  onTap: () {
                    ref.read(reportsStatusProvider.notifier).setStatus(null);
                    ref.read(reportsPageProvider.notifier).reset();
                  },
                ),
                const SizedBox(width: 8),
                ...ReportStatus.values.map(
                  (value) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: _FilterChip(
                      label: value.label,
                      selected: status == value,
                      onTap: () {
                        ref.read(reportsStatusProvider.notifier).setStatus(value);
                        ref.read(reportsPageProvider.notifier).reset();
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: reports.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => ErrorView(
              message: ApiException.describe(error),
              onRetry: () => ref.invalidate(reportsProvider),
            ),
            data: (data) {
              if (data.data.isEmpty) {
                return EmptyView(
                  title: user.rol == UserRole.tecnico
                      ? 'No tienes reportes asignados'
                      : 'Aún no hay reportes',
                  message: user.rol == UserRole.usuario
                      ? 'Registra una incidencia desde la pestaña Nuevo.'
                      : 'Prueba con otro filtro de estado.',
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(reportsProvider);
                  await ref.read(reportsProvider.future);
                },
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: data.data.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    if (index == data.data.length) {
                      return _Pagination(
                        page: data.page,
                        totalPages: data.totalPages,
                        total: data.total,
                        onChange: (value) =>
                            ref.read(reportsPageProvider.notifier).setPage(value),
                      );
                    }
                    final report = data.data[index];
                    return _ReportCard(
                      report: report,
                      user: user,
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => ReportDetailPage(reportId: report.id),
                          ),
                        );
                        ref.invalidate(reportsProvider);
                        ref.invalidate(reportDetailProvider(report.id));
                      },
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: selected ? const Color(0xFF8D2B0B) : const Color(0xFF475569),
      ),
      selectedColor: const Color(0xFFFFF3C4),
      checkmarkColor: const Color(0xFFB44D12),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.report, required this.user, required this.onTap});

  final Report report;
  final User user;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      report.folio,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  StatusChip(status: report.estado),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                report.descripcion,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.place_outlined, size: 15, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      report.ubicacion,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  PriorityChip(priority: report.prioridad),
                  const SizedBox(width: 8),
                  Text(
                    report.categoriaNombre ?? 'Sin categoría',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const Spacer(),
                  Text(
                    formatDate(report.creadoEn),
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
              if (user.rol == UserRole.tecnico && report.solicitanteNombre != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Solicita: ${report.solicitanteNombre}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Pagination extends StatelessWidget {
  const _Pagination({
    required this.page,
    required this.totalPages,
    required this.total,
    required this.onChange,
  });

  final int page;
  final int totalPages;
  final int total;
  final ValueChanged<int> onChange;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            onPressed: page > 1 ? () => onChange(page - 1) : null,
            icon: const Icon(Icons.chevron_left),
          ),
          Text(
            'Página $page de ${totalPages.clamp(1, 9999)} · $total',
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          IconButton(
            onPressed: page < totalPages ? () => onChange(page + 1) : null,
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
    );
  }
}
