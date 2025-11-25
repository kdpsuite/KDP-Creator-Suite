import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class PublishingActionsWidget extends StatefulWidget {
  final bool canPublish;
  final bool isPublishing;
  final VoidCallback onPublishNow;
  final VoidCallback onSaveDraft;
  final VoidCallback onViewDashboard;

  const PublishingActionsWidget({
    super.key,
    required this.canPublish,
    required this.isPublishing,
    required this.onPublishNow,
    required this.onSaveDraft,
    required this.onViewDashboard,
  });

  @override
  State<PublishingActionsWidget> createState() =>
      _PublishingActionsWidgetState();
}

class _PublishingActionsWidgetState extends State<PublishingActionsWidget> {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Publishing Actions',
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
              _buildPublishButton(),
              SizedBox(height: 2.h),
              _buildSecondaryActions(),
              if (widget.isPublishing) ...[
                SizedBox(height: 3.h),
                _buildPublishingProgress(),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPublishButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: widget.canPublish && !widget.isPublishing
            ? widget.onPublishNow
            : null,
        icon: widget.isPublishing
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppTheme.lightTheme.colorScheme.onPrimary,
                  ),
                ),
              )
            : CustomIconWidget(
                iconName: 'publish',
                color: AppTheme.lightTheme.colorScheme.onPrimary,
                size: 20,
              ),
        label: Text(
          widget.isPublishing ? 'Publishing...' : 'Publish Now',
        ),
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.symmetric(vertical: 2.5.h),
          backgroundColor: widget.canPublish
              ? AppTheme.lightTheme.colorScheme.primary
              : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildSecondaryActions() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: !widget.isPublishing ? widget.onSaveDraft : null,
            icon: CustomIconWidget(
              iconName: 'save',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 18,
            ),
            label: Text('Save Draft'),
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 2.h),
            ),
          ),
        ),
        SizedBox(width: 3.w),
        Expanded(
          child: TextButton.icon(
            onPressed: !widget.isPublishing ? widget.onViewDashboard : null,
            icon: CustomIconWidget(
              iconName: 'dashboard',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 18,
            ),
            label: Text('KDP Dashboard'),
            style: TextButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 2.h),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPublishingProgress() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'upload',
                color: AppTheme.lightTheme.colorScheme.onSecondaryContainer,
                size: 20,
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: Text(
                  'Publishing to Amazon KDP...',
                  style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSecondaryContainer,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 2.h),
          LinearProgressIndicator(
            backgroundColor: AppTheme
                .lightTheme.colorScheme.onSecondaryContainer
                .withValues(alpha: 0.2),
            valueColor: AlwaysStoppedAnimation<Color>(
              AppTheme.lightTheme.colorScheme.primary,
            ),
          ),
          SizedBox(height: 1.h),
          Text(
            'Estimated review time: 24-72 hours',
            style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSecondaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}
