import 'package:dio/dio.dart';

import 'models/category.dart';
import 'models/report.dart';

class ReportRepository {
  ReportRepository(this._dio);

  final Dio _dio;

  Future<PaginatedReports> list({
    int page = 1,
    int limit = 50,
    ReportStatus? status,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/reports',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (status != null) 'status': status.apiValue,
      },
    );
    return PaginatedReports.fromJson(response.data!);
  }

  Future<Report> detail(int id) async {
    final response = await _dio.get<Map<String, dynamic>>('/reports/$id');
    return Report.fromJson(response.data!);
  }

  Future<Report> create({
    required int categoriaId,
    required String descripcion,
    required String ubicacion,
    required Priority prioridad,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/reports',
      data: {
        'categoriaId': categoriaId,
        'descripcion': descripcion,
        'ubicacion': ubicacion,
        'prioridad': prioridad.apiValue,
      },
    );
    return Report.fromJson(response.data!);
  }

  Future<List<Category>> categories() async {
    final response = await _dio.get<List<dynamic>>('/categories');
    return (response.data ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Category.fromJson)
        .toList(growable: false);
  }

  Future<Report> changeStatus(int id, ReportStatus status) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/reports/$id/status',
      data: {'estado': status.apiValue},
    );
    return Report.fromJson(response.data!);
  }

  Future<Report> resolve(
    int id, {
    required String descripcion,
    String? observaciones,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/reports/$id/solution',
      data: {
        'descripcion': descripcion,
        if (observaciones != null && observaciones.isNotEmpty)
          'observaciones': observaciones,
      },
    );
    return Report.fromJson(response.data!);
  }
}
