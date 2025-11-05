import os
import re
import subprocess
import argparse
import sys

# CONFIGURATION
FLUTTER_ROOT_PATH = os.getenv("FLUTTER_ROOT") or r"C:\Users\User\Documents\unlovedproductions\dev\SDK\flutter\flutter_windows_3.35.4-stable\flutter"
PACKAGE_NAME = "kdp_creator_suite"
APP_THEME_FILENAME = "app_theme.dart"

# HELPER FUNCTIONS
def find_project_root(start_path):
    current_dir = os.path.abspath(start_path)
    while True:
        if os.path.exists(os.path.join(current_dir, "pubspec.yaml")):
            return current_dir
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            return None 
        current_dir = parent_dir

def find_app_theme_path(project_root):
    lib_dir = os.path.join(project_root, "lib")
    for root, _, files in os.walk(lib_dir):
        if APP_THEME_FILENAME in files:
            return os.path.relpath(os.path.join(root, APP_THEME_FILENAME), project_root)
    return None

def find_flutter_executable(flutter_root_path):
    if flutter_root_path:
        return os.path.join(flutter_root_path, "bin", "flutter.bat")
    return "flutter"

def replace_deprecated_widgets(content):
    """Replaces deprecated widgets with their recommended alternatives."""
    original_content = content

    # Replace FlatButton, RaisedButton, and OutlineButton
    content = re.sub(r'\bFlatButton\b', 'TextButton', content)
    content = re.sub(r'\bRaisedButton\b', 'ElevatedButton', content)
    content = re.sub(r'\bOutlineButton\b', 'OutlinedButton', content)

    return original_content != content, content

def scan_and_fix_card_and_tab_bar_themes(filepath):
    """Replaces CardTheme with CardThemeData and TabBarTheme with TabBarThemeData."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    content = re.sub(r'\bCardTheme\b', 'CardThemeData', content)
    content = re.sub(r'\bTabBarTheme\b', 'TabBarThemeData', content)

    # Replace deprecated widgets
    deprecated_fixed, content = replace_deprecated_widgets(content)

    if original_content != content or deprecated_fixed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def remove_unused_imports(filepath):
    """Removes unused imports from the specified Dart file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.readlines()

    new_content = []
    imports = set()
    used_imports = set()

    # Identify used imports
    for line in content:
        if line.strip().startswith('import '):
            imports.add(line.strip())
        else:
            new_content.append(line)
            used_imports.update(re.findall(r'\b(\w+)\b', line))

    # Remove unused imports
    new_imports = [imp for imp in imports if any(used in imp for used in used_imports)]
    new_content = new_imports + new_content

    if len(new_content) != len(content):
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_content)
        return True
    return False

def check_dart_syntax(relative_filepath, project_root, flutter_executable):
    try:
        process = subprocess.run([flutter_executable, "analyze", relative_filepath], 
                                 cwd=project_root, capture_output=True, text=True, check=False)
        if process.returncode != 0 and "No issues found!" not in process.stdout:
            return False, process.stdout.strip() + process.stderr.strip()
        return True, "No syntax issues found."
    except FileNotFoundError:
        return False, f"'{flutter_executable}' command not found."
    except Exception as e:
        return False, f"Error running flutter analyze: {e}"

def main():
    parser = argparse.ArgumentParser(description='Scan and fix Dart files in a Flutter project.')
    parser.add_argument('--yes', '-y', action='store_true', help='Automatically answer yes to all prompts.')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = find_project_root(script_dir)
    if not project_root:
        print("FATAL ERROR: Could not find Flutter project root.")
        return

    app_theme_relative_path = find_app_theme_path(project_root)
    if not app_theme_relative_path:
        print(f"FATAL ERROR: Could not find '{APP_THEME_FILENAME}' within the project's 'lib' directory.")
        return

    flutter_executable = find_flutter_executable(FLUTTER_ROOT_PATH)

    # Scan for Dart files to fix CardTheme, TabBarTheme, deprecated widgets, and unused imports
    for root, _, files in os.walk(project_root):
        for file in files:
            if file.endswith('.dart'):
                filepath = os.path.join(root, file)
                if scan_and_fix_card_and_tab_bar_themes(filepath):
                    print(f"Updated theme and deprecated widgets in file: {filepath}")
                if remove_unused_imports(filepath):
                    print(f"Removed unused imports in file: {filepath}")

    print("All relevant files have been checked and updated.")

if __name__ == "__main__":
    main()
