import '../utils/supabase_service.dart';

class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();

  final SupabaseService _supabaseService = SupabaseService();

  // Track user action
  Future<void> trackAction({
    required String actionType,
    String? projectId,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final client = await _supabaseService.client;
      final userId = _supabaseService.currentUser?.id;

      if (userId == null) {
        return; // Don't track for unauthenticated users
      }

      final analyticsData = {
        'user_id': userId,
        'action_type': actionType,
        'project_id': projectId,
        'metadata': metadata ?? {},
      };

      await client.from('usage_analytics').insert(analyticsData);
    } catch (error) {
      // Don't throw error for analytics tracking failures
      print('Warning: Failed to track analytics: $error');
    }
  }

  // Track PDF upload
  Future<void> trackPdfUpload({
    required String projectId,
    required double fileSizeMb,
    required int totalPages,
  }) async {
    await trackAction(
      actionType: 'pdf_upload',
      projectId: projectId,
      metadata: {
        'file_size_mb': fileSizeMb,
        'total_pages': totalPages,
      },
    );
  }

  // Track conversion start
  Future<void> trackConversionStart({
    required String projectId,
    required String formatType,
    Map<String, dynamic>? settings,
  }) async {
    await trackAction(
      actionType: 'conversion_start',
      projectId: projectId,
      metadata: {
        'format_type': formatType,
        'settings': settings ?? {},
      },
    );
  }

  // Track conversion completion
  Future<void> trackConversionComplete({
    required String projectId,
    required String formatType,
    required int durationSeconds,
    required double outputSizeMb,
  }) async {
    await trackAction(
      actionType: 'conversion_complete',
      projectId: projectId,
      metadata: {
        'format_type': formatType,
        'duration_seconds': durationSeconds,
        'output_size_mb': outputSizeMb,
      },
    );
  }

  // Track sharing
  Future<void> trackShare({
    required String projectId,
    required String shareType,
    String? recipient,
  }) async {
    await trackAction(
      actionType: 'share',
      projectId: projectId,
      metadata: {
        'share_type': shareType,
        'recipient': recipient,
      },
    );
  }

  // Track KDP publishing
  Future<void> trackKdpPublish({
    required String projectId,
    required String formatType,
    String? asin,
  }) async {
    await trackAction(
      actionType: 'kdp_publish',
      projectId: projectId,
      metadata: {
        'format_type': formatType,
        'asin': asin,
      },
    );
  }

  // Track download
  Future<void> trackDownload({
    required String projectId,
    required String formatType,
    required double fileSizeMb,
  }) async {
    await trackAction(
      actionType: 'download',
      projectId: projectId,
      metadata: {
        'format_type': formatType,
        'file_size_mb': fileSizeMb,
      },
    );
  }

  // Get user analytics
  Future<Map<String, dynamic>> getUserAnalytics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final client = await _supabaseService.client;
      final userId = _supabaseService.currentUser?.id;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      var query = client.from('usage_analytics').select().eq('user_id', userId);

      if (startDate != null) {
        query = query.gte('timestamp', startDate.toIso8601String());
      }

      if (endDate != null) {
        query = query.lte('timestamp', endDate.toIso8601String());
      }

      final response = await query.order('timestamp', ascending: false);

      // Process analytics data
      final analytics = response as List<dynamic>;

      final actionCounts = <String, int>{};
      final formatCounts = <String, int>{};
      final dailyActivity = <String, int>{};

      for (final record in analytics) {
        final actionType = record['action_type'] as String;
        final timestamp = DateTime.parse(record['timestamp'] as String);
        final metadata = record['metadata'] as Map<String, dynamic>? ?? {};

        // Count actions
        actionCounts[actionType] = (actionCounts[actionType] ?? 0) + 1;

        // Count format types
        if (metadata['format_type'] != null) {
          final formatType = metadata['format_type'] as String;
          formatCounts[formatType] = (formatCounts[formatType] ?? 0) + 1;
        }

        // Daily activity
        final dateKey = timestamp.toIso8601String().split('T')[0];
        dailyActivity[dateKey] = (dailyActivity[dateKey] ?? 0) + 1;
      }

      return {
        'total_actions': analytics.length,
        'action_counts': actionCounts,
        'format_counts': formatCounts,
        'daily_activity': dailyActivity,
        'most_used_action': actionCounts.isNotEmpty
            ? actionCounts.entries
                .reduce((a, b) => a.value > b.value ? a : b)
                .key
            : null,
        'most_used_format': formatCounts.isNotEmpty
            ? formatCounts.entries
                .reduce((a, b) => a.value > b.value ? a : b)
                .key
            : null,
      };
    } catch (error) {
      throw Exception('Failed to get user analytics: $error');
    }
  }
}
