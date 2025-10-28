import 'package:kdp_creator_suite/lib\theme\app_theme.dart';import 'package:sizer/sizer.dart';

class StorageManagementWidget extends StatelessWidget {
  final double usedSpace;
  final double totalSpace;
  final VoidCallback onClearCache;
  final VoidCallback onDeleteAllProjects;

  const StorageManagementWidget({
    super.key,
    required this.usedSpace,
    required this.totalSpace,
    required this.onClearCache,
    required this.onDeleteAllProjects,
  });

  @override
  Widget build(BuildContext context) {
    final usagePercentage = (usedSpace / totalSpace).clamp(0.0, 1.0);

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Storage Management',
            style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 3.h),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Used Space',
                style: AppTheme.lightTheme.textTheme.bodyMedium,
              ),
              Text(
                '${usedSpace.toStringAsFixed(1)} GB of ${totalSpace.toStringAsFixed(1)} GB',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          SizedBox(height: 2.h),
          Container(
            height: 1.h,
            decoration: BoxDecoration(
              color: AppTheme.lightTheme.colorScheme.outline
                  .withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(0.5.h),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: usagePercentage,
              child: Container(
                decoration: BoxDecoration(
                  color: usagePercentage > 0.8
                      ? AppTheme.lightTheme.colorScheme.error
                      : usagePercentage > 0.6
                          ? Color(0xFFF39C12)
                          : AppTheme.lightTheme.colorScheme.secondary,
                  borderRadius: BorderRadius.circular(0.5.h),
                ),
              ),
            ),
          ),
          SizedBox(height: 3.h),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onClearCache,
                  icon: CustomIconWidget(
                    iconName: 'cleaning_services',
                    color: AppTheme.lightTheme.colorScheme.primary,
                    size: 18,
                  ),
                  label: Text(
                    'Clear Cache',
                    style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 1.5.h),
                  ),
                ),
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onDeleteAllProjects,
                  icon: CustomIconWidget(
                    iconName: 'delete_forever',
                    color: AppTheme.lightTheme.colorScheme.error,
                    size: 18,
                  ),
                  label: Text(
                    'Delete All',
                    style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                      color: AppTheme.lightTheme.colorScheme.error,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: AppTheme.lightTheme.colorScheme.error,
                      width: 1,
                    ),
                    padding: EdgeInsets.symmetric(vertical: 1.5.h),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
