#!/usr/bin/env bash
set -e

echo "🔍 Starting AppTheme import fix process..."

# Navigate safely to project
if [ ! -d "$(dirname "$0")/.." ]; then
  echo "⚠️ Skipping: mobile-app directory not found."
  exit 0
fi

cd "$(dirname "$0")/.."

APP_THEME_PATH="lib/theme/app_theme.dart"

# Recreate missing AppTheme file if needed
if [ ! -f "$APP_THEME_PATH" ]; then
  echo "⚠️ app_theme.dart not found, recreating..."
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

# Scan for missing imports and patch them
echo "🔧 Scanning for missing AppTheme imports..."
grep -rl "AppTheme" lib/ | while read -r file; do
  if ! grep -q "import 'package:kdp_creator_suite/theme/app_theme.dart';" "$file"; then
    echo "🩹 Fixing import in: $file"
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
