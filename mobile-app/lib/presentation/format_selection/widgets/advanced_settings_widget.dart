import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class AdvancedSettingsWidget extends StatefulWidget {
  final bool isExpanded;
  final VoidCallback onToggle;

  const AdvancedSettingsWidget({
    super.key,
    required this.isExpanded,
    required this.onToggle,
  });

  @override
  State<AdvancedSettingsWidget> createState() => _AdvancedSettingsWidgetState();
}

class _AdvancedSettingsWidgetState extends State<AdvancedSettingsWidget> {
  String selectedPageSize = 'A4';
  double marginValue = 1.0;
  String selectedQuality = 'High';

  final List<String> pageSizes = ['A4', 'A5', 'Letter', 'Legal'];
  final List<String> qualityOptions = ['Low', 'Medium', 'High', 'Ultra'];

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
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onToggle,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: Container(
                padding: EdgeInsets.all(4.w),
                child: Row(
                  children: [
                    CustomIconWidget(
                      iconName: 'settings',
                      color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                      size: 6.w,
                    ),
                    SizedBox(width: 3.w),
                    Expanded(
                      child: Text(
                        'More Settings',
                        style:
                            AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    AnimatedRotation(
                      turns: widget.isExpanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: CustomIconWidget(
                        iconName: 'keyboard_arrow_down',
                        color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                        size: 6.w,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: widget.isExpanded ? null : 0,
            child: widget.isExpanded
                ? Container(
                    padding: EdgeInsets.fromLTRB(4.w, 0, 4.w, 4.w),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Divider(
                          color: AppTheme.lightTheme.colorScheme.outline
                              .withValues(alpha: 0.3),
                          height: 1,
                        ),
                        SizedBox(height: 3.h),
                        _buildPageSizeSelector(),
                        SizedBox(height: 3.h),
                        _buildMarginSlider(),
                        SizedBox(height: 3.h),
                        _buildQualitySelector(),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildPageSizeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Page Size',
          style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        SizedBox(height: 1.h),
        Wrap(
          spacing: 2.w,
          runSpacing: 1.h,
          children: pageSizes.map((size) => _buildPageSizeChip(size)).toList(),
        ),
      ],
    );
  }

  Widget _buildPageSizeChip(String size) {
    final isSelected = selectedPageSize == size;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => setState(() => selectedPageSize = size),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.lightTheme.colorScheme.secondary
                : AppTheme.lightTheme.colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? AppTheme.lightTheme.colorScheme.secondary
                  : AppTheme.lightTheme.colorScheme.outline,
              width: 1,
            ),
          ),
          child: Text(
            size,
            style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
              color: isSelected
                  ? AppTheme.lightTheme.colorScheme.surface
                  : AppTheme.lightTheme.colorScheme.onSurface,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMarginSlider() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Margin Adjustment',
              style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              '${marginValue.toStringAsFixed(1)} inch',
              style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                color: AppTheme.lightTheme.colorScheme.secondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        SizedBox(height: 1.h),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: AppTheme.lightTheme.colorScheme.secondary,
            inactiveTrackColor:
                AppTheme.lightTheme.colorScheme.outline.withValues(alpha: 0.3),
            thumbColor: AppTheme.lightTheme.colorScheme.secondary,
            overlayColor: AppTheme.lightTheme.colorScheme.secondary
                .withValues(alpha: 0.2),
            trackHeight: 4,
          ),
          child: Slider(
            value: marginValue,
            min: 0.5,
            max: 2.0,
            divisions: 15,
            onChanged: (value) => setState(() => marginValue = value),
          ),
        ),
      ],
    );
  }

  Widget _buildQualitySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Output Quality',
          style: AppTheme.lightTheme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        SizedBox(height: 1.h),
        Container(
          padding: EdgeInsets.symmetric(horizontal: 3.w),
          decoration: BoxDecoration(
            border: Border.all(
              color: AppTheme.lightTheme.colorScheme.outline,
              width: 1,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: selectedQuality,
              isExpanded: true,
              icon: CustomIconWidget(
                iconName: 'keyboard_arrow_down',
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                size: 5.w,
              ),
              items: qualityOptions.map((quality) {
                return DropdownMenuItem<String>(
                  value: quality,
                  child: Text(
                    quality,
                    style: AppTheme.lightTheme.textTheme.bodyMedium,
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => selectedQuality = value);
                }
              },
            ),
          ),
        ),
      ],
    );
  }
}
