import 'package:sizer/sizer.dart';import 'package:kdp_creator_suite/theme/app_theme.dart';

class SettingsSectionWidget extends StatelessWidget {
  final String title;
  final List<SettingsItem> items;

  const SettingsSectionWidget({
    super.key,
    required this.title,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
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
          Padding(
            padding: EdgeInsets.fromLTRB(4.w, 3.h, 4.w, 1.h),
            child: Text(
              title,
              style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (context, index) => Divider(
              height: 1,
              color: AppTheme.lightTheme.colorScheme.outline
                  .withValues(alpha: 0.3),
              indent: 4.w,
              endIndent: 4.w,
            ),
            itemBuilder: (context, index) {
              final item = items[index];
              return InkWell(
                onTap: item.onTap,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.h),
                  child: Row(
                    children: [
                      if (item.iconName != null) ...[
                        CustomIconWidget(
                          iconName: item.iconName!,
                          color: item.iconColor ??
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                          size: 20,
                        ),
                        SizedBox(width: 3.w),
                      ],
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: AppTheme.lightTheme.textTheme.bodyLarge
                                  ?.copyWith(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (item.subtitle != null) ...[
                              SizedBox(height: 0.5.h),
                              Text(
                                item.subtitle!,
                                style: AppTheme.lightTheme.textTheme.bodySmall
                                    ?.copyWith(
                                  color: AppTheme
                                      .lightTheme.colorScheme.onSurfaceVariant,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (item.trailing != null) ...[
                        SizedBox(width: 2.w),
                        item.trailing!,
                      ] else if (item.hasArrow) ...[
                        SizedBox(width: 2.w),
                        CustomIconWidget(
                          iconName: 'chevron_right',
                          color:
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                          size: 18,
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
          SizedBox(height: 1.h),
        ],
      ),
    );
  }
}

class SettingsItem {
  final String title;
  final String? subtitle;
  final String? iconName;
  final Color? iconColor;
  final Widget? trailing;
  final bool hasArrow;
  final VoidCallback? onTap;

  SettingsItem({
    required this.title,
    this.subtitle,
    this.iconName,
    this.iconColor,
    this.trailing,
    this.hasArrow = true,
    this.onTap,
  });
}
