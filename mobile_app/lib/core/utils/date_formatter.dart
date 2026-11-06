import 'package:intl/intl.dart';

/// Clean utility for formatting order timestamps into readable text.
class DateFormatter {
  DateFormatter._();

  static final DateFormat _dateTimeFormat = DateFormat('MMM d, yyyy • h:mm a');
  static final DateFormat _timeOnlyFormat = DateFormat('h:mm a');
  static final DateFormat _dateOnlyFormat = DateFormat('MMM d, yyyy');

  static String formatFull(DateTime dateTime) {
    return _dateTimeFormat.format(dateTime.toLocal());
  }

  static String formatTime(DateTime dateTime) {
    return _timeOnlyFormat.format(dateTime.toLocal());
  }

  static String formatDate(DateTime dateTime) {
    return _dateOnlyFormat.format(dateTime.toLocal());
  }

  /// Friendly relative string: "Just now", "5m ago", "2h ago", or full date
  static String formatRelative(DateTime dateTime) {
    final Duration difference = DateTime.now().difference(dateTime.toLocal());

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    }
    return formatDate(dateTime);
  }
}
