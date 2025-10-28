class Project {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final String? originalPdfUrl;
  final String? originalPdfName;
  final String? thumbnailUrl;
  final String status;
  final int totalPages;
  final double fileSizeMb;
  final bool isFavorite;
  final String? folderPath;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  Project({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    this.originalPdfUrl,
    this.originalPdfName,
    this.thumbnailUrl,
    required this.status,
    required this.totalPages,
    required this.fileSizeMb,
    required this.isFavorite,
    this.folderPath,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      originalPdfUrl: json['original_pdf_url'] as String?,
      originalPdfName: json['original_pdf_name'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      status: json['status'] as String,
      totalPages: json['total_pages'] as int,
      fileSizeMb: (json['file_size_mb'] as num).toDouble(),
      isFavorite: json['is_favorite'] as bool,
      folderPath: json['folder_path'] as String?,
      metadata: Map<String, dynamic>.from(json['metadata'] as Map? ?? {}),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'description': description,
      'original_pdf_url': originalPdfUrl,
      'original_pdf_name': originalPdfName,
      'thumbnail_url': thumbnailUrl,
      'status': status,
      'total_pages': totalPages,
      'file_size_mb': fileSizeMb,
      'is_favorite': isFavorite,
      'folder_path': folderPath,
      'metadata': metadata,
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

  Project copyWith({
    String? id,
    String? userId,
    String? name,
    String? description,
    String? originalPdfUrl,
    String? originalPdfName,
    String? thumbnailUrl,
    String? status,
    int? totalPages,
    double? fileSizeMb,
    bool? isFavorite,
    String? folderPath,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Project(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      description: description ?? this.description,
      originalPdfUrl: originalPdfUrl ?? this.originalPdfUrl,
      originalPdfName: originalPdfName ?? this.originalPdfName,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      status: status ?? this.status,
      totalPages: totalPages ?? this.totalPages,
      fileSizeMb: fileSizeMb ?? this.fileSizeMb,
      isFavorite: isFavorite ?? this.isFavorite,
      folderPath: folderPath ?? this.folderPath,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isCompleted => status == 'completed';
  bool get isProcessing => status == 'processing';
  bool get isDraft => status == 'draft';
  bool get hasFailed => status == 'failed';
  bool get isArchived => status == 'archived';

  String get statusDisplayName {
    switch (status) {
      case 'completed':
        return 'Complete';
      case 'processing':
        return 'In Progress';
      case 'draft':
        return 'Draft';
      case 'failed':
        return 'Failed';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  }

  String get fileSizeDisplay {
    if (fileSizeMb < 1) {
      return '${(fileSizeMb * 1024).toStringAsFixed(0)} KB';
    }
    return '${fileSizeMb.toStringAsFixed(1)} MB';
  }
}
