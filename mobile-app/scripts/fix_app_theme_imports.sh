#!/usr/bin/env bash
set -e

echo "🔍 Starting AppTheme import fix process..."

# Always run from repo root
REPO_ROOT="$(pwd)"
MOBILE_APP_DIR="$REPO_ROOT/mobile-app"

if [ ! -d "$MOBILE_APP_DIR" ]; then
  echo "⚠️ mobile-app directory not found at $MOBILE_APP_DIR. Exiting."
  exit 1
fi

cd "$MOBILE_APP_DIR"

APP_THEME_PATH="lib/theme/app_theme.dart"

# Ensure AppTheme exists
if [ ! -f "$APP_THEME_PATH" ]; then
  echo "⚠️ app_theme.dart not found, recreating minimal version..."
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
  echo "✅ Created lib/theme/app_theme.dart"
fi

# Scan for files referencing AppTheme
echo "🔧 Scanning for Dart files referencing AppTheme..."
FILES_TO_FIX=$(grep -rl "AppTheme" lib/)

if [ -z "$FILES_TO_FIX" ]; then
  echo "ℹ️ No Dart files reference AppTheme."
else
  for FILE in $FILES_TO_FIX; do
    if ! grep -q "import 'package:kdp_creator_suite/theme/app_theme.dart';" "$FILE"; then
      echo "🩹 Adding AppTheme import in $FILE"
      awk '
        BEGIN { inserted=0 }
        /^import / {
          print $0
          if (!inserted) {
            print "import '\''package:kdp_creator_suite/theme/app_theme.dart'\'';"
            inserted=1
          }
          next
        }
        { print $0 }
      ' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
    fi
  done
  echo "✅ All missing AppTheme imports fixed."
fi

# Summary
echo "📄 Files fixed:"
git status --short | grep lib/ || echo "No files modified."

echo "✅ AppTheme import fix process completed."
