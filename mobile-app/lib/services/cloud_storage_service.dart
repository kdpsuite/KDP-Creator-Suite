
abstract class CloudStorageService {
  String get serviceName;

  Future<bool> authenticate();
  Future<void> signOut();
  Future<bool> isAuthenticated();
  Future<CloudFile?> uploadFile({
    required Uint8List fileBytes,
    required String fileName,
    String? folderId,
  });
  Future<Uint8List?> downloadFile(String fileId);
  Future<List<CloudFile>> listFiles({String? folderId});
  Future<CloudFile?> selectFile();

}

class CloudFile {
  final String id;
  final String name;
  final int size;
  final DateTime modified;
  final String? mimeType;
  final String? downloadUrl;
  final bool isFolder;

  CloudFile({
    required this.id,
    required this.name,
    required this.size,
    required this.modified,
    this.mimeType,
    this.downloadUrl,
    this.isFolder = false,
  });

  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class CloudStorageException implements Exception {
  final String message;
  final String? code;

  CloudStorageException(this.message, {this.code});

  @override
  String toString() => 'CloudStorageException: $message';
}
