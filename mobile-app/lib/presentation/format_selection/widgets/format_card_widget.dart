import 'package:sizer/sizer.dart';import 'package:kdp_creator_suite/theme/app_theme.dart';

class FormatCardWidget extends StatelessWidget {
  final String title;
  final String description;
  final String iconName;
  final bool isSelected;
  final bool isExpanded;
  final VoidCallback onTap;
  final Widget? expandedContent;

  const FormatCardWidget({
    super.key,
    required this.title,
    required this.description,
    required this.iconName,
    required this.isSelected,
    required this.onTap,
    this.isExpanded = false,
    this.expandedContent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: EdgeInsets.all(4.w),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppTheme.lightTheme.colorScheme.secondary
                      .withValues(alpha: 0.1)
                  : AppTheme.lightTheme.colorScheme.surface,
              border: Border.all(
                color: isSelected
                    ? AppTheme.lightTheme.colorScheme.secondary
                    : AppTheme.lightTheme.colorScheme.outline,
                width: isSelected ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.lightTheme.colorScheme.shadow,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(2.w),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.lightTheme.colorScheme.secondary
                            : AppTheme.lightTheme.colorScheme.outline
                                .withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: CustomIconWidget(
                        iconName: iconName,
                        color: isSelected
                            ? AppTheme.lightTheme.colorScheme.surface
                            : AppTheme.lightTheme.colorScheme.onSurface,
                        size: 6.w,
                      ),
                    ),
                    SizedBox(width: 3.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: AppTheme.lightTheme.textTheme.titleMedium
                                ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: isSelected
                                  ? AppTheme.lightTheme.colorScheme.secondary
                                  : AppTheme.lightTheme.colorScheme.onSurface,
                            ),
                          ),
                          SizedBox(height: 0.5.h),
                          Text(
                            description,
                            style: AppTheme.lightTheme.textTheme.bodySmall
                                ?.copyWith(
                              color: AppTheme
                                  .lightTheme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 6.w,
                      height: 6.w,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected
                              ? AppTheme.lightTheme.colorScheme.secondary
                              : AppTheme.lightTheme.colorScheme.outline,
                          width: 2,
                        ),
                        color: isSelected
                            ? AppTheme.lightTheme.colorScheme.secondary
                            : Colors.transparent,
                      ),
                      child: isSelected
                          ? CustomIconWidget(
                              iconName: 'check',
                              color: AppTheme.lightTheme.colorScheme.surface,
                              size: 3.w,
                            )
                          : null,
                    ),
                  ],
                ),
                if (isExpanded && expandedContent != null) ...[
                  SizedBox(height: 2.h),
                  expandedContent!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
