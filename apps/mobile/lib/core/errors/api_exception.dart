import 'package:dio/dio.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;

  factory ApiException.fromDio(DioException error) {
    final data = error.response?.data;
    String message = 'No fue posible completar la solicitud.';

    if (data is Map<String, dynamic>) {
      final raw = data['message'];
      if (raw is String) {
        message = raw;
      } else if (raw is List) {
        message = raw.join(', ');
      } else if (data['error'] is String) {
        message = data['error'] as String;
      }
    } else if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      message = 'No se pudo conectar con el servidor. Revisa tu red.';
    } else if (error.type == DioExceptionType.receiveTimeout) {
      message = 'El servidor tardó demasiado en responder.';
    } else if (error.message != null && error.response == null) {
      message = error.message!;
    }

    return ApiException(message, statusCode: error.response?.statusCode);
  }

  static String describe(Object error) {
    if (error is ApiException) return error.message;
    if (error is DioException) return ApiException.fromDio(error).message;
    return error.toString();
  }
}
