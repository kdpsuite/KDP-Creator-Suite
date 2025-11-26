import 'package:sizer/sizer.dart';import 'package:kdp_creator_suite/theme/app_theme.dart';

class BottomActionWidget extends StatelessWidget {
  final int selectedFormatsCount;
  final VoidCallback onStartConversion;

  const BottomActionWidget({
    super.key,
    required this.selectedFormatsCount,
    required this.onStartConversion,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = selectedFormatsCount > 0;

    return Container(
      padding: EdgeInsets.fromLTRB(4.w, 2.h, 4.w, 3.h),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color:
                AppTheme.lightTheme.colorScheme.outline.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.lightTheme.colorScheme.shadow,
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selectedFormatsCount > 0) ...[
              Container(
                padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
                decoration: BoxDecoration(
                  color: AppTheme.lightTheme.colorScheme.secondary
                      .withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CustomIconWidget(
                      iconName: 'check_circle',
                      color: AppTheme.lightTheme.colorScheme.secondary,
                      size: 4.w,
                    ),
                    SizedBox(width: 2.w),
                    Text(
                      '$selectedFormatsCount format${selectedFormatsCount > 1 ? 's' : ''} selected',
                      style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                        color: AppTheme.lightTheme.colorScheme.secondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 2.h),
            ],
            SizedBox(
              width: double.infinity,
              height: 6.h,
              child: ElevatedButton(
                onPressed: isEnabled ? onStartConversion : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isEnabled
                      ? AppTheme.lightTheme.colorScheme.secondary
                      : AppTheme.lightTheme.colorScheme.outline
                          .withValues(alpha: 0.3),
                  foregroundColor: isEnabled
                      ? AppTheme.lightTheme.colorScheme.surface
                      : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  elevation: isEnabled ? 2 : 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (isEnabled) ...[
                      CustomIconWidget(
                        iconName: 'play_arrow',
                        color: AppTheme.lightTheme.colorScheme.surface,
                        size: 5.w,
                      ),
                      SizedBox(width: 2.w),
                    ],
                    Text(
                      'Start Conversion',
                      style:
                          AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                        color: isEnabled
                            ? AppTheme.lightTheme.colorScheme.surface
                            : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
