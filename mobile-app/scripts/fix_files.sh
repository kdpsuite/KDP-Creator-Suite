#!/bin/bash
set -e

mkdir -p lib/core/themes

THEME_FILE="lib/core/themes/app_theme.dart"
WIDGET_FILE="lib/presentation/onboarding_flow/widgets/page_indicator_widget.dart"

# Restore app_theme.dart
if [ ! -f "$THEME_FILE" ]; then
  cat > "$THEME_FILE" <<'EOF'
import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();
  static final lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: const Color(0xFF1E88E5),
  );
}
EOF
fi

# Repair PageIndicatorWidget if malformed
if grep -q '^}' "$WIDGET_FILE" 2>/dev/null; then
  cat > "$WIDGET_FILE" <<'EOF'
import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/core/themes/app_theme.dart';

class PageIndicatorWidget extends StatelessWidget { }
EOF
fi
