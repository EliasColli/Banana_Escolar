import 'package:intl/intl.dart';

final _date = DateFormat('d MMM y', 'es');
final _dateTime = DateFormat("d MMM y '·' HH:mm", 'es');

String formatDate(DateTime? value) => value == null ? '—' : _date.format(value.toLocal());

String formatDateTime(DateTime? value) =>
    value == null ? '—' : _dateTime.format(value.toLocal());
