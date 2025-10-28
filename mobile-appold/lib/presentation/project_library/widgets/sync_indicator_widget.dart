import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:sizer/sizer.dart';

import '../../../core/app_export.dart';

class SyncIndicatorWidget extends StatefulWidget {
  final bool isOnline;
  final bool isSyncing;
  final DateTime? lastSyncTime;

  const SyncIndicatorWidget({
    super.key,
    required this.isOnline,
    required this.isSyncing,
    this.lastSyncTime,
  });

  @override
  State<SyncIndicatorWidget> createState() => _SyncIndicatorWidgetState();
}

class _SyncIndicatorWidgetState extends State<SyncIndicatorWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _rotationAnimation = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.linear,
    ));

    if (widget.isSyncing) {
      _animationController.repeat();
    }
  }

  @override
  void didUpdateWidget(SyncIndicatorWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSyncing && !oldWidget.isSyncing) {
      _animationController.repeat();
    } else if (!widget.isSyncing && oldWidget.isSyncing) {
      _animationController.stop();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 1.h),
      decoration: BoxDecoration(
        color: _getBackgroundColor(),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _getBorderColor(),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildIcon(),
          SizedBox(width: 2.w),
          Expanded(
            child: _buildText(),
          ),
        ],
      ),
    );
  }

  Widget _buildIcon() {
    if (widget.isSyncing) {
      return AnimatedBuilder(
        animation: _rotationAnimation,
        builder: (context, child) {
          return Transform.rotate(
            angle: _rotationAnimation.value * 2 * 3.14159,
            child: CustomIconWidget(
              iconName: 'sync',
              color: AppTheme.lightTheme.colorScheme.secondary,
              size: 4.w,
            ),
          );
        },
      );
    } else if (widget.isOnline) {
      return CustomIconWidget(
        iconName: 'cloud_done',
        color: Color(0xFF27AE60),
        size: 4.w,
      );
    } else {
      return CustomIconWidget(
        iconName: 'cloud_off',
        color: Color(0xFFF39C12),
        size: 4.w,
      );
    }
  }

  Widget _buildText() {
    String text;
    if (widget.isSyncing) {
      text = 'Syncing projects...';
    } else if (widget.isOnline) {
      if (widget.lastSyncTime != null) {
        final timeDiff = DateTime.now().difference(widget.lastSyncTime!);
        if (timeDiff.inMinutes < 1) {
          text = 'Synced just now';
        } else if (timeDiff.inHours < 1) {
          text = 'Synced ${timeDiff.inMinutes}m ago';
        } else if (timeDiff.inDays < 1) {
          text = 'Synced ${timeDiff.inHours}h ago';
        } else {
          text = 'Synced ${timeDiff.inDays}d ago';
        }
      } else {
        text = 'All projects synced';
      }
    } else {
      text = 'Offline - showing cached projects';
    }

    return Text(
      text,
      style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
        color: _getTextColor(),
        fontWeight: FontWeight.w500,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  Color _getBackgroundColor() {
    if (widget.isSyncing) {
      return AppTheme.lightTheme.colorScheme.secondary.withValues(alpha: 0.1);
    } else if (widget.isOnline) {
      return Color(0xFF27AE60).withValues(alpha: 0.1);
    } else {
      return Color(0xFFF39C12).withValues(alpha: 0.1);
    }
  }

  Color _getBorderColor() {
    if (widget.isSyncing) {
      return AppTheme.lightTheme.colorScheme.secondary.withValues(alpha: 0.3);
    } else if (widget.isOnline) {
      return Color(0xFF27AE60).withValues(alpha: 0.3);
    } else {
      return Color(0xFFF39C12).withValues(alpha: 0.3);
    }
  }

  Color _getTextColor() {
    if (widget.isSyncing) {
      return AppTheme.lightTheme.colorScheme.secondary;
    } else if (widget.isOnline) {
      return Color(0xFF27AE60);
    } else {
      return Color(0xFFF39C12);
    }
  }
}
