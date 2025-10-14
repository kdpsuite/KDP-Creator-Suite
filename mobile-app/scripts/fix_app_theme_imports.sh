#!/usr/bin/env bash
set -e

echo "🔍 Starting AppTheme import fix process..."

# Ensure we're running from the correct project directory
cd "$(dirname "$0")/../mobile-app"

# Path to the AppTheme file
APP_THEME_PATH="lib/theme/app_theme.dart"

# Check if app_theme.dart exists
if [ ! -f "$APP_THEME_PATH" ]; then
  echo "⚠️ app_theme.dart not found, recreating a minimal version..."
  mkdir -p lib/theme
  cat <<'EOF' > "$APP_THEME_PATH"
import 'package:flutter/material.dart';

class AppTheme {
  static final ThemeData lightTheme = ThemeData.light().copyWith(
    colorScheme: const ColorScheme.light(),
  );

  static final ThemeData darkTheme = ThemeData.dark().copyWith(
    colorScheme: const ColorScheme.dark(),
  );
}
EOF
  echo "✅ Recreated lib/theme/app_theme.dart"
fi

# Find Dart files that use AppTheme but lack the import
echo "🔧 Scanning for missing AppTheme imports..."
grep -rl "AppTheme" lib/ | while read -r file; do
  if ! grep -q "import 'package:kdp_creator_suite/theme/app_theme.dart';" "$file"; then
    echo "🩹 Fixing import in: $file"
    # Insert import after other import statements
    awk '
      BEGIN {inserted=0}
      /^import / {
        print $0
        if (!inserted) {
          print "import '\''package:kdp_creator_suite/theme/app_theme.dart'\'';"
          inserted=1
        }
        next
      }
      { print $0 }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

echo "✅ All missing AppTheme imports fixed."
