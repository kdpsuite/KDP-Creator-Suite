import 'package:sizer/sizer.dart';import 'package:kdp_creator_suite/theme/app_theme.dart';

class RecentFilesWidget extends StatelessWidget {
  final List<Map<String, dynamic>> recentFiles;
  final Function(Map<String, dynamic>) onFileSelected;

  const RecentFilesWidget({
    super.key,
    required this.recentFiles,
    required this.onFileSelected,
  });

  @override
  Widget build(BuildContext context) {
    if (recentFiles.isEmpty) {
      return SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 4.w),
          child: Text(
            'Recent Files',
            style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        SizedBox(height: 2.h),
        SizedBox(
          height: 12.h,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: 4.w),
            itemCount: recentFiles.length,
            itemBuilder: (context, index) {
              final file = recentFiles[index];
              return GestureDetector(
                onTap: () => onFileSelected(file),
                child: Container(
                  width: 20.w,
                  margin: EdgeInsets.only(right: 3.w),
                  decoration: BoxDecoration(
                    color: AppTheme.lightTheme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppTheme.lightTheme.colorScheme.outline,
                      width: 1,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CustomIconWidget(
                        iconName: 'picture_as_pdf',
                        color: AppTheme.lightTheme.colorScheme.error,
                        size: 32,
                      ),
                      SizedBox(height: 1.h),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 1.w),
                        child: Text(
                          file['name'] as String? ?? 'Unknown',
                          style: AppTheme.lightTheme.textTheme.labelSmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
