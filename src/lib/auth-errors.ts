// Supabase Auth returns raw, sometimes fragment-like strings straight from
// the backend (e.g. "email rate limit exceeded"). Map the common ones to
// plain sentences that say what happened and what to do next, per CLAUDE.md
// section 19. Anything unrecognized passes through unchanged.
export function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('email rate limit exceeded')) {
    return 'Too many attempts with this email. Wait a few minutes and try again.';
  }
  if (m.includes('invalid login credentials')) {
    return "That email or password doesn't match an account. Try again.";
  }
  if (m.includes('user already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (m.includes('email not confirmed')) {
    return 'Confirm your email first. Check your inbox for the link.';
  }
  if (m.includes('password should be at least')) {
    return 'Password needs at least 6 characters.';
  }
  if (m.includes('unable to validate email address')) {
    return 'Enter a valid email address.';
  }
  if (m.includes('for security purposes')) {
    return 'Wait a moment before trying that again.';
  }

  return message;
}
