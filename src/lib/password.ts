// Length only, 8 to 32 characters. The character-class requirement this used
// to mirror (one lower, one upper, one digit, one symbol) is also a Supabase
// Auth dashboard setting: it has to be set to "No required characters" under
// Authentication > Providers > Email, or Supabase rejects the password after
// this check passes and the user sees a raw provider error. humanizeAuthError
// still translates that error, so a project where the setting hasn't been
// flipped yet fails readably rather than cryptically.
const PASSWORD_RULE = /^.{8,32}$/;

export const PASSWORD_HINT = '8 to 32 characters';

export function validatePassword(password: string): string | null {
  return PASSWORD_RULE.test(password) ? null : `Password needs ${PASSWORD_HINT}.`;
}
