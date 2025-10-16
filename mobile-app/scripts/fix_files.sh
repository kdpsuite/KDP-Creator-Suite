#!/bin/bash
set -e

# Base directories
REPO_ROOT="$(pwd)"
MOBILE_APP="$REPO_ROOT/mobile-app"

echo "🧰 Running Flutter project repair..."

# Ensure Flutter project exists
if [ ! -d "$MOBILE_APP" ]; then
  echo "Error: mobile-app folder not found at $MOBILE_APP"
  exit 1
fi

# List of files to fix AppTheme references
FILES_TO_FIX=(
  "$MOBILE_APP/lib/main.dart"
  "$MOBILE_APP/lib/presentation/settings/widgets/theme_selector_widget.dart"
  "$MOBILE_APP/lib/widgets/custom_error_widget.dart"
  "$MOBILE_APP/lib/presentation/onboarding_flow/onboarding_flow.dart"
  "$MOBILE_APP/lib/presentation/pdf_import/pdf_import.dart"
  "$MOBILE_APP/lib/presentation/amazon_kdp_integration/widgets/authentication_section_widget.dart"
)

# Add missing import for AppTheme if not present
for file in "${FILES_TO_FIX[@]}"; do
  if grep -q "AppTheme" "$file"; then
    echo "AppTheme references found in $file"
  else
    echo "Adding import for AppTheme in $file"
    sed -i "1i import 'package:kdp_creator_suite/theme/app_theme.dart';" "$file"
  fi
done

# Fix basic file permissions
find "$MOBILE_APP" -type f -name "*.dart" -exec chmod 644 {} \;

echo "✅ Flutter project repair completed."
