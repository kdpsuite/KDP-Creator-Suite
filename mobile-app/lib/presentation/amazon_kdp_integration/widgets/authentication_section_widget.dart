import 'package:sizer/sizer.dart';import 'package:kdp_creator_suite/theme/app_theme.dart';

class AuthenticationSectionWidget extends StatefulWidget {
  final bool isAuthenticated;
  final VoidCallback onConnectPressed;
  final Map<String, dynamic>? userInfo;

  const AuthenticationSectionWidget({
    super.key,
    required this.isAuthenticated,
    required this.onConnectPressed,
    this.userInfo,
  });

  @override
  State<AuthenticationSectionWidget> createState() =>
      _AuthenticationSectionWidgetState();
}

class _AuthenticationSectionWidgetState
    extends State<AuthenticationSectionWidget> {
  @override
  Widget build(BuildContext context) {
    return Container(
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
      child: widget.isAuthenticated
          ? _buildAuthenticatedView()
          : _buildUnauthenticatedView(),
    );
  }

  Widget _buildUnauthenticatedView() {
    return Column(
      children: [
        Container(
          width: 20.w,
          height: 10.h,
          decoration: BoxDecoration(
            color: AppTheme.lightTheme.colorScheme.surface,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              'KDP',
              style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
                color: AppTheme.lightTheme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        SizedBox(height: 2.h),
        Text(
          'Connect to Amazon KDP',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurface,
          ),
        ),
        SizedBox(height: 1.h),
        Text(
          'Publish your eBooks directly to Kindle Direct Publishing',
          style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 3.h),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: widget.onConnectPressed,
            icon: CustomIconWidget(
              iconName: 'login',
              color: AppTheme.lightTheme.colorScheme.onPrimary,
              size: 20,
            ),
            label: Text('Connect to KDP'),
            style: ElevatedButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 2.h),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAuthenticatedView() {
    final userInfo = widget.userInfo ?? {};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 12.w,
              height: 6.h,
              decoration: BoxDecoration(
                color: AppTheme.lightTheme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: CustomIconWidget(
                  iconName: 'check_circle',
                  color: AppTheme.lightTheme.colorScheme.primary,
                  size: 24,
                ),
              ),
            ),
            SizedBox(width: 3.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Connected to KDP',
                    style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                      color: AppTheme.lightTheme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    userInfo['accountName'] ?? 'John Doe',
                    style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                      color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        SizedBox(height: 3.h),
        Container(
          width: double.infinity,
          padding: EdgeInsets.all(3.w),
          decoration: BoxDecoration(
            color: AppTheme.lightTheme.colorScheme.secondaryContainer,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Expanded(
                child: _buildStatItem(
                  'Published Titles',
                  '${userInfo['publishedTitles'] ?? 12}',
                  'book',
                ),
              ),
              Container(
                width: 1,
                height: 6.h,
                color: AppTheme.lightTheme.colorScheme.outline,
              ),
              Expanded(
                child: _buildStatItem(
                  'Total Earnings',
                  '\$${userInfo['totalEarnings'] ?? '2,847.50'}',
                  'attach_money',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, String iconName) {
    return Column(
      children: [
        CustomIconWidget(
          iconName: iconName,
          color: AppTheme.lightTheme.colorScheme.primary,
          size: 24,
        ),
        SizedBox(height: 1.h),
        Text(
          value,
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSecondaryContainer,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSecondaryContainer,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
