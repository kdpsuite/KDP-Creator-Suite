class FormatConversion {
  final String id;
  final String projectId;
  final String formatType;
  final String status;
  final String? outputFileUrl;
  final double? outputFileSizeMb;
  final Map<String, dynamic> conversionSettings;
  final String? errorMessage;
  final DateTime? conversionStartedAt;
  final DateTime? conversionCompletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  FormatConversion({
    required this.id,
    required this.projectId,
    required this.formatType,
    required this.status,
    this.outputFileUrl,
    this.outputFileSizeMb,
    required this.conversionSettings,
    this.errorMessage,
    this.conversionStartedAt,
    this.conversionCompletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FormatConversion.fromJson(Map<String, dynamic> json) {
    return FormatConversion(
      id: json['id'] as String,
      projectId: json['project_id'] as String,
      formatType: json['format_type'] as String,
      status: json['status'] as String,
      outputFileUrl: json['output_file_url'] as String?,
      outputFileSizeMb: json['output_file_size_mb'] != null
          ? (json['output_file_size_mb'] as num).toDouble()
          : null,
      conversionSettings:
          Map<String, dynamic>.from(json['conversion_settings'] as Map? ?? {}),
      errorMessage: json['error_message'] as String?,
      conversionStartedAt: json['conversion_started_at'] != null
          ? DateTime.parse(json['conversion_started_at'] as String)
          : null,
      conversionCompletedAt: json['conversion_completed_at'] != null
          ? DateTime.parse(json['conversion_completed_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'format_type': formatType,
      'status': status,
      'output_file_url': outputFileUrl,
      'output_file_size_mb': outputFileSizeMb,
      'conversion_settings': conversionSettings,
      'error_message': errorMessage,
      'conversion_started_at': conversionStartedAt?.toIso8601String(),
      'conversion_completed_at': conversionCompletedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toInsertJson() {
    final json = toJson();
    json.remove('id');
    json.remove('created_at');
    json.remove('updated_at');
    return json;
  }

  FormatConversion copyWith({
    String? id,
    String? projectId,
    String? formatType,
    String? status,
    String? outputFileUrl,
    double? outputFileSizeMb,
    Map<String, dynamic>? conversionSettings,
    String? errorMessage,
    DateTime? conversionStartedAt,
    DateTime? conversionCompletedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FormatConversion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      formatType: formatType ?? this.formatType,
      status: status ?? this.status,
      outputFileUrl: outputFileUrl ?? this.outputFileUrl,
      outputFileSizeMb: outputFileSizeMb ?? this.outputFileSizeMb,
      conversionSettings: conversionSettings ?? this.conversionSettings,
      errorMessage: errorMessage ?? this.errorMessage,
      conversionStartedAt: conversionStartedAt ?? this.conversionStartedAt,
      conversionCompletedAt:
          conversionCompletedAt ?? this.conversionCompletedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isCompleted => status == 'completed';
  bool get isInProgress => status == 'in_progress';
  bool get isPending => status == 'pending';
  bool get hasFailed => status == 'failed';
  bool get isCancelled => status == 'cancelled';

  String get statusDisplayName {
    switch (status) {
      case 'completed':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  String get formatDisplayName {
    switch (formatType) {
      case 'ebook':
        return 'eBook';
      case 'paperback':
        return 'Paperback';
      case 'hardcover':
        return 'Hardcover';
      case 'coloring_book':
        return 'Coloring Book';
      case 'kindle_direct':
        return 'Kindle Direct';
      default:
        return formatType;
    }
  }

  Duration? get conversionDuration {
    if (conversionStartedAt != null && conversionCompletedAt != null) {
      return conversionCompletedAt!.difference(conversionStartedAt!);
    }
    return null;
  }
}
