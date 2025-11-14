import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';import 'package:sizer/sizer.dart';import '../../../theme/app_theme.dart';

class KindleOptionsWidget extends StatefulWidget {
  final String selectedOption;
  final Function(String) onOptionChanged;

  const KindleOptionsWidget({
    super.key,
    required this.selectedOption,
    required this.onOptionChanged,
  });

  @override
  State<KindleOptionsWidget> createState() => _KindleOptionsWidgetState();
}

class _KindleOptionsWidgetState extends State<KindleOptionsWidget> {
  final List<Map<String, String>> kindleOptions = [
    {
      'value': 'standard',
      'title': 'Standard',
      'description': 'Regular text size and formatting',
    },
    {
      'value': 'large_print',
      'title': 'Large Print',
      'description': 'Larger text for better readability',
    },
    {
      'value': 'enhanced',
      'title': 'Enhanced',
      'description': 'Interactive features and multimedia support',
    },
  ];

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
            'Kindle Format Options',
            style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: AppTheme.lightTheme.colorScheme.secondary,
            ),
          ),
          SizedBox(height: 2.h),
          ...kindleOptions.map((option) => _buildOptionTile(option)),
        ],
      ),
    );
  }

  Widget _buildOptionTile(Map<String, String> option) {
    final isSelected = widget.selectedOption == option['value'];

    return Container(
      margin: EdgeInsets.only(bottom: 1.h),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => widget.onOptionChanged(option['value']!),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 2.h),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppTheme.lightTheme.colorScheme.secondary
                      .withValues(alpha: 0.1)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isSelected
                    ? AppTheme.lightTheme.colorScheme.secondary
                    : Colors.transparent,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 5.w,
                  height: 5.w,
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
                      ? Center(
                          child: Container(
                            width: 2.w,
                            height: 2.w,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.lightTheme.colorScheme.surface,
                            ),
                          ),
                        )
                      : null,
                ),
                SizedBox(width: 3.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        option['title']!,
                        style:
                            AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                          color: isSelected
                              ? AppTheme.lightTheme.colorScheme.secondary
                              : AppTheme.lightTheme.colorScheme.onSurface,
                        ),
                      ),
                      SizedBox(height: 0.5.h),
                      Text(
                        option['description']!,
                        style:
                            AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                          color:
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
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
    );
  }
}
