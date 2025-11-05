import os
import re
import subprocess
import argparse
import sys

# ==============================================================================
# CONFIGURATION - ADJUST THESE VALUES AS NEEDED
# ==============================================================================

# **CRITICAL FIX FOR WINDOWS PATH ISSUES:**
# If you are getting "flutter executable not found", set this to the full path 
# of your Flutter installation folder (e.g., r"C:\src\flutter").
# Leave it as "" to rely on the system's PATH variable.
FLUTTER_ROOT_PATH = os.getenv("FLUTTER_ROOT") or r"C:\Users\User\Documents\unlovedproductions\dev\SDK\flutter\flutter_windows_3.35.4-stable\flutter"
# The package name from your pubspec.yaml (e.g., kdp_creator_suite)
PACKAGE_NAME = "kdp_creator_suite"

# The name of the AppTheme file to search for (e.g., app_theme.dart)
APP_THEME_FILENAME = "app_theme.dart"

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def find_project_root(start_path):
    """Searches upwards from start_path for the pubspec.yaml file."""
    current_dir = os.path.abspath(start_path)
    while True:
        if os.path.exists(os.path.join(current_dir, "pubspec.yaml")):
            return current_dir
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            return None # Reached file system root
        current_dir = parent_dir

def find_app_theme_path(project_root):
    """Searches for the APP_THEME_FILENAME within the project's lib directory."""
    lib_dir = os.path.join(project_root, "lib")
    for root, _, files in os.walk(lib_dir):
        if APP_THEME_FILENAME in files:
            # Return path relative to project root
            return os.path.relpath(os.path.join(root, APP_THEME_FILENAME), project_root)
    return None

def find_flutter_executable(flutter_root_path):
    """Determines the correct flutter executable command."""
    if flutter_root_path:
        # Use the full path to flutter.bat on Windows
        return os.path.join(flutter_root_path, "bin", "flutter.bat")
    return "flutter" # Rely on system PATH

def scan_directory(project_root, app_theme_relative_path, app_theme_import):
    """Scans all Dart files for the AppTheme import."""
    already_defined = []
    not_defined = []
    for root, _, files in os.walk(project_root):
        for file in files:
            if file.endswith('.dart'):
                filepath = os.path.join(root, file)
                # Skip the app_theme.dart file itself
                if os.path.normpath(filepath) == os.path.normpath(os.path.join(project_root, app_theme_relative_path)):
                    continue
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if app_theme_import in content:
                        already_defined.append((file, filepath))
                    else:
                        not_defined.append((file, filepath))
    return already_defined, not_defined

def fix_file(filepath, app_theme_import):
    """Inserts the AppTheme import into the specified file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.readlines()

    insert_index = 0
    for i, line in enumerate(content):
        # Find the best place to insert the import statement (after other imports, library, or part)
        if line.strip().startswith('import '):
            insert_index = i + 1
        elif line.strip().startswith('library '):
            insert_index = i + 1
        elif line.strip().startswith('part '):
            insert_index = i + 1

    # Insert the import statement
    new_content = content[:insert_index] + [app_theme_import + '\n'] + content[insert_index:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    return True

def check_dart_syntax(relative_filepath, project_root, flutter_executable):
    """Runs flutter analyze on a single file from the project root."""
    try:
        # Run flutter analyze from the project root (cwd=project_root)
        process = subprocess.run([flutter_executable, "analyze", relative_filepath], 
                                 cwd=project_root, capture_output=True, text=True, check=False)
        
        # Flutter analyze returns non-zero exit code for errors/warnings
        if process.returncode != 0 and "No issues found!" not in process.stdout:
            # Return False and the combined output for error details
            return False, process.stdout.strip() + process.stderr.strip()
        return True, "No syntax issues found."
    except FileNotFoundError:
        return False, f"'{flutter_executable}' command not found. Ensure Flutter SDK is installed and in PATH, or set FLUTTER_ROOT_PATH."
    except Exception as e:
        return False, f"Error running flutter analyze: {e}"

def print_progress(iteration, total, prefix='', suffix='', decimals=1, bar_length=50):
    """Call in a loop to create terminal progress bar."""
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    filled_length = int(round(bar_length * iteration / float(total)))
    bar = '█' * filled_length + '-' * (bar_length - filled_length)
    sys.stdout.write(f'\r{prefix} |{bar}| {percent}% {suffix}')
    sys.stdout.flush()
    if iteration == total:
        sys.stdout.write('\n')

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description='Scan and fix AppTheme imports in a Flutter project.')
    parser.add_argument('--yes', '-y', action='store_true', help='Automatically answer yes to all prompts.')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # --- Dynamic Path Discovery ---
    project_root = find_project_root(script_dir)
    if not project_root:
        print(f"FATAL ERROR: Could not find Flutter project root (pubspec.yaml) starting from {script_dir}.")
        return

    app_theme_relative_path = find_app_theme_path(project_root)
    if not app_theme_relative_path:
        print(f"FATAL ERROR: Could not find '{APP_THEME_FILENAME}' within the project's 'lib' directory.")
        return

    # Calculate the final import string
    # E.g., 'lib/theme/app_theme.dart' becomes 'theme/app_theme.dart' in the package import
    app_theme_import_path = app_theme_relative_path
    if app_theme_import_path.startswith('lib/'):
        app_theme_import_path = app_theme_import_path[4:]
        
    app_theme_import = f"import 'package:{PACKAGE_NAME}/{app_theme_import_path}';"
    
    # Determine the flutter executable path
    flutter_executable = find_flutter_executable(FLUTTER_ROOT_PATH)

    print(f"Flutter project root: {project_root}")
    print(f"Script starting point: {script_dir}")
    print(f"AppTheme file path: {app_theme_relative_path}")
    print(f"Target import statement: {app_theme_import}")
    print(f"Flutter executable: {flutter_executable}")

    # --- Check Flutter Executable ---
    try:
        # Check if the determined executable runs
        subprocess.run([flutter_executable, "--version"], capture_output=True, check=True)
    except FileNotFoundError:
        print(f"\nFATAL ERROR: Flutter executable '{flutter_executable}' not found.")
        print("Please ensure the Flutter SDK is installed and the 'flutter' command is in your system's PATH, or set FLUTTER_ROOT_PATH in the script.")
        return
    except subprocess.CalledProcessError as e:
        print(f"\nFATAL ERROR: 'flutter --version' failed to run. Output:\n{e.stderr}")
        return
    
    # --- Step 2 Part 1: Check app_theme.dart currency ---
    print(f"\n[STEP 1/4] Checking currency of {app_theme_relative_path}...")
    is_current, currency_message = check_dart_syntax(app_theme_relative_path, project_root, flutter_executable)
    
    if not is_current:
        print(f"Warning: {app_theme_relative_path} might not be current or has syntax errors:\n{currency_message}")
        if not args.yes:
            response = input("Do you want to continue scanning and fixing despite this warning? (yes/no): ").lower()
            if response != 'yes':
                print("Operation aborted by user.")
                return
    else:
        print(f"{app_theme_relative_path} appears to be syntactically correct and current.")

    # --- Step 1: Initial Scan and Categorization ---
    print("\n[STEP 2/4] Initial scan and categorization...")
    already_defined, not_defined = scan_directory(project_root, app_theme_relative_path, app_theme_import)

    print(f"\nNumber of files with AppTheme defined: {len(already_defined)}")
    print(f"Number of files with AppTheme not defined: {len(not_defined)}")

    # --- Step 3 Part 1: Check syntax for ALL Dart files (including already_defined) ---
    all_dart_files = already_defined + not_defined
    syntax_errors_found = []
    total_files = len(all_dart_files)
    
    print("\n[STEP 3/4] Performing syntax validation on all Dart files (This is the longest step)...")
    
    for i, (filename, filepath) in enumerate(all_dart_files):
        print_progress(i + 1, total_files, prefix='Progress:', suffix='Complete', bar_length=50)
        
        relative_filepath = os.path.relpath(filepath, project_root)
        is_valid, error_details = check_dart_syntax(relative_filepath, project_root, flutter_executable)
        
        # We only record non-trivial errors (ignoring common warnings like 'unused_import')
        if not is_valid and "unused_import" not in error_details:
            syntax_errors_found.append((filename, filepath, error_details))
    
    if syntax_errors_found:
        print(f"\n{len(syntax_errors_found)} files have non-trivial syntax errors or warnings:")
        for filename, filepath, errors in syntax_errors_found:
            print(f"- {filename} ({filepath}):\n{errors}")
        
        if not args.yes:
            response = input("\nDo you want to proceed with fixing AppTheme imports despite syntax errors? (yes/no): ").lower()
            if response != 'yes':
                print("Operation aborted by user.")
                return
    else:
        print("No general syntax issues found in Dart files.")

    # --- Step 2 Part 2: Fix 'not defined' files ---
    if not_defined:
        print("\nFiles where AppTheme is NOT defined:")
        for filename, filepath in not_defined:
            print(f"- {filename}: {filepath}")
        
        response = 'yes' if args.yes else input("\nWould you like to fix the files in the 'not defined' list? (yes/no): ").lower()
        
        if response == 'yes':
            defined_fixed = []
            print("\nAttempting to fix files...")
            for filename, filepath in not_defined:
                try:
                    if fix_file(filepath, app_theme_import):
                        defined_fixed.append((filename, filepath))
                        print(f"Fixed: {filename}")
                except Exception as e:
                    print(f"Error fixing {filename}: {e}")
            
            print(f"\nNumber of files fixed: {len(defined_fixed)}")
            print("Files fixed:")
            for filename, filepath in defined_fixed:
                print(f"- {filename}: {filepath}")

            # --- Step 3 Part 2: Recheck entire directory ---
            print("\n[STEP 4/4] Rechecking directory for files still not defined...")
            _, files_still_not_defined_after_fix = scan_directory(project_root, app_theme_relative_path, app_theme_import)
            
            # --- Step 4: Compare lists and display results ---
            # Files that were in the original 'not_defined' list and are STILL 'not defined' after the fix attempt.
            
            original_not_defined_paths = {fp for _, fp in not_defined}
            truly_still_not_defined = []
            for filename, filepath in files_still_not_defined_after_fix:
                if filepath in original_not_defined_paths:
                    truly_still_not_defined.append((filename, filepath))

            print(f"\nNumber of files still not defined after fix attempt: {len(truly_still_not_defined)}")
            if truly_still_not_defined:
                print("Files still not defined:")
                for filename, filepath in truly_still_not_defined:
                    print(f"- {filename}: {filepath}")
            else:
                print("All previously 'not defined' files are now fixed.")

            if truly_still_not_defined:
                print(f"\nSummary: {len(truly_still_not_defined)} files were initially 'not defined' and remain unfixed after the attempt.")
                for filename, filepath in truly_still_not_defined:
                    print(f"- {filename}: {filepath}")
            else:
                print("\nAll files initially identified as 'not defined' were successfully fixed or remained fixed.")

        else: # User chose not to fix
            output_filename = os.path.join(script_dir, "not_defined_files.txt")
            with open(output_filename, 'w', encoding='utf-8') as f:
                for filename, filepath in not_defined:
                    f.write(f"{filename}: {filepath}\n")
            print(f"\nList of 'not defined' files saved to {output_filename}")
    else:
        print("\nNo files found where AppTheme is not defined. No action needed.")

if __name__ == "__main__":
    main()

