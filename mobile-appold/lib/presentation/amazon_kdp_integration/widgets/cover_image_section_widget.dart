import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class CoverImageSectionWidget extends StatefulWidget {
  final String? defaultCoverUrl;
  final String? customCoverPath;
  final VoidCallback onUploadCustomCover;

  const CoverImageSectionWidget({
    super.key,
    this.defaultCoverUrl,
    this.customCoverPath,
    required this.onUploadCustomCover,
  });

  @override
  State<CoverImageSectionWidget> createState() =>
      _CoverImageSectionWidgetState();
}

class _CoverImageSectionWidgetState extends State<CoverImageSectionWidget> {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cover Image',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurface,
          ),
        ),
        SizedBox(height: 2.h),
        Container(
          width: double.infinity,
          padding: EdgeInsets.all(4.w),
          decoration: BoxDecoration(
            color: AppTheme.lightTheme.colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.lightTheme.colorScheme.outline,
              width: 1,
            ),
          ),
          child: Column(
            children: [
              _buildCoverPreview(),
              SizedBox(height: 3.h),
              _buildCoverOptions(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCoverPreview() {
    return Container(
      width: 40.w,
      height: 25.h,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppTheme.lightTheme.colorScheme.outline,
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: widget.customCoverPath != null
            ? _buildCustomCover()
            : _buildDefaultCover(),
      ),
    );
  }

  Widget _buildDefaultCover() {
    return widget.defaultCoverUrl != null
        ? CustomImageWidget(
            imageUrl: widget.defaultCoverUrl!,
            width: 40.w,
            height: 25.h,
            fit: BoxFit.cover,
          )
        : Container(
            color: AppTheme.lightTheme.colorScheme.surfaceContainerHighest,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'image',
                  color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  size: 48,
                ),
                SizedBox(height: 1.h),
                Text(
                  'PDF First Page',
                  style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                Text(
                  'Default Cover',
                  style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
  }

  Widget _buildCustomCover() {
    return Stack(
      children: [
        Container(
          width: double.infinity,
          height: double.infinity,
          color: AppTheme.lightTheme.colorScheme.primaryContainer,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CustomIconWidget(
                iconName: 'photo',
                color: AppTheme.lightTheme.colorScheme.primary,
                size: 48,
              ),
              SizedBox(height: 1.h),
              Text(
                'Custom Cover',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.primary,
                ),
                textAlign: TextAlign.center,
              ),
              Text(
                'Uploaded',
                style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.primary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        Positioned(
          top: 2.w,
          right: 2.w,
          child: Container(
            padding: EdgeInsets.all(1.w),
            decoration: BoxDecoration(
              color: AppTheme.lightTheme.colorScheme.primary,
              shape: BoxShape.circle,
            ),
            child: CustomIconWidget(
              iconName: 'check',
              color: AppTheme.lightTheme.colorScheme.onPrimary,
              size: 16,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCoverOptions() {
    return Column(
      children: [
        if (widget.customCoverPath == null) ...[
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(3.w),
            decoration: BoxDecoration(
              color: AppTheme.lightTheme.colorScheme.secondaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                CustomIconWidget(
                  iconName: 'info',
                  color: AppTheme.lightTheme.colorScheme.onSecondaryContainer,
                  size: 20,
                ),
                SizedBox(width: 3.w),
                Expanded(
                  child: Text(
                    'Using first page of your PDF as cover. You can upload a custom cover below.',
                    style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                      color:
                          AppTheme.lightTheme.colorScheme.onSecondaryContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 2.h),
        ],
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: widget.onUploadCustomCover,
            icon: CustomIconWidget(
              iconName: widget.customCoverPath != null ? 'edit' : 'upload',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 20,
            ),
            label: Text(
              widget.customCoverPath != null
                  ? 'Change Custom Cover'
                  : 'Upload Custom Cover',
            ),
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 2.h),
            ),
          ),
        ),
        SizedBox(height: 1.h),
        Text(
          'Recommended: 2560 x 1600 pixels, JPEG or PNG format',
          style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
