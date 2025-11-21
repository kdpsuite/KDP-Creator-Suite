import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/widgets/custom_icon_widget.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';import 'package:sizer/sizer.dart';
import 'package:kdp_creator_suite/widgets/custom_icon_widget.dart';

class ImportMethodButtonWidget extends StatelessWidget {
  final String iconName;
  final String label;
  final VoidCallback onTap;
  final bool isEnabled;

  const ImportMethodButtonWidget({
    super.key,
    required this.iconName,
    required this.label,
    required this.onTap,
    this.isEnabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isEnabled ? onTap : null,
      child: Container(
        width: 20.w,
        padding: EdgeInsets.symmetric(vertical: 2.h, horizontal: 1.w),
        margin: EdgeInsets.symmetric(horizontal: 1.w),
        decoration: BoxDecoration(
          color: isEnabled
              ? AppTheme.lightTheme.colorScheme.surface
              : AppTheme.lightTheme.colorScheme.surface.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppTheme.lightTheme.colorScheme.outline,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: AppTheme.lightTheme.colorScheme.shadow,
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomIconWidget(
              iconName: iconName,
              color: isEnabled
                  ? AppTheme.lightTheme.colorScheme.primary
                  : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
            SizedBox(height: 1.h),
            Text(
              label,
              style: AppTheme.lightTheme.textTheme.labelSmall?.copyWith(
                color: isEnabled
                    ? AppTheme.lightTheme.colorScheme.onSurface
                    : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
