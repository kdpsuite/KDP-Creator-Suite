import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';
import '../../../services/cloud_storage_service.dart';
import '../../../services/dropbox_service.dart';
import '../../../services/google_drive_service.dart';

class CloudStorageDialogWidget extends StatefulWidget {
  final String storageType; // 'google_drive' or 'dropbox'
  final Function(CloudFile) onFileSelected;

  const CloudStorageDialogWidget({
    super.key,
    required this.storageType,
    required this.onFileSelected,
  });

  @override
  State<CloudStorageDialogWidget> createState() =>
      _CloudStorageDialogWidgetState();
}

class _CloudStorageDialogWidgetState extends State<CloudStorageDialogWidget> {
  late CloudStorageService _storageService;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  List<CloudFile> _files = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeService();
    _checkAuthentication();
  }

  void _initializeService() {
    switch (widget.storageType) {
      case 'google_drive':
        _storageService = GoogleDriveService();
        break;
      case 'dropbox':
        _storageService = DropboxService();
        break;
      default:
        throw ArgumentError('Invalid storage type: ${widget.storageType}');
    }
  }

  Future<void> _checkAuthentication() async {
    setState(() => _isLoading = true);

    try {
      final authenticated = await _storageService.isAuthenticated();
      setState(() => _isAuthenticated = authenticated);

      if (authenticated) {
        await _loadFiles();
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _authenticate() async {
    setState(() => _isLoading = true);

    try {
      final success = await _storageService.authenticate();

      if (success) {
        setState(() => _isAuthenticated = true);
        await _loadFiles();
      } else {
        setState(() => _errorMessage = 'Authentication failed');
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadFiles() async {
    setState(() => _isLoading = true);

    try {
      final files = await _storageService.listFiles();
      setState(() {
        _files = files;
        _errorMessage = null;
      });
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _selectFile(CloudFile file) {
    Navigator.of(context).pop();
    widget.onFileSelected(file);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          CustomIconWidget(
            iconName: widget.storageType == 'google_drive'
                ? 'cloud'
                : 'cloud_download',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 24,
          ),
          SizedBox(width: 2.w),
          Text(
            'Select from ${_storageService.serviceName}',
            style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 80.w,
        height: 60.h,
        child: _buildContent(),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(
            'Cancel',
            style: TextStyle(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return _buildErrorState();
    }

    if (!_isAuthenticated) {
      return _buildAuthenticationState();
    }

    if (_files.isEmpty) {
      return _buildEmptyState();
    }

    return _buildFileList();
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'error_outline',
            color: AppTheme.lightTheme.colorScheme.error,
            size: 48,
          ),
          SizedBox(height: 2.h),
          Text(
            'Error',
            style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: AppTheme.lightTheme.colorScheme.error,
            ),
          ),
          SizedBox(height: 1.h),
          Text(
            _errorMessage!,
            textAlign: TextAlign.center,
            style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
          ),
          SizedBox(height: 3.h),
          ElevatedButton(
            onPressed: _checkAuthentication,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildAuthenticationState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: widget.storageType == 'google_drive'
                ? 'cloud'
                : 'cloud_download',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 64,
          ),
          SizedBox(height: 3.h),
          Text(
            'Connect to ${_storageService.serviceName}',
            style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 2.h),
          Text(
            'Sign in to access your PDF files stored in ${_storageService.serviceName}',
            textAlign: TextAlign.center,
            style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
          ),
          SizedBox(height: 4.h),
          ElevatedButton.icon(
            onPressed: _authenticate,
            icon: CustomIconWidget(
              iconName: 'login',
              color: AppTheme.lightTheme.colorScheme.onSecondary,
              size: 20,
            ),
            label: Text('Sign In'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
              foregroundColor: AppTheme.lightTheme.colorScheme.onSecondary,
              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.5.h),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'folder_open',
            color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            size: 64,
          ),
          SizedBox(height: 3.h),
          Text(
            'No PDF Files Found',
            style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 1.h),
          Text(
            'No PDF files were found in your ${_storageService.serviceName} account.',
            textAlign: TextAlign.center,
            style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
          ),
          SizedBox(height: 3.h),
          TextButton.icon(
            onPressed: _loadFiles,
            icon: CustomIconWidget(
              iconName: 'refresh',
              color: AppTheme.lightTheme.colorScheme.secondary,
              size: 20,
            ),
            label: Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildFileList() {
    return Column(
      children: [
        // Header
        Row(
          children: [
            Text(
              '${_files.length} PDF files found',
              style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            IconButton(
              onPressed: _loadFiles,
              icon: CustomIconWidget(
                iconName: 'refresh',
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                size: 20,
              ),
            ),
          ],
        ),
        SizedBox(height: 1.h),
        Divider(color: AppTheme.lightTheme.colorScheme.outline),
        SizedBox(height: 1.h),

        // File list
        Expanded(
          child: ListView.builder(
            itemCount: _files.length,
            itemBuilder: (context, index) {
              final file = _files[index];
              return _buildFileItem(file);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFileItem(CloudFile file) {
    return InkWell(
      onTap: () => _selectFile(file),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: EdgeInsets.all(3.w),
        margin: EdgeInsets.only(bottom: 1.h),
        decoration: BoxDecoration(
          border: Border.all(
            color: AppTheme.lightTheme.colorScheme.outline.withAlpha(128),
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Container(
              width: 12.w,
              height: 12.w,
              decoration: BoxDecoration(
                color: AppTheme.lightTheme.colorScheme.secondary.withAlpha(26),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: CustomIconWidget(
                  iconName: 'picture_as_pdf',
                  color: AppTheme.lightTheme.colorScheme.secondary,
                  size: 24,
                ),
              ),
            ),
            SizedBox(width: 3.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    file.name,
                    style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 0.5.h),
                  Row(
                    children: [
                      Text(
                        file.formattedSize,
                        style:
                            AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                          color:
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      SizedBox(width: 2.w),
                      Text(
                        '•',
                        style:
                            AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                          color:
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      SizedBox(width: 2.w),
                      Text(
                        _formatDate(file.modified),
                        style:
                            AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                          color:
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            CustomIconWidget(
              iconName: 'arrow_forward_ios',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
