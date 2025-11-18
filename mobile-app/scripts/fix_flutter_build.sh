#!/bin/bash

# ==============================================================================
# Automated Flutter Build Fix Script
#
# This script addresses common build warnings and errors found in older Flutter
# projects, specifically updating Android Gradle Plugin (AGP) and Kotlin Gradle
# Plugin (KGP) versions, and resolving `file_picker` plugin configuration warnings.
#
# Assumes the project structure is standard, with the Flutter project in a
# subdirectory named 'mobile-app'.
# ==============================================================================

# --- Configuration ---
PROJECT_ROOT="mobile-app"
ANDROID_DIR="${PROJECT_ROOT}/android"
TOP_LEVEL_BUILD_GRADLE="${ANDROID_DIR}/build.gradle"
PUBSPEC_YAML="${PROJECT_ROOT}/pubspec.yaml"

# --- Functions ---

# Function to check if a file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo "Error: Required file not found: $1"
        echo "Please ensure you run this script from the directory containing the '${PROJECT_ROOT}' folder."
        exit 1
    fi
}

# Function to update version in build.gradle using sed
update_gradle_version() {
    local file=$1
    local search_pattern=$2
    local replace_string=$3
    local description=$4
    
    echo "-> Updating ${description} in ${file}..."
    
    # Use sed to replace the entire line containing the search pattern
    # The 'i' flag is for in-place editing.
    if grep -q "${search_pattern}" "$file"; then
        # Escape slashes in the search pattern for sed
        ESCAPED_SEARCH=$(echo "${search_pattern}" | sed 's/[\/&]/\\&/g')
        
        # Perform the replacement
        sed -i "/${ESCAPED_SEARCH}/c\\${replace_string}" "$file"
        
        echo "   Successfully updated to: ${replace_string}"
    else
        echo "   Warning: Could not find pattern matching '${search_pattern}'. Manual check may be required."
    fi
}

# Function to fix the file_picker plugin warnings in pubspec.yaml
fix_file_picker_pubspec() {
    echo "-> Resolving file_picker plugin warnings in ${PUBSPEC_YAML}..."
    
    # The fix is to remove the 'default_package: file_picker' lines.
    # These lines cause the build warnings.
    
    # Check if the lines exist before attempting to delete
    if grep -q "default_package: file_picker" "$PUBSPEC_YAML"; then
        # Delete lines containing 'default_package: file_picker'
        sed -i '/default_package: file_picker/d' "$PUBSPEC_YAML"
        echo "   Successfully removed 'default_package: file_picker' lines."
    else
        echo "   Info: 'default_package: file_picker' lines not found. Assuming already fixed or configuration is different."
    fi
}

# --- Main Script Execution ---

echo "====================================================="
echo "  Starting Automated Flutter Build Fix Script"
echo "====================================================="

# 1. Validate file paths
check_file "$TOP_LEVEL_BUILD_GRADLE"
check_file "$PUBSPEC_YAML"

# 2. Fix 1: Update Android Gradle Plugin (AGP) version
# From: classpath 'com.android.tools.build:gradle:8.2.1'
# To:   classpath 'com.android.tools.build:gradle:8.13.0'
update_gradle_version \
    "$TOP_LEVEL_BUILD_GRADLE" \
    "classpath 'com.android.tools.build:gradle:8.2.1'" \
    "classpath 'com.android.tools.build:gradle:8.13.0'" \
    "Android Gradle Plugin (AGP)"

# 3. Fix 2: Update Kotlin Gradle Plugin (KGP) version
# From: ext.kotlin_version = '1.8.22'
# To:   ext.kotlin_version = '2.2.21'
update_gradle_version \
    "$TOP_LEVEL_BUILD_GRADLE" \
    "ext.kotlin_version = '1.8.22'" \
    "ext.kotlin_version = '2.2.21'" \
    "Kotlin Gradle Plugin (KGP)"

# 4. Fix 3: Resolve file_picker Plugin Warnings
fix_file_picker_pubspec

# 5. Post-fix cleanup and final instructions
echo ""
echo "====================================================="
echo "  Automated Fixes Complete"
echo "====================================================="
echo "The configuration files have been updated. Please follow the manual steps below:"
echo ""
echo "NEXT STEPS (Manual):"
echo "1. Navigate to the project directory: cd ${PROJECT_ROOT}"
echo "2. Clean the build cache: flutter clean"
echo "3. Run the build again: flutter build apk --release"
echo ""
echo "If the build still fails with the 'daemon disappeared' error, you may need to manually increase"
echo "the Gradle daemon memory. Edit ${ANDROID_DIR}/gradle.properties and add/modify the line:"
echo "org.gradle.jvmargs=-Xmx2048m"

exit 0
