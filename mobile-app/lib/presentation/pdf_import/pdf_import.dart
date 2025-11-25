import 'dart:io' if (dart.library.io) 'dart:io';

import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:camera/camera.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:sizer/sizer.dart';

import '../../core/app_export.dart';
import '../../services/cloud_storage_service.dart';
import '../../services/dropbox_service.dart';
import '../../services/google_drive_service.dart';
import '../../services/pdf_processing_service.dart';
import './widgets/cloud_storage_dialog_widget.dart';
import './widgets/conversion_progress_widget.dart';
import './widgets/file_preview_widget.dart';
import './widgets/import_method_button_widget.dart';
import './widgets/processing_quality_widget.dart';
import './widgets/recent_files_widget.dart';
import './widgets/upload_area_widget.dart';
import './widgets/upload_progress_widget.dart';

class PdfImport extends StatefulWidget {
  const PdfImport({super.key});

  @override
  State<PdfImport> createState() => _PdfImportState();
}

class _PdfImportState extends State<PdfImport> with TickerProviderStateMixin {
  Map<String, dynamic>? selectedFile;
  bool isUploading = false;
  bool isProcessing = false;
  double uploadProgress = 0.0;
  double processingProgress = 0.0;
  String currentProcessingStep = '';
  List<String> completedSteps = [];
  Map<String, dynamic>? processingStats;
  bool showSuccessAnimation = false;
  bool showQualitySettings = false;

  // Enhanced processing settings
  Map<String, dynamic> qualitySettings = {
    'enable_ocr': false,
    'ocr_language': 'eng',
    'optimize_images': true,
    'image_quality': 85.0,
    'target_dpi': 150.0,
    'preserve_layout': true,
    'embed_fonts': true,
    'compression': 'medium',
    'batch_processing': false,
    'quality_validation': true,
    'processing_threads': 2.0,
  };

  late AnimationController _successAnimationController;
  late Animation<double> _successAnimation;
  List<CameraDescription> _cameras = [];
  CameraController? _cameraController;

  final PdfProcessingService _processingService = PdfProcessingService();

  // Mock recent files data
  final List<Map<String, dynamic>> recentFiles = [
    {
      "id": 1,
      "name": "Novel_Draft.pdf",
      "size": "2.4 MB",
      "pages": 156,
      "lastModified": DateTime.now().subtract(const Duration(hours: 2)),
    },
    {
      "id": 2,
      "name": "Children_Story.pdf",
      "size": "1.8 MB",
      "pages": 24,
      "lastModified": DateTime.now().subtract(const Duration(days: 1)),
    },
    {
      "id": 3,
      "name": "Recipe_Book.pdf",
      "size": "3.2 MB",
      "pages": 48,
      "lastModified": DateTime.now().subtract(const Duration(days: 3)),
    },
    {
      "id": 4,
      "name": "Travel_Guide.pdf",
      "size": "5.1 MB",
      "pages": 89,
      "lastModified": DateTime.now().subtract(const Duration(days: 5)),
    },
  ];

  @override
  void initState() {
    super.initState();
    _successAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _successAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _successAnimationController,
      curve: Curves.elasticOut,
    ));
    _initializeCamera();
  }

  @override
  void dispose() {
    _successAnimationController.dispose();
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isNotEmpty) {
        final camera = kIsWeb
            ? _cameras.firstWhere(
                (c) => c.lensDirection == CameraLensDirection.front,
                orElse: () => _cameras.first)
            : _cameras.firstWhere(
                (c) => c.lensDirection == CameraLensDirection.back,
                orElse: () => _cameras.first);

        _cameraController = CameraController(
            camera, kIsWeb ? ResolutionPreset.medium : ResolutionPreset.high);
        await _cameraController!.initialize();

        // Apply platform-specific settings
        try {
          await _cameraController!.setFocusMode(FocusMode.auto);
        } catch (e) {
          // Ignore if not supported
        }

        if (!kIsWeb) {
          try {
            await _cameraController!.setFlashMode(FlashMode.auto);
          } catch (e) {
            // Ignore if not supported
          }
        }
      }
    } catch (e) {
      // Camera initialization failed, continue without camera
    }
  }

  Future<bool> _requestCameraPermission() async {
    if (kIsWeb) return true;
    return (await Permission.camera.request()).isGranted;
  }

  Future<void> _selectFromFiles() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final fileSize = file.size;

        // Check file size limit (50MB)
        if (fileSize > 50 * 1024 * 1024) {
          _showErrorMessage('File size exceeds 50MB limit');
          return;
        }

        setState(() {
          selectedFile = {
            'name': file.name,
            'size': _formatFileSize(fileSize),
            'pages': _estimatePages(fileSize),
            'path': file.path,
            'bytes': file.bytes,
          };
        });
      }
    } catch (e) {
      _showErrorMessage('Failed to select file. Please try again.');
    }
  }

  Future<void> _selectFromGoogleDrive() async {
    try {
      final result = await showDialog<CloudFile>(
        context: context,
        barrierDismissible: false,
        builder: (context) => CloudStorageDialogWidget(
          storageType: 'google_drive',
          onFileSelected: (file) => Navigator.of(context).pop(file),
        ),
      );

      if (result != null) {
        // Download the file from Google Drive
        final googleDriveService = GoogleDriveService();
        final fileBytes = await googleDriveService.downloadFile(result.id);

        if (fileBytes != null) {
          setState(() {
            selectedFile = {
              'name': result.name,
              'size': result.formattedSize,
              'pages': _estimatePages(result.size),
              'bytes': fileBytes,
              'source': 'google_drive',
              'cloudFile': result,
            };
          });
        } else {
          _showErrorMessage('Failed to download file from Google Drive');
        }
      }
    } catch (e) {
      _showErrorMessage('Google Drive error: ${e.toString()}');
    }
  }

  Future<void> _selectFromDropbox() async {
    try {
      final result = await showDialog<CloudFile>(
        context: context,
        barrierDismissible: false,
        builder: (context) => CloudStorageDialogWidget(
          storageType: 'dropbox',
          onFileSelected: (file) => Navigator.of(context).pop(file),
        ),
      );

      if (result != null) {
        // Download the file from Dropbox
        final dropboxService = DropboxService();
        final fileBytes = await dropboxService.downloadFile(result.id);

        if (fileBytes != null) {
          setState(() {
            selectedFile = {
              'name': result.name,
              'size': result.formattedSize,
              'pages': _estimatePages(result.size),
              'bytes': fileBytes,
              'source': 'dropbox',
              'cloudFile': result,
            };
          });
        } else {
          _showErrorMessage('Failed to download file from Dropbox');
        }
      }
    } catch (e) {
      _showErrorMessage('Dropbox error: ${e.toString()}');
    }
  }

  Future<void> _scanWithCamera() async {
    if (!await _requestCameraPermission()) {
      _showErrorMessage('Camera permission required for scanning');
      return;
    }

    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      _showErrorMessage('Camera not available');
      return;
    }

    try {
      final XFile photo = await _cameraController!.takePicture();

      // Simulate PDF creation from scanned image
      setState(() {
        selectedFile = {
          'name':
              'Scanned_Document_${DateTime.now().millisecondsSinceEpoch}.pdf',
          'size': '1.2 MB',
          'pages': 1,
          'path': photo.path,
          'isScanned': true,
        };
      });
    } catch (e) {
      _showErrorMessage('Failed to capture image. Please try again.');
    }
  }

  void _selectRecentFile(Map<String, dynamic> file) {
    setState(() {
      selectedFile = Map<String, dynamic>.from(file);
    });
  }

  void _removeSelectedFile() {
    setState(() {
      selectedFile = null;
    });
  }

  Future<void> _importFile() async {
    if (selectedFile == null) return;

    setState(() {
      isUploading = true;
      uploadProgress = 0.0;
    });

    // Simulate upload progress
    for (int i = 0; i <= 100; i += 10) {
      await Future.delayed(const Duration(milliseconds: 200));
      if (!isUploading) return; // Check if cancelled

      setState(() {
        uploadProgress = i / 100.0;
      });
    }

    setState(() {
      isUploading = false;
      isProcessing = true;
      processingProgress = 0.0;
      currentProcessingStep = 'Analyzing PDF structure...';
      completedSteps = [];
    });

    await _performEnhancedProcessing();
  }

  Future<void> _performEnhancedProcessing() async {
    try {
      final steps = [
        'Analyzing PDF structure...',
        'Extracting text content...',
        'Processing images...',
        'Applying OCR if needed...',
        'Optimizing layout...',
        'Validating quality...',
        'Finalizing processing...',
      ];

      for (int i = 0; i < steps.length; i++) {
        setState(() {
          currentProcessingStep = steps[i];
          processingProgress = (i + 1) / steps.length;
          if (i > 0) {
            completedSteps.add(steps[i - 1]);
          }

          // Mock processing stats
          processingStats = {
            'pages_processed':
                ((i + 1) / steps.length * (selectedFile!['pages'] as int))
                    .toInt(),
            'quality_score': 85.0 + (i * 2),
            'estimated_time': '${(steps.length - i - 1) * 15} seconds',
          };
        });

        // Simulate processing time
        await Future.delayed(Duration(milliseconds: 800 + (i * 200)));

        if (!isProcessing) return; // Check if cancelled
      }

      setState(() {
        isProcessing = false;
        showSuccessAnimation = true;
        completedSteps.add(steps.last);
      });

      _successAnimationController.forward();

      // Wait for animation to complete then navigate
      await Future.delayed(const Duration(milliseconds: 2000));

      if (mounted) {
        Navigator.pushNamed(context, '/format-selection');
      }
    } catch (error) {
      setState(() {
        isProcessing = false;
      });
      _showErrorMessage('Processing failed. Please try again.');
    }
  }

  void _cancelUpload() {
    setState(() {
      isUploading = false;
      uploadProgress = 0.0;
    });
  }

  void _cancelProcessing() {
    setState(() {
      isProcessing = false;
      processingProgress = 0.0;
      currentProcessingStep = '';
      completedSteps = [];
      processingStats = null;
    });
  }

  void _toggleQualitySettings() {
    setState(() {
      showQualitySettings = !showQualitySettings;
    });
  }

  void _updateQualitySettings(Map<String, dynamic> newSettings) {
    setState(() {
      qualitySettings = newSettings;
    });
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

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  int _estimatePages(int bytes) {
    // Rough estimation: 1 page ≈ 50KB
    return (bytes / (50 * 1024)).ceil();
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
            iconName: 'close',
            color: AppTheme.lightTheme.colorScheme.onSurface,
            size: 24,
          ),
        ),
        title: Text(
          'Import PDF',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: _toggleQualitySettings,
            icon: CustomIconWidget(
              iconName: 'tune',
              color: showQualitySettings
                  ? AppTheme.lightTheme.colorScheme.secondary
                  : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(vertical: 2.h),
          child: Column(
            children: [
              // Processing Progress Overlay
              if (isProcessing)
                ConversionProgressWidget(
                  progress: processingProgress,
                  currentStep: currentProcessingStep,
                  completedSteps: completedSteps,
                  processingStats: processingStats,
                  onCancel: _cancelProcessing,
                )
              // Success Animation Overlay
              else if (showSuccessAnimation)
                AnimatedBuilder(
                  animation: _successAnimation,
                  builder: (context, child) {
                    return Container(
                      width: double.infinity,
                      height: 30.h,
                      child: Center(
                        child: Transform.scale(
                          scale: _successAnimation.value,
                          child: Container(
                            width: 20.w,
                            height: 20.w,
                            decoration: BoxDecoration(
                              color: AppTheme.lightTheme.colorScheme.secondary,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: CustomIconWidget(
                                iconName: 'check',
                                color:
                                    AppTheme.lightTheme.colorScheme.onSecondary,
                                size: 48,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                )
              else ...[
                // Quality Settings Panel
                if (showQualitySettings)
                  ProcessingQualityWidget(
                    qualitySettings: qualitySettings,
                    onSettingsChanged: _updateQualitySettings,
                  ),

                // Upload Area
                if (!isUploading && selectedFile == null)
                  UploadAreaWidget(
                    onTap: _selectFromFiles,
                    hasSelectedFile: false,
                  )
                else if (!isUploading && selectedFile != null)
                  FilePreviewWidget(
                    selectedFile: selectedFile!,
                    onRemove: _removeSelectedFile,
                  )
                else if (isUploading)
                  UploadProgressWidget(
                    progress: uploadProgress,
                    onCancel: _cancelUpload,
                  ),

                SizedBox(height: 4.h),

                // Import Methods
                if (!isUploading && !showSuccessAnimation) ...[
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.w),
                    child: Text(
                      'Import Methods',
                      style:
                          AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  SizedBox(height: 2.h),
                  SizedBox(
                    height: 12.h,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: EdgeInsets.symmetric(horizontal: 4.w),
                      children: [
                        ImportMethodButtonWidget(
                          iconName: kIsWeb
                              ? 'folder'
                              : (Platform.isIOS ? 'folder' : 'folder_open'),
                          label: kIsWeb
                              ? 'Browse Files'
                              : (Platform.isIOS ? 'Files App' : 'File Manager'),
                          onTap: _selectFromFiles,
                        ),
                        ImportMethodButtonWidget(
                          iconName: 'cloud',
                          label: 'Google Drive',
                          onTap: _selectFromGoogleDrive,
                        ),
                        ImportMethodButtonWidget(
                          iconName: 'cloud_download',
                          label: 'Dropbox',
                          onTap: _selectFromDropbox,
                        ),
                        ImportMethodButtonWidget(
                          iconName: 'camera_alt',
                          label: 'Camera Scan',
                          onTap: _scanWithCamera,
                          isEnabled: _cameras.isNotEmpty,
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 4.h),

                  // Recent Files
                  RecentFilesWidget(
                    recentFiles: recentFiles,
                    onFileSelected: _selectRecentFile,
                  ),
                ],
              ],

              SizedBox(height: 4.h),

              // Import Button
              if (!isUploading && !showSuccessAnimation && !isProcessing)
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.w),
                  child: SizedBox(
                    width: double.infinity,
                    height: 6.h,
                    child: ElevatedButton(
                      onPressed: selectedFile != null ? _importFile : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: selectedFile != null
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
                            iconName: 'auto_fix_high',
                            color: AppTheme.lightTheme.colorScheme.onSecondary,
                            size: 20,
                          ),
                          SizedBox(width: 2.w),
                          Text(
                            'Import & Enhance PDF',
                            style: AppTheme.lightTheme.textTheme.titleMedium
                                ?.copyWith(
                              color:
                                  AppTheme.lightTheme.colorScheme.onSecondary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
