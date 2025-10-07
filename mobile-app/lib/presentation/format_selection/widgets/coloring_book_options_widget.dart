import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';
import '../../../theme/app_theme.dart';

class ColoringBookOptionsWidget extends StatelessWidget {
  final bool includePrintable;
  final Function(bool) onToggleChanged;

  const ColoringBookOptionsWidget({
    super.key,
    required this.includePrintable,
    required this.onToggleChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color:
            AppTheme.lightTheme.colorScheme.secondary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppTheme.lightTheme.colorScheme.outline.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Coloring Book Options',
            style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: AppTheme.lightTheme.colorScheme.secondary,
            ),
          ),
          SizedBox(height: 2.h),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onToggleChanged(!includePrintable),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 2.w, vertical: 1.h),
                child: Row(
                  children: [
                    Switch(
                      value: includePrintable,
                      onChanged: onToggleChanged,
                      activeThumbColor: AppTheme.lightTheme.colorScheme.secondary,
                      activeTrackColor: AppTheme
                          .lightTheme.colorScheme.secondary
                          .withValues(alpha: 0.3),
                      inactiveThumbColor:
                          AppTheme.lightTheme.colorScheme.outline,
                      inactiveTrackColor: AppTheme
                          .lightTheme.colorScheme.outline
                          .withValues(alpha: 0.2),
                    ),
                    SizedBox(width: 3.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Include Printable Version',
                            style: AppTheme.lightTheme.textTheme.bodyMedium
                                ?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: AppTheme.lightTheme.colorScheme.onSurface,
                            ),
                          ),
                          SizedBox(height: 0.5.h),
                          Text(
                            'Generate high-resolution PDF for printing',
                            style: AppTheme.lightTheme.textTheme.bodySmall
                                ?.copyWith(
                              color: AppTheme
                                  .lightTheme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
