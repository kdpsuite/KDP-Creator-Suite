import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sizer/sizer.dart';

import 'package:kdp_creator_suite/theme/app_theme.dart';
import '../../core/app_export.dart';
import '../../services/pdf_processing_service.dart';
import './widgets/advanced_settings_widget.dart';
import './widgets/bottom_action_widget.dart';
import './widgets/coloring_book_options_widget.dart';
import './widgets/format_card_widget.dart';
import './widgets/kindle_options_widget.dart';
import './widgets/pdf_preview_widget.dart';

class FormatSelection extends StatefulWidget {
  const FormatSelection({super.key});

  @override
  State<FormatSelection> createState() => _FormatSelectionState();
}

class _FormatSelectionState extends State<FormatSelection> {
  final PdfProcessingService _pdfService = PdfProcessingService();
  Uint8List? _sourcePdfBytes;
  Map<String, dynamic>? _lastConversionResult;
  bool _initializedFromArgs = false;

  final Map<String, dynamic> pdfData = {
    "fileName": "My Novel Draft - Chapter 1-5.pdf",
    "pageCount": 127,
    "fileSize": "2.4 MB",
  };

  // Format selection states
  final Map<String, bool> selectedFormats = {
    'kindle': false,
    'coloring': false,
    'paperback': false,
    'hardcover': false,
    'bundle': false,
  };

  // Kindle options
  String selectedKindleOption = 'standard';

  // Coloring book options
  bool includePrintableVersion = false;

  // Advanced settings
  bool showAdvancedSettings = false;

  // Format data
  final List<Map<String, dynamic>> formatOptions = [
    {
      'key': 'kindle',
      'title': 'Kindle eBook',
      'description': 'Amazon Kindle compatible format with reflowable text',
      'icon': 'menu_book',
    },
    {
      'key': 'coloring',
      'title': 'Kids Coloring Book',
      'description': 'Interactive coloring pages for children',
      'icon': 'palette',
    },
    {
      'key': 'paperback',
      'title': 'Paperback',
      'description': 'Print-ready paperback book format',
      'icon': 'book',
    },
    {
      'key': 'hardcover',
      'title': 'Hardcover',
      'description': 'Premium hardcover book layout',
      'icon': 'auto_stories',
    },
    {
      'key': 'bundle',
      'title': 'All Formats Bundle',
      'description': 'Generate all available formats at once',
      'icon': 'inventory_2',
    },
  ];

  @override
  void initState() {
    super.initState();
    // Set Kindle eBook as expanded by default
    selectedFormats['kindle'] = true;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initializedFromArgs) return;
    _initializedFromArgs = true;

    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is! Map<String, dynamic>) return;

    final bytes = args['bytes'];
    if (bytes is Uint8List && bytes.isNotEmpty) {
      _sourcePdfBytes = bytes;
    }

    if (args['name'] != null) {
      pdfData['fileName'] = args['name'];
    }
    if (args['pages'] != null) {
      pdfData['pageCount'] = args['pages'];
    }
    if (args['size'] != null) {
      pdfData['fileSize'] = args['size'];
    }
  }

  void _toggleFormat(String formatKey) {
    setState(() {
      if (formatKey == 'bundle') {
        // If bundle is selected, deselect all others
        if (!selectedFormats['bundle']!) {
          selectedFormats.updateAll((key, value) => key == 'bundle');
        } else {
          selectedFormats['bundle'] = false;
        }
      } else {
        // If any individual format is selected, deselect bundle
        selectedFormats['bundle'] = false;
        selectedFormats[formatKey] = !selectedFormats[formatKey]!;
      }
    });

    // Haptic feedback
    HapticFeedback.lightImpact();
  }

  void _onKindleOptionChanged(String option) {
    setState(() {
      selectedKindleOption = option;
    });
  }

  void _onPrintableToggleChanged(bool value) {
    setState(() {
      includePrintableVersion = value;
    });
  }

  void _toggleAdvancedSettings() {
    setState(() {
      showAdvancedSettings = !showAdvancedSettings;
    });
  }

  void _startConversion() {
    final selectedCount =
        selectedFormats.values.where((selected) => selected).length;

    if (selectedCount == 0) return;

    // Show conversion started message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Starting conversion for $selectedCount format${selectedCount > 1 ? 's' : ''}...',
          style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
            color: AppTheme.lightTheme.colorScheme.surface,
          ),
        ),
        backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        action: SnackBarAction(
          label: 'View Progress',
          textColor: AppTheme.lightTheme.colorScheme.surface,
          onPressed: () {
            // Navigate to conversion progress screen
            Navigator.pushNamed(context, '/project-library');
          },
        ),
      ),
    );

    // Haptic feedback
    HapticFeedback.mediumImpact();
  }

  int get _selectedFormatsCount {
    return selectedFormats.values.where((selected) => selected).length;
  }

  void _showErrorMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  Future<void> _exportToCloudStorage() async {
    if (_selectedFormatsCount == 0) {
      _showErrorMessage('Please select a format first');
      return;
    }

    // Generate the file data (this would be your actual conversion logic)
    final fileBytes = await _generateFileBytes();
    final fileName = _generateFileName();

    if (fileBytes != null && fileName != null) {
      Navigator.pushNamed(
        context,
        AppRoutes.cloudExport,
        arguments: {
          'fileBytes': fileBytes,
          'fileName': fileName,
          'format': 'selected_format',
        },
      );
    } else {
      _showErrorMessage('Failed to prepare file for export');
    }
  }

  String _resolvePrimaryFormatKey() {
    if (selectedFormats['bundle'] == true) {
      return 'paperback';
    }

    const formatOrder = ['kindle', 'coloring', 'paperback', 'hardcover'];
    for (final formatKey in formatOrder) {
      if (selectedFormats[formatKey] == true) {
        return formatKey;
      }
    }

    return 'paperback';
  }

  String _mapFormatKeyToServiceFormat(String formatKey) {
    switch (formatKey) {
      case 'kindle':
        return 'kindle';
      case 'coloring':
        return 'coloring_book';
      case 'paperback':
        return 'paperback';
      case 'hardcover':
        return 'hardcover';
      default:
        return 'paperback';
    }
  }

  Map<String, dynamic> _buildConversionSettings() {
    return {
      if (selectedFormats['kindle'] == true)
        'kindle_quality': selectedKindleOption,
      if (selectedFormats['coloring'] == true)
        'include_printable': includePrintableVersion,
    };
  }

  Future<Uint8List?> _generateFileBytes() async {
    if (_sourcePdfBytes == null || _sourcePdfBytes!.isEmpty) {
      return null;
    }

    final formatKey = _resolvePrimaryFormatKey();
    final targetFormat = _mapFormatKeyToServiceFormat(formatKey);

    final result = await _pdfService.convertToFormat(
      _sourcePdfBytes!,
      targetFormat,
      customSettings: _buildConversionSettings(),
    );

    if (result['success'] != true) {
      return null;
    }

    _lastConversionResult = result;
    return result['bytes'] as Uint8List?;
  }

  String? _generateFileName() {
    if (_selectedFormatsCount == 0) return null;

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final formatKey = _resolvePrimaryFormatKey();
    final extension = _lastConversionResult?['file_extension'] as String? ??
        _getFileExtension(formatKey);

    return 'KindleForge_export_$timestamp.$extension';
  }

  String _getFileExtension(String formatId) {
    switch (formatId) {
      case 'kindle':
        return 'azw3';
      case 'coloring':
      case 'coloring_book':
        return 'pdf';
      case 'paperback':
      case 'hardcover':
        return 'pdf';
      case 'audiobook':
        return 'mp3';
      case 'interactive':
        return 'epub';
      default:
        return 'pdf';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.lightTheme.colorScheme.surface,
        elevation: 1,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: CustomIconWidget(
            iconName: 'arrow_back',
            color: AppTheme.lightTheme.colorScheme.onSurface,
            size: 6.w,
          ),
        ),
        title: Text(
          'Format Selection',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          TextButton(
            onPressed: _selectedFormatsCount > 0 ? _startConversion : null,
            child: Text(
              'Next',
              style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                color: _selectedFormatsCount > 0
                    ? AppTheme.lightTheme.colorScheme.secondary
                    : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          SizedBox(width: 2.w),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(vertical: 2.h),
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: 2.h),

                      // PDF Preview
                      PdfPreviewWidget(
                        fileName: pdfData["fileName"] as String,
                        pageCount: pdfData["pageCount"] as int,
                        fileSize: pdfData["fileSize"] as String,
                      ),

                      SizedBox(height: 3.h),

                      // Section Header
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 4.w),
                        child: Text(
                          'Choose Output Formats',
                          style: AppTheme.lightTheme.textTheme.headlineSmall
                              ?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),

                      SizedBox(height: 2.h),

                      // Format Cards
                      ...formatOptions.map((format) {
                        final formatKey = format['key'] as String;
                        final isSelected = selectedFormats[formatKey] ?? false;
                        final isKindleExpanded =
                            formatKey == 'kindle' && isSelected;
                        final isColoringExpanded =
                            formatKey == 'coloring' && isSelected;

                        return FormatCardWidget(
                          title: format['title'] as String,
                          description: format['description'] as String,
                          iconName: format['icon'] as String,
                          isSelected: isSelected,
                          isExpanded: isKindleExpanded || isColoringExpanded,
                          onTap: () => _toggleFormat(formatKey),
                          expandedContent: isKindleExpanded
                              ? KindleOptionsWidget(
                                  selectedOption: selectedKindleOption,
                                  onOptionChanged: _onKindleOptionChanged,
                                )
                              : isColoringExpanded
                                  ? ColoringBookOptionsWidget(
                                      includePrintable: includePrintableVersion,
                                      onToggleChanged:
                                          _onPrintableToggleChanged,
                                    )
                                  : null,
                        );
                      }),

                      SizedBox(height: 3.h),

                      // Advanced Settings
                      AdvancedSettingsWidget(
                        isExpanded: showAdvancedSettings,
                        onToggle: _toggleAdvancedSettings,
                      ),

                      SizedBox(height: 10.h), // Space for bottom action
                    ],
                  ),
                ),
              ),

              // Bottom Action Area
              BottomActionWidget(
                selectedFormatsCount: _selectedFormatsCount,
                onStartConversion: _startConversion,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
