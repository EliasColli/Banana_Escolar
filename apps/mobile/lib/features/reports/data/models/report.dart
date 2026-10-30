enum ReportStatus {
  pendiente,
  enProceso,
  completado;

  static ReportStatus fromString(String value) {
    switch (value) {
      case 'en_proceso':
        return ReportStatus.enProceso;
      case 'completado':
        return ReportStatus.completado;
      default:
        return ReportStatus.pendiente;
    }
  }

  String get apiValue => switch (this) {
        ReportStatus.pendiente => 'pendiente',
        ReportStatus.enProceso => 'en_proceso',
        ReportStatus.completado => 'completado',
      };

  String get label => switch (this) {
        ReportStatus.pendiente => 'Pendiente',
        ReportStatus.enProceso => 'En proceso',
        ReportStatus.completado => 'Completado',
      };
}

enum Priority {
  baja,
  media,
  alta;

  static Priority fromString(String value) {
    switch (value) {
      case 'alta':
        return Priority.alta;
      case 'baja':
        return Priority.baja;
      default:
        return Priority.media;
    }
  }

  String get apiValue => switch (this) {
        Priority.baja => 'baja',
        Priority.media => 'media',
        Priority.alta => 'alta',
      };

  String get label => switch (this) {
        Priority.baja => 'Baja',
        Priority.media => 'Media',
        Priority.alta => 'Alta',
      };
}

class Attachment {
  const Attachment({
    required this.id,
    required this.url,
    required this.mimeType,
    required this.sizeBytes,
  });

  final int id;
  final String url;
  final String mimeType;
  final int sizeBytes;

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: (json['id'] as num).toInt(),
      url: json['url'] as String? ?? '',
      mimeType: json['mimeType'] as String? ?? 'image/jpeg',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
    );
  }
}

class Solution {
  const Solution({
    required this.descripcion,
    required this.observaciones,
    required this.resueltoEn,
    required this.tecnicoNombre,
  });

  final String descripcion;
  final String? observaciones;
  final DateTime? resueltoEn;
  final String? tecnicoNombre;

  factory Solution.fromJson(Map<String, dynamic> json) {
    final tecnico = json['tecnico'];
    return Solution(
      descripcion: json['descripcion'] as String? ?? '',
      observaciones: json['observaciones'] as String?,
      resueltoEn: DateTime.tryParse(json['resueltoEn'] as String? ?? ''),
      tecnicoNombre: tecnico is Map<String, dynamic> ? tecnico['nombre'] as String? : null,
    );
  }
}

class Report {
  const Report({
    required this.id,
    required this.folio,
    required this.usuarioId,
    required this.categoriaId,
    required this.tecnicoId,
    required this.descripcion,
    required this.ubicacion,
    required this.prioridad,
    required this.estado,
    required this.creadoEn,
    required this.categoriaNombre,
    required this.solicitanteNombre,
    required this.tecnicoNombre,
    required this.solucion,
    required this.adjuntos,
  });

  final int id;
  final String folio;
  final int usuarioId;
  final int categoriaId;
  final int? tecnicoId;
  final String descripcion;
  final String ubicacion;
  final Priority prioridad;
  final ReportStatus estado;
  final DateTime? creadoEn;
  final String? categoriaNombre;
  final String? solicitanteNombre;
  final String? tecnicoNombre;
  final Solution? solucion;
  final List<Attachment> adjuntos;

  factory Report.fromJson(Map<String, dynamic> json) {
    final categoria = json['categoria'];
    final usuario = json['usuario'];
    final tecnico = json['tecnico'];
    final solucion = json['solucion'];
    final adjuntos = json['adjuntos'];

    return Report(
      id: (json['id'] as num).toInt(),
      folio: json['folio'] as String,
      usuarioId: (json['usuarioId'] as num).toInt(),
      categoriaId: (json['categoriaId'] as num).toInt(),
      tecnicoId: (json['tecnicoId'] as num?)?.toInt(),
      descripcion: json['descripcion'] as String? ?? '',
      ubicacion: json['ubicacion'] as String? ?? '',
      prioridad: Priority.fromString(json['prioridad'] as String? ?? 'media'),
      estado: ReportStatus.fromString(json['estado'] as String? ?? 'pendiente'),
      creadoEn: DateTime.tryParse(json['creadoEn'] as String? ?? ''),
      categoriaNombre: categoria is Map<String, dynamic> ? categoria['nombre'] as String? : null,
      solicitanteNombre: usuario is Map<String, dynamic> ? usuario['nombre'] as String? : null,
      tecnicoNombre: tecnico is Map<String, dynamic> ? tecnico['nombre'] as String? : null,
      solucion: solucion is Map<String, dynamic> ? Solution.fromJson(solucion) : null,
      adjuntos: adjuntos is List
          ? adjuntos
              .whereType<Map<String, dynamic>>()
              .map(Attachment.fromJson)
              .toList(growable: false)
          : const [],
    );
  }
}

class PaginatedReports {
  const PaginatedReports({
    required this.data,
    required this.page,
    required this.totalPages,
    required this.total,
  });

  final List<Report> data;
  final int page;
  final int totalPages;
  final int total;

  factory PaginatedReports.fromJson(Map<String, dynamic> json) {
    final meta = json['meta'] as Map<String, dynamic>? ?? const {};
    final data = json['data'];
    return PaginatedReports(
      data: data is List
          ? data.whereType<Map<String, dynamic>>().map(Report.fromJson).toList(growable: false)
          : const [],
      page: (meta['page'] as num?)?.toInt() ?? 1,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
      total: (meta['total'] as num?)?.toInt() ?? 0,
    );
  }
}
