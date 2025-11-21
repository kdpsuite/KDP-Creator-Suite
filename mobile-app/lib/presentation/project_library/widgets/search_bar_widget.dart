import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/widgets/custom_icon_widget.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';import 'package:sizer/sizer.dart';
import 'package:kdp_creator_suite/widgets/custom_icon_widget.dart';

class SearchBarWidget extends StatefulWidget {
  final Function(String) onSearchChanged;
  final VoidCallback onFilterTap;
  final String hintText;

  const SearchBarWidget({
    super.key,
    required this.onSearchChanged,
    required this.onFilterTap,
    this.hintText = 'Search projects...',
  });

  @override
  State<SearchBarWidget> createState() => _SearchBarWidgetState();
}

class _SearchBarWidgetState extends State<SearchBarWidget> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearchActive = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isSearchActive
              ? AppTheme.lightTheme.colorScheme.secondary
              : AppTheme.lightTheme.colorScheme.outline.withValues(alpha: 0.3),
          width: _isSearchActive ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          Padding(
            padding: EdgeInsets.only(left: 4.w),
            child: CustomIconWidget(
              iconName: 'search',
              color: _isSearchActive
                  ? AppTheme.lightTheme.colorScheme.secondary
                  : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 5.w,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _searchController,
              onChanged: (value) {
                widget.onSearchChanged(value);
                setState(() {
                  _isSearchActive = value.isNotEmpty;
                });
              },
              onTap: () {
                setState(() {
                  _isSearchActive = true;
                });
              },
              onSubmitted: (value) {
                setState(() {
                  _isSearchActive = value.isNotEmpty;
                });
              },
              decoration: InputDecoration(
                hintText: widget.hintText,
                hintStyle: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.onSurfaceVariant
                      .withValues(alpha: 0.6),
                ),
                border: InputBorder.none,
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 3.w, vertical: 2.h),
              ),
              style: AppTheme.lightTheme.textTheme.bodyMedium,
            ),
          ),
          if (_searchController.text.isNotEmpty)
            GestureDetector(
              onTap: () {
                _searchController.clear();
                widget.onSearchChanged('');
                setState(() {
                  _isSearchActive = false;
                });
              },
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 2.w),
                child: CustomIconWidget(
                  iconName: 'clear',
                  color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  size: 5.w,
                ),
              ),
            ),
          GestureDetector(
            onTap: widget.onFilterTap,
            child: Container(
              padding: EdgeInsets.all(3.w),
              margin: EdgeInsets.only(right: 2.w),
              decoration: BoxDecoration(
                color: AppTheme.lightTheme.colorScheme.secondary
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: CustomIconWidget(
                iconName: 'filter_list',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 5.w,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
