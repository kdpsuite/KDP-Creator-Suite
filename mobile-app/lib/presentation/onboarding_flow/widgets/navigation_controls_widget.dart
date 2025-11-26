import 'package:kdp_creator_suite/theme/app_theme.dart';import 'package:sizer/sizer.dart';import './page_indicator_widget.dart';

class NavigationControlsWidget extends StatelessWidget {
  final int currentPage;
  final int totalPages;
  final VoidCallback? onNext;
  final VoidCallback? onSkip;
  final bool isLastPage;

  const NavigationControlsWidget({
    super.key,
    required this.currentPage,
    required this.totalPages,
    this.onNext,
    this.onSkip,
    this.isLastPage = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 100.w,
      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Skip button (hidden on last page)
          isLastPage
              ? SizedBox(width: 20.w)
              : TextButton(
                  onPressed: onSkip,
                  style: TextButton.styleFrom(
                    foregroundColor:
                        AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                    padding:
                        EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
                  ),
                  child: Text(
                    'Skip',
                    style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                      color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),

          // Page indicator
          Expanded(
            child: Center(
              child: PageIndicatorWidget(
                currentPage: currentPage,
                totalPages: totalPages,
              ),
            ),
          ),

          // Next button (hidden on last page)
          isLastPage
              ? SizedBox(width: 20.w)
              : Container(
                  width: 20.w,
                  height: 6.h,
                  child: ElevatedButton(
                    onPressed: onNext,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.lightTheme.colorScheme.primary,
                      foregroundColor:
                          AppTheme.lightTheme.colorScheme.onPrimary,
                      elevation: 2.0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                    ),
                    child: CustomIconWidget(
                      iconName: 'arrow_forward',
                      color: AppTheme.lightTheme.colorScheme.onPrimary,
                      size: 20,
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}
