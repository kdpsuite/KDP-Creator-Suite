#!/usr/bin/env bash
set -e

# The import line to ensure exists
IMPORT_LINE="import 'package:kdp_creator_suite/theme/app_theme.dart';"

# Find all Dart files that reference AppTheme
FILES=$(grep -rl "AppTheme" lib/)

echo "Checking ${#FILES[@]} files for missing imports..."

for FILE in $FILES; do
    if ! grep -q "$IMPORT_LINE" "$FILE"; then
        echo "Adding AppTheme import to $FILE"
        # Insert after the first import or at the top if none
        if grep -q "^import" "$FILE"; then
            FIRST_IMPORT_LINE=$(grep -n "^import" "$FILE" | head -n1 | cut -d: -f1)
            # Insert import after first import
            sed -i "${FIRST_IMPORT_LINE}a $IMPORT_LINE" "$FILE"
        else
            # No imports found, add at the very top
            sed -i "1i $IMPORT_LINE" "$FILE"
        fi
    fi
done

echo "✅ AppTheme imports fixed."
