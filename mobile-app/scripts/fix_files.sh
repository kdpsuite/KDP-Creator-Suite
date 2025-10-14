#!/usr/bin/env bash
set -e

echo "🧰 Running full Flutter project repair (imports, permissions, structure)..."

# Go to project root
cd "$(dirname "$0")/../mobile-app"

# Make sure scripts are executable
chmod +x ../scripts/*.sh || true

# Ensure directory structure exists
echo "📁 Ensuring key directories exist..."
mkdir -p lib/theme lib/widgets lib/presentation
mkdir -p android ios web assets

# Ensure correct permissions
echo "🔑 Setting correct file permissions..."
find . -type d -exec chmod 755 {} \;
find . -type f -name "*.dart" -exec chmod 644 {} \;

# Call the AppTheme import fixer
echo "🎨 Running AppTheme import repair..."
../scripts/fix_app_theme_imports.sh

# Validate app_theme.dart exists and has definitions
APP_THEME_FILE="lib/theme/app_theme.dart"
if ! grep -q "class AppTheme" "$APP_THEME_FILE"; then
  echo "⚠️ app_theme.dart seems incomplete — regenerating minimal fallback..."
  cat <<'EOF' > "$APP_THEME_FILE"
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
fi

# Auto-fix any Flutter import paths that got renamed (optional but safe)
echo "🔍 Scanning for old import paths to correct..."
find lib -type f -name "*.dart" -exec sed -i \
  "s#import 'package:kdp_creator_suite/app_theme.dart';#import 'package:kdp_creator_suite/theme/app_theme.dart';#g" {} +

# Ensure pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
  echo "⚠️ pubspec.yaml missing — creating a minimal version..."
  cat <<'EOF' > pubspec.yaml
name: kdp_creator_suite
description: Flutter app for KDP Creator Suite
publish_to: "none"
environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

flutter:
  uses-material-design: true
EOF
fi

# Run flutter pub get to re-sync dependencies
echo "📦 Running flutter pub get..."
flutter pub get

echo "✅ Flutter project structure and imports successfully repaired."
