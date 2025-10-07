import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class OnboardingPageWidget extends StatelessWidget {
  final String title;
  final String description;
  final String imageUrl;
  final bool isLastPage;
  final VoidCallback? onGetStarted;
  final VoidCallback? onSignIn;

  const OnboardingPageWidget({
    super.key,
    required this.title,
    required this.description,
    required this.imageUrl,
    this.isLastPage = false,
    this.onGetStarted,
    this.onSignIn,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 100.w,
      height: 100.h,
      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 4.h),
      child: Column(
        children: [
          // Main illustration area
          Expanded(
            flex: 5,
            child: Container(
              width: 100.w,
              padding: EdgeInsets.symmetric(vertical: 2.h),
              child: CustomImageWidget(
                imageUrl: imageUrl,
                width: 85.w,
                height: 40.h,
                fit: BoxFit.contain,
              ),
            ),
          ),

          // Content area
          Expanded(
            flex: 3,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Title
                Text(
                  title,
                  style: AppTheme.lightTheme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.lightTheme.colorScheme.primary,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                SizedBox(height: 2.h),

                // Description
                Text(
                  description,
                  style: AppTheme.lightTheme.textTheme.bodyLarge?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Action buttons (only on last page)
          if (isLastPage) ...[
            SizedBox(height: 2.h),
            Column(
              children: [
                // Get Started button
                SizedBox(
                  width: 85.w,
                  height: 6.h,
                  child: ElevatedButton(
                    onPressed: onGetStarted,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.lightTheme.colorScheme.primary,
                      foregroundColor:
                          AppTheme.lightTheme.colorScheme.onPrimary,
                      elevation: 2.0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                    ),
                    child: Text(
                      'Get Started',
                      style:
                          AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.lightTheme.colorScheme.onPrimary,
                      ),
                    ),
                  ),
                ),

                SizedBox(height: 1.5.h),

                // Sign In button
                SizedBox(
                  width: 85.w,
                  height: 6.h,
                  child: OutlinedButton(
                    onPressed: onSignIn,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.lightTheme.colorScheme.primary,
                      side: BorderSide(
                        color: AppTheme.lightTheme.colorScheme.outline,
                        width: 1.0,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                    ),
                    child: Text(
                      'Sign In',
                      style:
                          AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                        color: AppTheme.lightTheme.colorScheme.primary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
