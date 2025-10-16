#!/bin/bash
set -e

REPO_ROOT="$(pwd)"
MOBILE_APP="$REPO_ROOT/mobile-app"

echo "🧰 Running Flutter project repair..."

# Verify mobile-app folder exists
if [ ! -d "$MOBILE_APP" ]; then
  echo "⚠️ Skipping: mobile-app folder not found at $MOBILE_APP"
  exit 0
fi

cd "$MOBILE_APP"

FILES_TO_FIX=(
  "lib/main.dart"
  "lib/presentation/settings/widgets/theme_selector_widget.dart"
  "lib/widgets/custom_error_widget.dart"
  "lib/presentation/onboarding_flow/onboarding_flow.dart"
  "lib/presentation/pdf_import/pdf_import.dart"
  "lib/presentation/amazon_kdp_integration/widgets/authentication_section_widget.dart"
)

# Add missing import for AppTheme if missing
for file in "${FILES_TO_FIX[@]}"; do
  if [ -f "$file" ]; then
    if ! grep -q "AppTheme" "$file"; then
      echo "Adding import for AppTheme in $file"
      sed -i "1i import 'package:kdp_creator_suite/theme/app_theme.dart';" "$file"
    else
      echo "AppTheme references found in $file"
    fi
  else
    echo "⚠️ File not found: $file — skipping"
  fi
done

# Fix file permissions
find lib -type f -name "*.dart" -exec chmod 644 {} \;

echo "✅ Flutter project repair completed."
