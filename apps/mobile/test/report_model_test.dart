import 'package:banana_escolar/features/reports/data/models/report.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Report.fromJson interpreta estados, prioridad y solución', () {
    final report = Report.fromJson({
      'id': 42,
      'folio': 'REP-2026-00042',
      'usuarioId': 7,
      'categoriaId': 3,
      'tecnicoId': 9,
      'descripcion': 'Fuga de agua en el lavabo',
      'ubicacion': 'Edificio A',
      'prioridad': 'alta',
      'estado': 'completado',
      'creadoEn': '2026-03-01T10:00:00.000Z',
      'categoria': {'id': 3, 'nombre': 'Plomería'},
      'usuario': {'id': 7, 'nombre': 'Ana', 'correo': 'usuario1@banana.local'},
      'tecnico': {'id': 9, 'nombre': 'Luis'},
      'solucion': {
        'id': 1,
        'reporteId': 42,
        'descripcion': 'Se reemplazó el empaque.',
        'observaciones': null,
        'resueltoEn': '2026-03-02T10:00:00.000Z',
        'tecnico': {'id': 9, 'nombre': 'Luis'},
      },
      'adjuntos': [],
    });

    expect(report.folio, 'REP-2026-00042');
    expect(report.estado, ReportStatus.completado);
    expect(report.prioridad, Priority.alta);
    expect(report.categoriaNombre, 'Plomería');
    expect(report.solucion?.tecnicoNombre, 'Luis');
    expect(report.creadoEn?.toUtc().year, 2026);
  });

  test('PaginatedReports interpreta la metadata', () {
    final page = PaginatedReports.fromJson({
      'data': [],
      'meta': {'page': 2, 'limit': 50, 'total': 130, 'totalPages': 3},
    });

    expect(page.page, 2);
    expect(page.total, 130);
    expect(page.totalPages, 3);
    expect(page.data, isEmpty);
  });
}
