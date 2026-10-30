import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../shared/presentation/widgets/states.dart';
import '../data/models/report.dart';
import 'report_detail_page.dart';
import 'report_providers.dart';

class NewReportPage extends ConsumerStatefulWidget {
  const NewReportPage({super.key});

  @override
  ConsumerState<NewReportPage> createState() => _NewReportPageState();
}

class _NewReportPageState extends ConsumerState<NewReportPage> {
  final _formKey = GlobalKey<FormState>();
  final _descripcionController = TextEditingController();
  final _ubicacionController = TextEditingController();
  int? _categoriaId;
  Priority _prioridad = Priority.media;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _descripcionController.dispose();
    _ubicacionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_categoriaId == null) {
      setState(() => _error = 'Selecciona una categoría.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final report = await ref.read(reportRepositoryProvider).create(
            categoriaId: _categoriaId!,
            descripcion: _descripcionController.text.trim(),
            ubicacion: _ubicacionController.text.trim(),
            prioridad: _prioridad,
          );
      ref.read(reportsPageProvider.notifier).reset();
      ref.read(reportsStatusProvider.notifier).setStatus(null);
      ref.invalidate(reportsProvider);

      if (!mounted) return;
      _formKey.currentState?.reset();
      setState(() {
        _descripcionController.clear();
        _ubicacionController.clear();
        _categoriaId = null;
        _prioridad = Priority.media;
      });
      await _showSuccess(report);
    } catch (error) {
      if (mounted) setState(() => _error = ApiException.describe(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showSuccess(Report report) async {
    final openDetail = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.check_circle_rounded, color: Color(0xFF2B8A3E), size: 40),
        title: const Text('Reporte registrado'),
        content: Text(
          'Tu incidencia quedó registrada con el folio ${report.folio}. '
          'El equipo administrativo podrá asignarla a un técnico.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cerrar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Ver detalle'),
          ),
        ],
      ),
    );

    if (openDetail == true && mounted) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => ReportDetailPage(reportId: report.id)),
      );
      ref.invalidate(reportsProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Nueva incidencia',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Describe la falla con el mayor detalle posible.',
            style: TextStyle(color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 18),
          SectionCard(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  categories.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (error, _) => Text(
                      ApiException.describe(error),
                      style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                    ),
                    data: (items) => InputDecorator(
                      decoration: const InputDecoration(labelText: 'Categoría'),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          isExpanded: true,
                          value: _categoriaId,
                          hint: const Text('Selecciona una categoría'),
                          items: items
                              .map(
                                (category) => DropdownMenuItem<int>(
                                  value: category.id,
                                  child: Text(category.nombre),
                                ),
                              )
                              .toList(),
                          onChanged: (value) => setState(() => _categoriaId = value),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _descripcionController,
                    maxLines: 5,
                    maxLength: 2000,
                    decoration: const InputDecoration(
                      labelText: 'Descripción de la falla',
                      alignLabelWithHint: true,
                      hintText: '¿Qué ocurre?, ¿desde cuándo?, ¿hay algún riesgo?',
                    ),
                    validator: (value) {
                      if ((value?.trim().length ?? 0) < 10) {
                        return 'Describe la falla con al menos 10 caracteres.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _ubicacionController,
                    decoration: const InputDecoration(
                      labelText: 'Ubicación',
                      hintText: 'Edificio, piso, aula o área',
                      prefixIcon: Icon(Icons.place_outlined),
                    ),
                    validator: (value) {
                      if ((value?.trim().length ?? 0) < 3) {
                        return 'Indica una ubicación válida.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),
                  InputDecorator(
                    decoration: const InputDecoration(labelText: 'Prioridad'),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<Priority>(
                        isExpanded: true,
                        value: _prioridad,
                        items: Priority.values
                            .map(
                              (priority) => DropdownMenuItem<Priority>(
                                value: priority,
                                child: Text(priority.label),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value != null) setState(() => _prioridad = value);
                        },
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: _loading ? null : _submit,
                    icon: _loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.2),
                          )
                        : const Icon(Icons.add_circle_outline),
                    label: Text(_loading ? 'Registrando…' : 'Registrar reporte'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEa),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFFCE588)),
            ),
            child: const Text(
              'El folio y la fecha se generan automáticamente en el servidor. '
              'Podrás adjuntar una fotografía desde el detalle del reporte en la web.',
              style: TextStyle(fontSize: 12, color: Color(0xFF8D2B0B), height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
