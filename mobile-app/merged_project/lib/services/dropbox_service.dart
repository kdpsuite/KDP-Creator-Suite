import 'package:dropbox_client/dropbox_client.dart' as dropbox;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';

import './cloud_storage_service.dart';
import 'package:kdp_creator_suite/lib\theme\app_theme.dart';

class DropboxService extends CloudStorageService {
  static const String _appKey = 'YOUR_DROPBOX_APP_KEY';
  static const String _appSecret = 'YOUR_DROPBOX_APP_SECRET';
  static const String _redirectUri = 'your-app://auth';

  bool _isAuthenticated = false;

  @override
  String get serviceName => 'Dropbox';

  @override
  Future<bool> authenticate() async {
    try {
      if (kIsWeb) {
        return await _authenticateWeb();
      } else {
        return await _authenticateMobile();
      }
    } catch (e) {
      throw CloudStorageException('Dropbox authentication failed: $e');
    }
  }

  Future<bool> _authenticateWeb() async {
    try {
      // Web OAuth flow
      final authUrl = _buildAuthUrl();

      if (await canLaunchUrl(Uri.parse(authUrl))) {
        await launchUrl(Uri.parse(authUrl));

        // In a real implementation, you would handle the OAuth callback
        // For now, we'll simulate success
        await Future.delayed(const Duration(seconds: 2));

        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('dropbox_authenticated', true);
        _isAuthenticated = true;

        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> _authenticateMobile() async {
    try {
      // Initialize Dropbox client
      await dropbox.Dropbox.init(_appKey, _appSecret, _redirectUri);

      // Authenticate with Dropbox
      await dropbox.Dropbox.authorize();

      // Check if authentication was successful by getting access token
      final token = await dropbox.Dropbox.getAccessToken();
      if (token != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('dropbox_authenticated', true);
        await prefs.setString('dropbox_access_token', token);
        _isAuthenticated = true;

        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  String _buildAuthUrl() {
    final params = {
      'client_id': _appKey,
      'redirect_uri': _redirectUri,
      'response_type': 'code',
    };

    final query = params.entries
        .map((e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');

    return 'https://www.dropbox.com/oauth2/authorize?$query';
  }

  @override
  Future<void> signOut() async {
    try {
      if (!kIsWeb) {
        await dropbox.Dropbox.unlink();
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('dropbox_authenticated');
      await prefs.remove('dropbox_access_token');
      _isAuthenticated = false;
    } catch (e) {
      throw CloudStorageException('Failed to sign out from Dropbox: $e');
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    try {
      if (!kIsWeb) {
        final token = await dropbox.Dropbox.getAccessToken();
        _isAuthenticated = token != null;
      } else {
        final prefs = await SharedPreferences.getInstance();
        _isAuthenticated = prefs.getBool('dropbox_authenticated') ?? false;
      }
      return _isAuthenticated;
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
      if (!await isAuthenticated()) {
        throw CloudStorageException('Not authenticated with Dropbox');
      }

      final path = folderId != null ? '$folderId/$fileName' : '/$fileName';

      if (!kIsWeb) {
        // Convert Uint8List to base64 string for Dropbox API
        final fileContent = base64Encode(fileBytes);
        final result = await dropbox.Dropbox.upload(path, fileContent);

        if (result != null && result['id'] != null) {
          return CloudFile(
              id: result['id'],
              name: fileName,
              size: fileBytes.length,
              modified: DateTime.now(),
              mimeType: _getMimeType(fileName));
        }
      } else {
        // Simulate web upload
        await Future.delayed(const Duration(seconds: 1));
        return CloudFile(
            id: 'web_${DateTime.now().millisecondsSinceEpoch}',
            name: fileName,
            size: fileBytes.length,
            modified: DateTime.now(),
            mimeType: _getMimeType(fileName));
      }
      return null;
    } catch (e) {
      throw CloudStorageException('Failed to upload file to Dropbox: $e');
    }
  }

  @override
  Future<Uint8List?> downloadFile(String fileId) async {
    try {
      if (!await isAuthenticated()) {
        throw CloudStorageException('Not authenticated with Dropbox');
      }

      if (!kIsWeb) {
        final result = await dropbox.Dropbox.download(fileId, '');
        if (result != null) {
          return Uint8List.fromList(result);
        }
      } else {
        // Simulate web download
        await Future.delayed(const Duration(seconds: 1));
        return Uint8List.fromList([]);
      }
      return null;
    } catch (e) {
      throw CloudStorageException('Failed to download file from Dropbox: $e');
    }
  }

  @override
  Future<List<CloudFile>> listFiles({String? folderId}) async {
    try {
      if (!await isAuthenticated()) {
        throw CloudStorageException('Not authenticated with Dropbox');
      }

      final path = folderId ?? '';

      if (!kIsWeb) {
        final result = await dropbox.Dropbox.listFolder(path);

        if (result != null && result['entries'] != null) {
          final entries = result['entries'] as List;
          return entries
              .where((entry) =>
                  entry['.tag'] == 'file' &&
                  entry['name'].toString().toLowerCase().endsWith('.pdf'))
              .map((entry) => CloudFile(
                  id: entry['path_lower'] ?? entry['id'],
                  name: entry['name'] ?? 'Unknown',
                  size: entry['size'] ?? 0,
                  modified: DateTime.tryParse(entry['server_modified'] ?? '') ??
                      DateTime.now(),
                  mimeType: _getMimeType(entry['name'] ?? '')))
              .toList();
        }
      } else {
        // Simulate web file listing
        await Future.delayed(const Duration(milliseconds: 500));
        return [
          CloudFile(
              id: 'sample_1',
              name: 'Sample Document.pdf',
              size: 1024 * 1024,
              modified: DateTime.now().subtract(const Duration(days: 1)),
              mimeType: 'application/pdf'),
        ];
      }
      return [];
    } catch (e) {
      throw CloudStorageException('Failed to list Dropbox files: $e');
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
      throw CloudStorageException('Failed to select file from Dropbox: $e');
    }
  }

  // @override
  // Future<bool> deleteFile(String fileId) async {
  //   try {
  //     if (!await isAuthenticated()) {
  //       throw CloudStorageException("Not authenticated with Dropbox");
  //     }

  //     if (!kIsWeb) {
  //       // Use the correct Dropbox API method name
  //       final result = await dropbox.Dropbox.delete(fileId);
  //       return result != null;
  //     } else {
  //       // Simulate web deletion
  //       await Future.delayed(const Duration(milliseconds: 500));
  //       return true;
  //     }
  //   } catch (e) {
  //     throw CloudStorageException("Failed to delete file from Dropbox: $e");
  //   }
  // }

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