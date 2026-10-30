import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/models/category.dart';
import '../data/models/report.dart';
import '../data/report_repository.dart';

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  return ReportRepository(ref.watch(dioProvider));
});

final categoriesProvider = FutureProvider<List<Category>>((ref) {
  return ref.watch(reportRepositoryProvider).categories();
});

class ReportsPageController extends Notifier<int> {
  @override
  int build() => 1;

  void setPage(int page) => state = page;

  void reset() => state = 1;
}

final reportsPageProvider =
    NotifierProvider<ReportsPageController, int>(ReportsPageController.new);

class ReportsStatusController extends Notifier<ReportStatus?> {
  @override
  ReportStatus? build() => null;

  void setStatus(ReportStatus? status) => state = status;
}

final reportsStatusProvider =
    NotifierProvider<ReportsStatusController, ReportStatus?>(
  ReportsStatusController.new,
);

final reportsProvider = FutureProvider<PaginatedReports>((ref) {
  final page = ref.watch(reportsPageProvider);
  final status = ref.watch(reportsStatusProvider);
  return ref.watch(reportRepositoryProvider).list(page: page, status: status);
});

final reportDetailProvider = FutureProvider.family<Report, int>((ref, id) {
  return ref.watch(reportRepositoryProvider).detail(id);
});
