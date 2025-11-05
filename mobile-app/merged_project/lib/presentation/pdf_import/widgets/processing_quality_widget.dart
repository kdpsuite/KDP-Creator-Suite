import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';
import 'package:kdp_creator_suite/lib\theme\app_theme.dart';

class ProcessingQualityWidget extends StatelessWidget {
  final Map<String, dynamic> qualitySettings;
  final Function(Map<String, dynamic>) onSettingsChanged;

  const ProcessingQualityWidget({
    super.key,
    required this.qualitySettings,
    required this.onSettingsChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.h),
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
          Row(
            children: [
              CustomIconWidget(
                iconName: 'tune',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 24,
              ),
              SizedBox(width: 3.w),
              Text(
                'Processing Quality',
                style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          SizedBox(height: 3.h),

          // OCR Settings
          _buildSettingSection(
            'OCR for Scanned PDFs',
            'Optical Character Recognition for better text extraction',
            [
              _buildSwitchTile(
                'Enable OCR',
                'Extract text from scanned documents',
                qualitySettings['enable_ocr'] ?? false,
                (value) => _updateSetting('enable_ocr', value),
              ),
              if (qualitySettings['enable_ocr'] == true) ...[
                _buildDropdownTile(
                  'OCR Language',
                  qualitySettings['ocr_language'] ?? 'eng',
                  [
                    'eng',
                    'spa',
                    'fra',
                    'deu',
                    'ita',
                    'por',
                    'rus',
                    'jpn',
                    'kor',
                    'chi_sim'
                  ],
                  (value) => _updateSetting('ocr_language', value),
                ),
              ],
            ],
          ),

          SizedBox(height: 2.h),

          // Image Processing
          _buildSettingSection(
            'Image Optimization',
            'Enhance image quality and reduce file size',
            [
              _buildSwitchTile(
                'Optimize Images',
                'Compress and enhance images for target format',
                qualitySettings['optimize_images'] ?? true,
                (value) => _updateSetting('optimize_images', value),
              ),
              if (qualitySettings['optimize_images'] == true) ...[
                _buildSliderTile(
                  'Image Quality',
                  qualitySettings['image_quality'] ?? 85.0,
                  0.0,
                  100.0,
                  (value) => _updateSetting('image_quality', value),
                ),
                _buildSliderTile(
                  'Target DPI',
                  qualitySettings['target_dpi'] ?? 150.0,
                  72.0,
                  300.0,
                  (value) => _updateSetting('target_dpi', value),
                ),
              ],
            ],
          ),

          SizedBox(height: 2.h),

          // Layout Preservation
          _buildSettingSection(
            'Layout & Formatting',
            'Preserve original document structure',
            [
              _buildSwitchTile(
                'Preserve Layout',
                'Maintain original formatting and positioning',
                qualitySettings['preserve_layout'] ?? true,
                (value) => _updateSetting('preserve_layout', value),
              ),
              _buildSwitchTile(
                'Font Embedding',
                'Include fonts to maintain appearance',
                qualitySettings['embed_fonts'] ?? true,
                (value) => _updateSetting('embed_fonts', value),
              ),
              _buildDropdownTile(
                'Compression Level',
                qualitySettings['compression'] ?? 'medium',
                ['none', 'low', 'medium', 'high', 'maximum'],
                (value) => _updateSetting('compression', value),
              ),
            ],
          ),

          SizedBox(height: 2.h),

          // Advanced Options
          ExpansionTile(
            leading: CustomIconWidget(
              iconName: 'settings',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 20,
            ),
            title: Text(
              'Advanced Options',
              style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
            children: [
              _buildSwitchTile(
                'Batch Processing',
                'Enable processing multiple files simultaneously',
                qualitySettings['batch_processing'] ?? false,
                (value) => _updateSetting('batch_processing', value),
              ),
              _buildSwitchTile(
                'Quality Validation',
                'Automatically validate conversion results',
                qualitySettings['quality_validation'] ?? true,
                (value) => _updateSetting('quality_validation', value),
              ),
              _buildSliderTile(
                'Processing Threads',
                qualitySettings['processing_threads'] ?? 2.0,
                1.0,
                4.0,
                (value) => _updateSetting('processing_threads', value),
                divisions: 3,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSettingSection(
    String title,
    String description,
    List<Widget> children,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppTheme.lightTheme.colorScheme.secondary,
          ),
        ),
        SizedBox(height: 0.5.h),
        Text(
          description,
          style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
          ),
        ),
        SizedBox(height: 1.h),
        ...children,
      ],
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
            activeThumbColor: AppTheme.lightTheme.colorScheme.secondary,
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
                    option.toUpperCase(),
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
                value.toInt().toString(),
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
            divisions: divisions ?? (max - min).toInt(),
            activeColor: AppTheme.lightTheme.colorScheme.secondary,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  void _updateSetting(String key, dynamic value) {
    final updatedSettings = Map<String, dynamic>.from(qualitySettings);
    updatedSettings[key] = value;
    onSettingsChanged(updatedSettings);
  }
}
