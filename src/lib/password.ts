// Mirrors this project's Supabase Auth password policy (dashboard-configured:
// 8-32 characters, all four character classes) so the raw Supabase error -
// "Password should contain at least one character of each:
// abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789,
// !@#$%^&*()_+-=[]{};':\"|<>?,./`~." - never reaches the user. Checked
// client-side first with this short hint instead.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,32}$/;

export const PASSWORD_HINT = '8-32 characters, with upper, lower, a number, and a symbol';

export function validatePassword(password: string): string | null {
  return PASSWORD_RULE.test(password) ? null : `Password needs ${PASSWORD_HINT}.`;
}
