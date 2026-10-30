import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/presentation/widgets/badges.dart';
import '../../../shared/presentation/widgets/states.dart';
import '../../auth/data/models/user.dart';
import '../../auth/presentation/auth_providers.dart';
import '../data/models/report.dart';
import 'report_providers.dart';

class ReportDetailPage extends ConsumerStatefulWidget {
  const ReportDetailPage({super.key, required this.reportId});

  final int reportId;

  @override
  ConsumerState<ReportDetailPage> createState() => _ReportDetailPageState();
}

class _ReportDetailPageState extends ConsumerState<ReportDetailPage> {
  bool _busy = false;

  Future<void> _changeStatus(ReportStatus status) async {
    setState(() => _busy = true);
    try {
      await ref.read(reportRepositoryProvider).changeStatus(widget.reportId, status);
      ref.invalidate(reportDetailProvider(widget.reportId));
      ref.invalidate(reportsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reporte marcado en proceso.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiException.describe(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resolve() async {
    final result = await showDialog<({String descripcion, String observaciones})>(
      context: context,
      builder: (_) => const _SolutionDialog(),
    );
    if (result == null) return;

    setState(() => _busy = true);
    try {
      await ref.read(reportRepositoryProvider).resolve(
            widget.reportId,
            descripcion: result.descripcion,
            observaciones: result.observaciones,
          );
      ref.invalidate(reportDetailProvider(widget.reportId));
      ref.invalidate(reportsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solución registrada. Reporte completado.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiException.describe(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncReport = ref.watch(reportDetailProvider(widget.reportId));
    final user = ref.watch(authControllerProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del reporte')),
      body: asyncReport.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(
          message: ApiException.describe(error),
          onRetry: () => ref.invalidate(reportDetailProvider(widget.reportId)),
        ),
        data: (report) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(reportDetailProvider(widget.reportId));
            await ref.read(reportDetailProvider(widget.reportId).future);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Header(report: report),
              const SizedBox(height: 14),
              SectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Descripción',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      report.descripcion,
                      style: const TextStyle(fontSize: 15, height: 1.45, color: Color(0xFF1E293B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              SectionCard(
                child: Column(
                  children: [
                    InfoRow(label: 'Ubicación', value: report.ubicacion, icon: Icons.place_outlined),
                    InfoRow(
                      label: 'Solicitante',
                      value: report.solicitanteNombre ?? '—',
                      icon: Icons.person_outline,
                    ),
                    InfoRow(
                      label: 'Técnico',
                      value: report.tecnicoNombre ?? 'Sin asignar',
                      icon: Icons.build_outlined,
                    ),
                    InfoRow(
                      label: 'Creado',
                      value: formatDateTime(report.creadoEn),
                      icon: Icons.calendar_today_outlined,
                    ),
                    if (report.solucion != null)
                      InfoRow(
                        label: 'Resuelto',
                        value: formatDateTime(report.solucion!.resueltoEn),
                        icon: Icons.check_circle_outline,
                      ),
                  ],
                ),
              ),
              if (user != null) ...[
                const SizedBox(height: 14),
                _Actions(
                  report: report,
                  user: user,
                  busy: _busy,
                  onStart: () => _changeStatus(ReportStatus.enProceso),
                  onResolve: _resolve,
                ),
              ],
              if (report.solucion != null) ...[
                const SizedBox(height: 14),
                SectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.check_circle_rounded, color: Color(0xFF2B8A3E)),
                          SizedBox(width: 8),
                          Text(
                            'Solución registrada',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF065F46),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        report.solucion!.descripcion,
                        style: const TextStyle(height: 1.45, color: Color(0xFF1E293B)),
                      ),
                      if (report.solucion!.observaciones != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Observaciones: ${report.solucion!.observaciones}',
                          style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        'Atendido por ${report.solucion!.tecnicoNombre ?? report.tecnicoNombre ?? '—'}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
              ],
              if (report.adjuntos.isNotEmpty) ...[
                const SizedBox(height: 14),
                SectionCard(
                  child: Row(
                    children: [
                      const Icon(Icons.photo_outlined, color: Color(0xFF64748B)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Este reporte tiene ${report.adjuntos.length} fotografía adjunta. '
                          'Puedes consultarla desde la versión web.',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.report});

  final Report report;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
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
                    letterSpacing: 0.5,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
              StatusChip(status: report.estado),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            report.categoriaNombre ?? 'Reporte',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              PriorityChip(priority: report.prioridad),
              const Spacer(),
              Text(
                formatDate(report.creadoEn),
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Actions extends StatelessWidget {
  const _Actions({
    required this.report,
    required this.user,
    required this.busy,
    required this.onStart,
    required this.onResolve,
  });

  final Report report;
  final User user;
  final bool busy;
  final VoidCallback onStart;
  final VoidCallback onResolve;

  @override
  Widget build(BuildContext context) {
    final isAssigned = user.rol == UserRole.tecnico && report.tecnicoId == user.id;
    final canOperate = isAssigned || user.rol == UserRole.admin;

    if (!canOperate || report.estado == ReportStatus.completado) return const SizedBox.shrink();

    if (report.estado == ReportStatus.pendiente) {
      return SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Iniciar atención',
              style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Text(
              report.tecnicoId == null
                  ? 'El reporte aún no tiene técnico asignado. Un administrador debe asignarlo.'
                  : 'Marca el reporte en proceso cuando comiences a trabajar en él.',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: busy || report.tecnicoId == null ? null : onStart,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Marcar en proceso'),
            ),
          ],
        ),
      );
    }

    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Registrar solución',
            style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Al guardar, el reporte se completará de forma atómica.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: busy ? null : onResolve,
            icon: const Icon(Icons.task_alt_rounded),
            label: const Text('Registrar solución y completar'),
          ),
        ],
      ),
    );
  }
}

class _SolutionDialog extends StatefulWidget {
  const _SolutionDialog();

  @override
  State<_SolutionDialog> createState() => _SolutionDialogState();
}

class _SolutionDialogState extends State<_SolutionDialog> {
  final _descripcion = TextEditingController();
  final _observaciones = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _descripcion.dispose();
    _observaciones.dispose();
    super.dispose();
  }

  void _save() {
    final description = _descripcion.text.trim();
    if (description.length < 10) {
      setState(() => _error = 'Describe la solución con al menos 10 caracteres.');
      return;
    }
    Navigator.of(context).pop((
      descripcion: description,
      observaciones: _observaciones.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Registrar solución'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _descripcion,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Solución aplicada',
                errorText: _error,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _observaciones,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Observaciones (opcional)',
                alignLabelWithHint: true,
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _save, child: const Text('Guardar')),
      ],
    );
  }
}
