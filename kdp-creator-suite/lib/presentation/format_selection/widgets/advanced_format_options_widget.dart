import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class AdvancedFormatOptionsWidget extends StatelessWidget {
  final String selectedFormat;
  final Map<String, dynamic> formatSettings;
  final Function(Map<String, dynamic>) onSettingsChanged;

  const AdvancedFormatOptionsWidget({
    super.key,
    required this.selectedFormat,
    required this.formatSettings,
    required this.onSettingsChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.lightTheme.colorScheme.outline.withAlpha(51),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              CustomIconWidget(
                iconName: 'settings',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 20,
              ),
              SizedBox(width: 2.w),
              Text(
                '${_getFormatDisplayName(selectedFormat)} Settings',
                style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),

          SizedBox(height: 3.h),

          // Format-specific settings
          ...(_buildFormatSpecificSettings()),
        ],
      ),
    );
  }

  List<Widget> _buildFormatSpecificSettings() {
    switch (selectedFormat) {
      case 'kindle':
      case 'epub':
        return _buildEbookSettings();
      case 'mobi':
        return _buildMobiSettings();
      case 'paperback':
      case 'hardcover':
        return _buildPrintSettings();
      case 'coloring_book':
        return _buildColoringBookSettings();
      default:
        return [];
    }
  }

  List<Widget> _buildEbookSettings() {
    return [
      _buildSectionHeader('Text & Layout'),
      _buildSwitchTile(
        'Reflowable Text',
        'Allow text to adapt to different screen sizes',
        formatSettings['reflowable'] ?? true,
        (value) => _updateSetting('reflowable', value),
      ),
      _buildDropdownTile(
        'Font Embedding',
        formatSettings['font_embedding'] ?? 'selective',
        ['none', 'selective', 'all'],
        (value) => _updateSetting('font_embedding', value),
      ),
      _buildSliderTile(
        'Base Font Size',
        formatSettings['base_font_size'] ?? 12.0,
        8.0,
        18.0,
        (value) => _updateSetting('base_font_size', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Image Processing'),
      _buildSliderTile(
        'Image DPI',
        formatSettings['image_dpi'] ?? 150.0,
        72.0,
        300.0,
        (value) => _updateSetting('image_dpi', value),
      ),
      _buildDropdownTile(
        'Image Compression',
        formatSettings['image_compression'] ?? 'medium',
        ['none', 'low', 'medium', 'high'],
        (value) => _updateSetting('image_compression', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Navigation'),
      _buildSwitchTile(
        'Generate Table of Contents',
        'Automatically create navigation from headings',
        formatSettings['generate_toc'] ?? true,
        (value) => _updateSetting('generate_toc', value),
      ),
      _buildSwitchTile(
        'Chapter Breaks',
        'Start each chapter on a new page',
        formatSettings['chapter_breaks'] ?? true,
        (value) => _updateSetting('chapter_breaks', value),
      ),
    ];
  }

  List<Widget> _buildMobiSettings() {
    return [
      _buildSectionHeader('MOBI Specific'),
      _buildSwitchTile(
        'Legacy Compatibility',
        'Support older Kindle devices',
        formatSettings['legacy_compatibility'] ?? false,
        (value) => _updateSetting('legacy_compatibility', value),
      ),
      _buildDropdownTile(
        'Compression Level',
        formatSettings['compression_level'] ?? 'high',
        ['none', 'low', 'medium', 'high', 'maximum'],
        (value) => _updateSetting('compression_level', value),
      ),
      _buildSliderTile(
        'Max Image Size (KB)',
        formatSettings['max_image_size'] ?? 64.0,
        32.0,
        128.0,
        (value) => _updateSetting('max_image_size', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Text Processing'),
      _buildSwitchTile(
        'Remove Extra Spacing',
        'Optimize text formatting for MOBI',
        formatSettings['remove_extra_spacing'] ?? true,
        (value) => _updateSetting('remove_extra_spacing', value),
      ),
    ];
  }

  List<Widget> _buildPrintSettings() {
    return [
      _buildSectionHeader('Page Setup'),
      _buildDropdownTile(
        'Page Size',
        formatSettings['page_size'] ?? 'US Letter',
        ['A4', 'US Letter', 'A5', 'B5', '6x9 inch', '5.5x8.5 inch'],
        (value) => _updateSetting('page_size', value),
      ),
      _buildSliderTile(
        'Margin (inches)',
        formatSettings['margin'] ?? 1.0,
        0.5,
        2.0,
        (value) => _updateSetting('margin', value),
      ),
      _buildSliderTile(
        'Binding Offset (inches)',
        formatSettings['binding_offset'] ?? 0.25,
        0.0,
        1.0,
        (value) => _updateSetting('binding_offset', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Print Quality'),
      _buildSliderTile(
        'Print DPI',
        formatSettings['print_dpi'] ?? 300.0,
        150.0,
        600.0,
        (value) => _updateSetting('print_dpi', value),
      ),
      _buildDropdownTile(
        'Color Profile',
        formatSettings['color_profile'] ?? 'CMYK',
        ['RGB', 'CMYK', 'Grayscale'],
        (value) => _updateSetting('color_profile', value),
      ),
      _buildSwitchTile(
        'Bleed Area',
        'Add bleed area for professional printing',
        formatSettings['bleed_area'] ?? selectedFormat == 'hardcover',
        (value) => _updateSetting('bleed_area', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Layout'),
      _buildSwitchTile(
        'Mirror Margins',
        'Different margins for left/right pages',
        formatSettings['mirror_margins'] ?? true,
        (value) => _updateSetting('mirror_margins', value),
      ),
      _buildSwitchTile(
        'Page Numbers',
        'Add page numbers to footer',
        formatSettings['page_numbers'] ?? true,
        (value) => _updateSetting('page_numbers', value),
      ),
    ];
  }

  List<Widget> _buildColoringBookSettings() {
    return [
      _buildSectionHeader('Line Processing'),
      _buildSliderTile(
        'Line Thickness',
        formatSettings['line_thickness'] ?? 2.0,
        1.0,
        5.0,
        (value) => _updateSetting('line_thickness', value),
      ),
      _buildSliderTile(
        'Edge Detection Sensitivity',
        formatSettings['edge_sensitivity'] ?? 75.0,
        0.0,
        100.0,
        (value) => _updateSetting('edge_sensitivity', value),
      ),
      _buildSwitchTile(
        'Enhance Lines',
        'Improve line clarity and consistency',
        formatSettings['enhance_lines'] ?? true,
        (value) => _updateSetting('enhance_lines', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Page Layout'),
      _buildSwitchTile(
        'Single Image Per Page',
        'One coloring image per page',
        formatSettings['single_image_per_page'] ?? true,
        (value) => _updateSetting('single_image_per_page', value),
      ),
      _buildSwitchTile(
        'Add Border',
        'Decorative border around each page',
        formatSettings['add_border'] ?? false,
        (value) => _updateSetting('add_border', value),
      ),
      _buildSliderTile(
        'Image Scale',
        formatSettings['image_scale'] ?? 85.0,
        50.0,
        100.0,
        (value) => _updateSetting('image_scale', value),
      ),
      SizedBox(height: 2.h),
      _buildSectionHeader('Additional Options'),
      _buildSwitchTile(
        'Include Printable Version',
        'Generate high-res version for printing',
        formatSettings['include_printable'] ?? true,
        (value) => _updateSetting('include_printable', value),
      ),
      _buildSwitchTile(
        'Remove Text',
        'Remove all text elements',
        formatSettings['remove_text'] ?? true,
        (value) => _updateSetting('remove_text', value),
      ),
    ];
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: EdgeInsets.only(bottom: 1.h),
      child: Text(
        title,
        style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: AppTheme.lightTheme.colorScheme.secondary,
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    bool value,
    Function(bool) onChanged,
  ) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 0.5.h),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  subtitle,
                  style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppTheme.lightTheme.colorScheme.secondary,
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownTile(
    String title,
    String value,
    List<String> options,
    Function(String) onChanged,
  ) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 1.h),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 1.h),
            decoration: BoxDecoration(
              border: Border.all(
                color: AppTheme.lightTheme.colorScheme.outline.withAlpha(77),
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButton<String>(
              value: value,
              underline: const SizedBox(),
              onChanged: (newValue) {
                if (newValue != null) onChanged(newValue);
              },
              items: options.map((option) {
                return DropdownMenuItem<String>(
                  value: option,
                  child: Text(
                    option,
                    style: AppTheme.lightTheme.textTheme.bodySmall,
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliderTile(
    String title,
    double value,
    double min,
    double max,
    Function(double) onChanged, {
    int? divisions,
  }) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 1.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                _formatSliderValue(value, title),
                style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.secondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions ?? ((max - min) * 10).toInt(),
            activeColor: AppTheme.lightTheme.colorScheme.secondary,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  String _formatSliderValue(double value, String title) {
    if (title.contains('DPI') || title.contains('Size')) {
      return value.toInt().toString();
    } else if (title.contains('inches') || title.contains('Scale')) {
      return value.toStringAsFixed(1);
    } else if (title.contains('%')) {
      return '${value.toInt()}%';
    }
    return value.toStringAsFixed(1);
  }

  String _getFormatDisplayName(String format) {
    switch (format) {
      case 'kindle':
        return 'Kindle';
      case 'epub':
        return 'EPUB';
      case 'mobi':
        return 'MOBI';
      case 'paperback':
        return 'Paperback';
      case 'hardcover':
        return 'Hardcover';
      case 'coloring_book':
        return 'Coloring Book';
      default:
        return format.toUpperCase();
    }
  }

  void _updateSetting(String key, dynamic value) {
    final updatedSettings = Map<String, dynamic>.from(formatSettings);
    updatedSettings[key] = value;
    onSettingsChanged(updatedSettings);
  }
}
