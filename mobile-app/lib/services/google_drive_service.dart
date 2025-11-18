import 'dart:io' if (dart.library.io) 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:googleapis/drive/v3.dart' as drive;
import 'package:googleapis_auth/auth_io.dart'
    if (dart.library.io) 'package:googleapis_auth/auth_io.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import './cloud_storage_service.dart';

class GoogleDriveService extends CloudStorageService {
  static const List<String> _scopes = [
    drive.DriveApi.driveFileScope,
  ];

  static const String _clientId = 'YOUR_GOOGLE_CLIENT_ID';
  static const String _clientSecret = 'YOUR_GOOGLE_CLIENT_SECRET';

  drive.DriveApi? _driveApi;
  AuthClient? _authClient;

  @override
  String get serviceName => 'Google Drive';

  @override
  Future<bool> authenticate() async {
    try {
      if (kIsWeb) {
        return await _authenticateWeb();
      } else {
        return await _authenticateMobile();
      }
    } catch (e) {
      throw CloudStorageException('Google Drive authentication failed: $e');
    }
  }

  Future<bool> _authenticateWeb() async {
    try {
      // Web OAuth flow using URL launcher
      final authUrl = _buildAuthUrl();

      if (await canLaunchUrl(Uri.parse(authUrl))) {
        await launchUrl(Uri.parse(authUrl));

        // In a real implementation, you would handle the OAuth callback
        // For now, we'll simulate success
        await Future.delayed(const Duration(seconds: 2));

        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('google_drive_authenticated', true);

        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> _authenticateMobile() async {
    try {
      if (!kIsWeb && Platform.isAndroid || Platform.isIOS) {
        // Mobile OAuth flow
        final clientId = ClientId(_clientId, _clientSecret);

        _authClient =
            await clientViaUserConsent(clientId, _scopes, (url) async {
          if (await canLaunchUrl(Uri.parse(url))) {
            await launchUrl(Uri.parse(url));
          }
        });

        if (_authClient != null) {
          _driveApi = drive.DriveApi(_authClient!);

          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool('google_drive_authenticated', true);

          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  String _buildAuthUrl() {
    final params = {
      'client_id': _clientId,
      'redirect_uri': 'http://localhost:8080/auth/callback',
      'response_type': 'code',
      'scope': _scopes.join(' '),
      'access_type': 'offline',
    };

    final query = params.entries
        .map((e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');

    return 'https://accounts.google.com/o/oauth2/auth?$query';
  }

  @override
  Future<void> signOut() async {
    try {
      _authClient?.close();
      _authClient = null;
      _driveApi = null;

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('google_drive_authenticated');
    } catch (e) {
      throw CloudStorageException('Failed to sign out from Google Drive: $e');
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool('google_drive_authenticated') ?? false;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<CloudFile?> uploadFile({
    required Uint8List fileBytes,
    required String fileName,
    String? folderId,
  }) async {
    try {
      if (_driveApi == null && !await authenticate()) {
        throw CloudStorageException('Not authenticated with Google Drive');
      }

      final file = drive.File()
        ..name = fileName
        ..parents = folderId != null ? [folderId] : null;

      final media = drive.Media(Stream.value(fileBytes), fileBytes.length,
          contentType: _getMimeType(fileName));

      final uploadedFile =
          await _driveApi!.files.create(file, uploadMedia: media);

      if (uploadedFile.id != null) {
        return CloudFile(
            id: uploadedFile.id!,
            name: uploadedFile.name ?? fileName,
            size: int.tryParse(uploadedFile.size ?? '') ?? fileBytes.length,
            modified: uploadedFile.modifiedTime ?? DateTime.now(),
            mimeType: uploadedFile.mimeType);
      }
      return null;
    } catch (e) {
      throw CloudStorageException('Failed to upload file to Google Drive: $e');
    }
  }

  @override
  Future<Uint8List?> downloadFile(String fileId) async {
    try {
      if (_driveApi == null && !await authenticate()) {
        throw CloudStorageException('Not authenticated with Google Drive');
      }

      final media = await _driveApi!.files.get(fileId,
          downloadOptions: drive.DownloadOptions.fullMedia) as drive.Media;

      final bytes = <int>[];
      await for (final chunk in media.stream) {
        bytes.addAll(chunk);
      }

      return Uint8List.fromList(bytes);
    } catch (e) {
      throw CloudStorageException(
          'Failed to download file from Google Drive: $e');
    }
  }

  @override
  Future<List<CloudFile>> listFiles({String? folderId}) async {
    try {
      if (_driveApi == null && !await authenticate()) {
        throw CloudStorageException('Not authenticated with Google Drive');
      }

      String query = "trashed=false and mimeType contains 'pdf'";
      if (folderId != null) {
        query += " and '$folderId' in parents";
      }

      final fileList = await _driveApi!.files
          .list(q: query, spaces: 'drive', orderBy: 'modifiedTime desc');

      return fileList.files
              ?.map((file) => CloudFile(
                  id: file.id!,
                  name: file.name ?? 'Unknown',
                  size: int.tryParse(file.size ?? '') ?? 0,
                  modified: file.modifiedTime ?? DateTime.now(),
                  mimeType: file.mimeType))
              .toList() ??
          [];
    } catch (e) {
      throw CloudStorageException('Failed to list Google Drive files: $e');
    }
  }

  @override
  Future<CloudFile?> selectFile() async {
    try {
      final files = await listFiles();

      if (files.isEmpty) {
        return null;
      }

      // In a real implementation, you would show a file picker dialog
      // For now, return the first file
      return files.first;
    } catch (e) {
      throw CloudStorageException(
          'Failed to select file from Google Drive: $e');
    }
  }

  @override
  Future<bool> deleteFile(String fileId) async {
    try {
      if (_driveApi == null && !await authenticate()) {
        throw CloudStorageException('Not authenticated with Google Drive');
      }

      await _driveApi!.files.delete(fileId);
      return true;
    } catch (e) {
      throw CloudStorageException(
          'Failed to delete file from Google Drive: $e');
    }
  }

  String _getMimeType(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'epub':
        return 'application/epub+zip';
      case 'mobi':
        return 'application/x-mobipocket-ebook';
      default:
        return 'application/octet-stream';
    }
  }
}