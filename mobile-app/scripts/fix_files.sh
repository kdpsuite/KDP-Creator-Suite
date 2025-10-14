#!/bin/bash
set -e

# Create themes folder if it doesn't exist
mkdir -p lib/core/themes

THEME_FILE="lib/core/themes/app_theme.dart"
WIDGET_FILE="lib/presentation/onboarding_flow/widgets/page_indicator_widget.dart"

# Restore app_theme.dart if missing
if [ ! -f "$THEME_FILE" ]; then
  cat > "$THEME_FILE" <<'EOF'
import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static final lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: const Color(0xFF1E88E5),
    scaffoldBackgroundColor: Colors.white,
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF1E88E5),
      secondary: Color(0xFF43A047),
      background: Colors.white,
      surface: Colors.white,
      outline: Color(0xFFBDBDBD),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onBackground: Colors.black,
      onSurface: Colors.black,
      onError: Colors.white,
      error: Colors.redAccent,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF1E88E5),
      foregroundColor: Colors.white,
      elevation: 2,
    ),
  );

  static final darkTheme = ThemeData(
    brightness: Brightness.dark,
    primaryColor: const Color(0xFF1E88E5),
    scaffoldBackgroundColor: const Color(0xFF121212),
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFF1E88E5),
      secondary: Color(0xFF43A047),
      background: Color(0xFF121212),
      surface: Color(0xFF1E1E1E),
      outline: Color(0xFF616161),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onBackground: Colors.white,
      onSurface: Colors.white,
      onError: Colors.white,
      error: Colors.redAccent,
    ),
  );
}
EOF
fi

# Repair PageIndicatorWidget if malformed
if grep -q '^}' "$WIDGET_FILE" 2>/dev/null; then
  cat > "$WIDGET_FILE" <<'EOF'
import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/core/themes/app_theme.dart';

class PageIndicatorWidget extends StatelessWidget {
  final int currentIndex;
  final int totalPages;

  const PageIndicatorWidget({
    Key? key,
    required this.currentIndex,
    required this.totalPages,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(totalPages, (index) {
        final isActive = index == currentIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          margin: const EdgeInsets.symmetric(horizontal: 4.0),
          height: 10.0,
          width: isActive ? 12.0 : 8.0,
          decoration: BoxDecoration(
            color: isActive
                ? AppTheme.lightTheme.colorScheme.primary
                : AppTheme.lightTheme.colorScheme.outline,
            borderRadius: BorderRadius.circular(8.0),
          ),
        );
      }),
    );
  }
}
EOF
fi

echo "✅ Flutter project structure verified and fixed if needed."
