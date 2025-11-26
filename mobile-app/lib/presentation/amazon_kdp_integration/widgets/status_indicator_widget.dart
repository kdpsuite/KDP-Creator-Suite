import 'package:sizer/sizer.dart';import 'package:kdp_creator_suite/theme/app_theme.dart';

class StatusIndicatorWidget extends StatefulWidget {
  final bool isConnected;
  final bool isSecure;

  const StatusIndicatorWidget({
    super.key,
    required this.isConnected,
    required this.isSecure,
  });

  @override
  State<StatusIndicatorWidget> createState() => _StatusIndicatorWidgetState();
}

class _StatusIndicatorWidgetState extends State<StatusIndicatorWidget> {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      decoration: BoxDecoration(
        color: widget.isConnected && widget.isSecure
            ? AppTheme.lightTheme.colorScheme.primaryContainer
            : AppTheme.lightTheme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: widget.isSecure ? 'lock' : 'lock_open',
            color: widget.isConnected && widget.isSecure
                ? AppTheme.lightTheme.colorScheme.onPrimaryContainer
                : AppTheme.lightTheme.colorScheme.onErrorContainer,
            size: 16,
          ),
          SizedBox(width: 2.w),
          Text(
            _getStatusText(),
            style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
              color: widget.isConnected && widget.isSecure
                  ? AppTheme.lightTheme.colorScheme.onPrimaryContainer
                  : AppTheme.lightTheme.colorScheme.onErrorContainer,
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(width: 2.w),
          CustomIconWidget(
            iconName: widget.isConnected ? 'wifi' : 'wifi_off',
            color: widget.isConnected && widget.isSecure
                ? AppTheme.lightTheme.colorScheme.onPrimaryContainer
                : AppTheme.lightTheme.colorScheme.onErrorContainer,
            size: 16,
          ),
        ],
      ),
    );
  }

  String _getStatusText() {
    if (widget.isConnected && widget.isSecure) {
      return 'Secure Connection to Amazon KDP';
    } else if (widget.isConnected && !widget.isSecure) {
      return 'Connected - Security Warning';
    } else {
      return 'No Connection to Amazon KDP';
    }
  }
}
