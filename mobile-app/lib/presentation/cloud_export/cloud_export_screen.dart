import 'dart:typed_data';
import 'package:kdp_creator_suite/theme/app_theme.dart';

import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../core/app_export.dart';
import '../../services/cloud_storage_service.dart';
import '../../services/dropbox_service.dart';
import '../../services/google_drive_service.dart';

class CloudExportScreen extends StatefulWidget {
  const CloudExportScreen({super.key});

  @override
  State<CloudExportScreen> createState() => _CloudExportScreenState();
}

class _CloudExportScreenState extends State<CloudExportScreen> {
  bool _isExporting = false;
  double _exportProgress = 0.0;
  String _currentStep = '';
  List<CloudStorageService> _availableServices = [];
  CloudStorageService? _selectedService;

  @override
  void initState() {
    super.initState();
    _initializeServices();
  }

  void _initializeServices() {
    _availableServices = [
      GoogleDriveService(),
      DropboxService(),
    ];
  }

  Future<void> _exportToCloudStorage() async {
    if (_selectedService == null) {
      _showErrorMessage('Please select a cloud storage service');
      return;
    }

    final args =
        ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>?;
    if (args == null || args['fileBytes'] == null || args['fileName'] == null) {
      _showErrorMessage('No file data available for export');
      return;
    }

    final Uint8List fileBytes = args['fileBytes'];
    final String fileName = args['fileName'];

    setState(() {
      _isExporting = true;
      _exportProgress = 0.0;
      _currentStep = 'Preparing export...';
    });

    try {
      // Step 1: Check authentication
      setState(() {
        _exportProgress = 0.2;
        _currentStep = 'Checking authentication...';
      });

      final isAuthenticated = await _selectedService!.isAuthenticated();
      if (!isAuthenticated) {
        setState(() {
          _exportProgress = 0.4;
          _currentStep = 'Authenticating...';
        });

        final authSuccess = await _selectedService!.authenticate();
        if (!authSuccess) {
          throw Exception('Authentication failed');
        }
      }

      // Step 2: Upload file
      setState(() {
        _exportProgress = 0.6;
        _currentStep = 'Uploading to ${_selectedService!.serviceName}...';
      });

      final uploadedFile = await _selectedService!.uploadFile(
        fileBytes: fileBytes,
        fileName: fileName,
      );

      if (uploadedFile != null) {
        setState(() {
          _exportProgress = 1.0;
          _currentStep = 'Export completed successfully!';
        });

        await Future.delayed(const Duration(seconds: 1));

        if (mounted) {
          _showSuccessMessage(
              'File exported to ${_selectedService!.serviceName} successfully!');
          Navigator.of(context).pop(true);
        }
      } else {
        throw Exception('Failed to upload file');
      }
    } catch (e) {
      setState(() {
        _isExporting = false;
        _exportProgress = 0.0;
        _currentStep = '';
      });
      _showErrorMessage('Export failed: ${e.toString()}');
    }
  }

  void _showErrorMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.lightTheme.colorScheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccessMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.lightTheme.appBarTheme.backgroundColor,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: CustomIconWidget(
            iconName: 'arrow_back',
            color: AppTheme.lightTheme.colorScheme.onSurface,
            size: 24,
          ),
        ),
        title: Text(
          'Export to Cloud Storage',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(4.w),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_isExporting) ...[
                _buildExportProgress(),
                SizedBox(height: 4.h),
              ] else ...[
                Text(
                  'Choose Cloud Storage Service',
                  style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 2.h),
                Text(
                  'Select where you want to save your converted file:',
                  style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  ),
                ),
                SizedBox(height: 3.h),

                // Cloud storage options
                Expanded(
                  child: ListView.builder(
                    itemCount: _availableServices.length,
                    itemBuilder: (context, index) {
                      final service = _availableServices[index];
                      final isSelected = _selectedService == service;

                      return _buildStorageOption(service, isSelected);
                    },
                  ),
                ),

                SizedBox(height: 4.h),

                // Export button
                SizedBox(
                  width: double.infinity,
                  height: 6.h,
                  child: ElevatedButton(
                    onPressed:
                        _selectedService != null ? _exportToCloudStorage : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _selectedService != null
                          ? AppTheme.lightTheme.colorScheme.secondary
                          : AppTheme.lightTheme.colorScheme.outline,
                      foregroundColor:
                          AppTheme.lightTheme.colorScheme.onSecondary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CustomIconWidget(
                          iconName: 'cloud_upload',
                          color: AppTheme.lightTheme.colorScheme.onSecondary,
                          size: 20,
                        ),
                        SizedBox(width: 2.w),
                        Text(
                          'Export to Cloud Storage',
                          style: AppTheme.lightTheme.textTheme.titleMedium
                              ?.copyWith(
                            color: AppTheme.lightTheme.colorScheme.onSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExportProgress() {
    return Container(
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.lightTheme.colorScheme.outline.withAlpha(128),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'cloud_upload',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 24,
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: Text(
                  'Exporting to ${_selectedService?.serviceName}...',
                  style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 3.h),
          LinearProgressIndicator(
            value: _exportProgress,
            backgroundColor:
                AppTheme.lightTheme.colorScheme.outline.withAlpha(77),
            valueColor: AlwaysStoppedAnimation<Color>(
              AppTheme.lightTheme.colorScheme.secondary,
            ),
          ),
          SizedBox(height: 2.h),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _currentStep,
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                '${(_exportProgress * 100).toInt()}%',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.lightTheme.colorScheme.secondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStorageOption(CloudStorageService service, bool isSelected) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedService = isSelected ? null : service;
        });
      },
      child: Container(
        margin: EdgeInsets.only(bottom: 2.h),
        padding: EdgeInsets.all(4.w),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.lightTheme.colorScheme.secondary.withAlpha(26)
              : AppTheme.lightTheme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? AppTheme.lightTheme.colorScheme.secondary
                : AppTheme.lightTheme.colorScheme.outline.withAlpha(128),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 12.w,
              height: 12.w,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.lightTheme.colorScheme.secondary
                    : AppTheme.lightTheme.colorScheme.secondary.withAlpha(26),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: CustomIconWidget(
                  iconName: service is GoogleDriveService
                      ? 'cloud'
                      : 'cloud_download',
                  color: isSelected
                      ? AppTheme.lightTheme.colorScheme.onSecondary
                      : AppTheme.lightTheme.colorScheme.secondary,
                  size: 24,
                ),
              ),
            ),
            SizedBox(width: 4.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    service.serviceName,
                    style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? AppTheme.lightTheme.colorScheme.secondary
                          : AppTheme.lightTheme.colorScheme.onSurface,
                    ),
                  ),
                  SizedBox(height: 0.5.h),
                  Text(
                    'Save your converted files to ${service.serviceName}',
                    style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                      color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              CustomIconWidget(
                iconName: 'check_circle',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 24,
              ),
          ],
        ),
      ),
    );
  }
}
