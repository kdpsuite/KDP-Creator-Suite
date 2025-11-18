import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/widgets/custom_icon_widget.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';import 'package:sizer/sizer.dart';

class EmptyStateWidget extends StatelessWidget {
  final VoidCallback onImportTap;

  const EmptyStateWidget({
    super.key,
    required this.onImportTap,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 8.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildIllustration(),
            SizedBox(height: 4.h),
            _buildTitle(),
            SizedBox(height: 2.h),
            _buildDescription(),
            SizedBox(height: 4.h),
            _buildImportButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildIllustration() {
    return Container(
      width: 40.w,
      height: 20.h,
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.secondary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'picture_as_pdf',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 15.w,
          ),
          SizedBox(height: 2.h),
          CustomIconWidget(
            iconName: 'arrow_downward',
            color: AppTheme.lightTheme.colorScheme.secondary
                .withValues(alpha: 0.6),
            size: 8.w,
          ),
          SizedBox(height: 1.h),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CustomIconWidget(
                iconName: 'menu_book',
                color: AppTheme.lightTheme.colorScheme.secondary
                    .withValues(alpha: 0.8),
                size: 6.w,
              ),
              SizedBox(width: 2.w),
              CustomIconWidget(
                iconName: 'palette',
                color: AppTheme.lightTheme.colorScheme.secondary
                    .withValues(alpha: 0.8),
                size: 6.w,
              ),
              SizedBox(width: 2.w),
              CustomIconWidget(
                iconName: 'print',
                color: AppTheme.lightTheme.colorScheme.secondary
                    .withValues(alpha: 0.8),
                size: 6.w,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTitle() {
    return Text(
      'No Projects Yet',
      style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
        fontWeight: FontWeight.w600,
        color: AppTheme.lightTheme.colorScheme.onSurface,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildDescription() {
    return Text(
      'Transform your PDFs into beautiful eBooks, coloring books, and more. Start by importing your first PDF file.',
      style: AppTheme.lightTheme.textTheme.bodyLarge?.copyWith(
        color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
        height: 1.5,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildImportButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onImportTap,
        icon: CustomIconWidget(
          iconName: 'add',
          color: Colors.white,
          size: 5.w,
        ),
        label: Text(
          'Import Your First PDF',
          style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
          padding: EdgeInsets.symmetric(vertical: 2.h),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
