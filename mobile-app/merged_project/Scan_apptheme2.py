import os
import re
import subprocess
import argparse

# Configuration based on user input
# The script assumes it is run from the 'mobile-app/scripts' directory
FLUTTER_PROJECT_ROOT_RELATIVE = ".."
APP_THEME_RELATIVE_PATH = "lib\theme\app_theme.dart"
PACKAGE_NAME = "kdp_creator_suite"
# The correct package import path is without 'lib/'
APP_THEME_IMPORT = f"import 'package:{PACKAGE_NAME}/theme/app_theme.dart';"

def get_project_root(script_path):
    """Calculates the absolute path to the Flutter project root."""
    # Assuming script is in mobile-app/scripts and project root is mobile-app
    return os.path.abspath(os.path.join(script_path, FLUTTER_PROJECT_ROOT_RELATIVE))

def scan_directory(project_root):
    """Scans all Dart files for the AppTheme import."""
    already_defined = []
    not_defined = []
    # os.walk will start from the project root
    for root, _, files in os.walk(project_root):
        for file in files:
            if file.endswith('.dart'):
                filepath = os.path.join(root, file)
                # Skip the app_theme.dart file itself
                if filepath == os.path.join(project_root, APP_THEME_RELATIVE_PATH):
                    continue
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if APP_THEME_IMPORT in content:
                        already_defined.append((file, filepath))
                    else:
                        not_defined.append((file, filepath))
    return already_defined, not_defined

def fix_file(filepath):
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
    new_content = content[:insert_index] + [APP_THEME_IMPORT + '\n'] + content[insert_index:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    return True

def check_dart_syntax(relative_filepath, project_root):
    """Runs flutter analyze on a single file from the project root."""
    try:
        # Use the full path to the flutter executable to ensure it's found
        flutter_executable = os.path.join(os.path.expanduser("~"), "flutter", "bin", "flutter")
        
        # Run flutter analyze from the project root (cwd=project_root)
        process = subprocess.run([flutter_executable, "analyze", relative_filepath], 
                                 cwd=project_root, capture_output=True, text=True, check=False)
        
        # Flutter analyze returns non-zero exit code for errors/warnings
        if process.returncode != 0 and "No issues found!" not in process.stdout:
            # Return False and the combined output for error details
            return False, process.stdout.strip() + process.stderr.strip()
        return True, "No syntax issues found."
    except FileNotFoundError:
        return False, "'flutter' command not found. Ensure Flutter SDK is installed and in PATH."
    except Exception as e:
        return False, f"Error running flutter analyze: {e}"

def main():
    parser = argparse.ArgumentParser(description='Scan and fix AppTheme imports in a Flutter project.')
    parser.add_argument('--yes', '-y', action='store_true', help='Automatically answer yes to all prompts.')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = get_project_root(script_dir)
    
    print(f"Flutter project root: {project_root}")
    print(f"Scanning directory: {project_root}")

    # --- Step 2 Part 1: Check app_theme.dart currency ---
    app_theme_filepath = os.path.join(project_root, APP_THEME_RELATIVE_PATH)
    if not os.path.exists(app_theme_filepath):
        print(f"Error: app_theme.dart not found at {app_theme_filepath}. Cannot proceed.")
        return

    print(f"\nChecking currency of {APP_THEME_RELATIVE_PATH}...")
    app_theme_relative_filepath = os.path.relpath(app_theme_filepath, project_root)
    is_current, currency_message = check_dart_syntax(app_theme_relative_filepath, project_root)
    
    if not is_current:
        print(f"Warning: {APP_THEME_RELATIVE_PATH} might not be current or has syntax errors:\n{currency_message}")
        if not args.yes:
            response = input("Do you want to continue scanning and fixing despite this warning? (yes/no): ").lower()
            if response != 'yes':
                print("Operation aborted by user.")
                return
    else:
        print(f"{APP_THEME_RELATIVE_PATH} appears to be syntactically correct and current.")

    # --- Step 1: Initial Scan and Categorization ---
    already_defined, not_defined = scan_directory(project_root)

    print(f"\nNumber of files with AppTheme defined: {len(already_defined)}")
    print(f"Number of files with AppTheme not defined: {len(not_defined)}")

    # --- Step 3 Part 1: Check syntax for ALL Dart files (including already_defined) ---
    all_dart_files = already_defined + not_defined
    syntax_errors_found = []
    print("\nPerforming syntax validation on all Dart files...")
    for filename, filepath in all_dart_files:
        relative_filepath = os.path.relpath(filepath, project_root)
        is_valid, error_details = check_dart_syntax(relative_filepath, project_root)
        # We ignore the 'unused_import' warning for the defined_widget.dart in this check
        if not is_valid and "unused_import" not in error_details:
            syntax_errors_found.append((filename, filepath, error_details))
    
    if syntax_errors_found:
        print(f"\n{len(syntax_errors_found)} files have non-trivial syntax errors or warnings:")
        for filename, filepath, errors in syntax_errors_found:
            print(f"- {filename} ({filepath}):\n{errors}")
        
        if not args.yes:
            response = input("Do you want to proceed with fixing AppTheme imports despite syntax errors? (yes/no): ").lower()
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
            for filename, filepath in not_defined:
                try:
                    if fix_file(filepath):
                        defined_fixed.append((filename, filepath))
                        print(f"Fixed: {filename}")
                except Exception as e:
                    print(f"Error fixing {filename}: {e}")
            
            print(f"\nNumber of files fixed: {len(defined_fixed)}")
            print("Files fixed:")
            for filename, filepath in defined_fixed:
                print(f"- {filename}: {filepath}")

            # --- Step 3 Part 2: Recheck entire directory ---
            print("\nRechecking directory for files still not defined...")
            _, files_still_not_defined_after_fix = scan_directory(project_root)
            
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

