import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class UploadAreaWidget extends StatelessWidget {
  final VoidCallback onTap;
  final bool hasSelectedFile;

  const UploadAreaWidget({
    super.key,
    required this.onTap,
    this.hasSelectedFile = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 85.w,
        height: 25.h,
        decoration: BoxDecoration(
          border: Border.all(
            color: hasSelectedFile
                ? AppTheme.lightTheme.colorScheme.secondary
                : AppTheme.lightTheme.colorScheme.outline,
            width: 2,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(16),
          color: hasSelectedFile
              ? AppTheme.lightTheme.colorScheme.secondaryContainer
              : AppTheme.lightTheme.colorScheme.surface,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CustomIconWidget(
              iconName: hasSelectedFile ? 'check_circle' : 'cloud_upload',
              color: hasSelectedFile
                  ? AppTheme.lightTheme.colorScheme.secondary
                  : AppTheme.lightTheme.colorScheme.primary,
              size: 48,
            ),
            SizedBox(height: 2.h),
            Text(
              hasSelectedFile ? 'PDF Selected' : 'Select PDF File',
              style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                color: hasSelectedFile
                    ? AppTheme.lightTheme.colorScheme.secondary
                    : AppTheme.lightTheme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 1.h),
            Text(
              hasSelectedFile
                  ? 'Tap to change file'
                  : 'Tap to browse or drag & drop',
              style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
