/**
 * Shared password rules for register + password reset.
 * Returns an empty string when valid, otherwise a user-facing error.
 */
export function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(pwd)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(pwd)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*]/.test(pwd)) {
    return 'Password must contain at least one special character (!@#$%^&*)';
  }
  return '';
}
