// Supabase Auth returns raw, sometimes fragment-like strings straight from
// the backend (e.g. "email rate limit exceeded"). Map the common ones to
// plain sentences that say what happened and what to do next, per CLAUDE.md
// section 19. Anything unrecognized passes through unchanged.
export function humanizeAuthError(message: unknown): string {
  // Supabase sometimes fails with an empty or non-string body (a broken SMTP
  // handoff is the usual cause). Passing that through renders "{}" or
  // "[object Object]" at the user, which says nothing and looks broken.
  const raw = typeof message === 'string' ? message : '';
  if (!raw.trim() || raw.trim() === '{}') {
    return 'Sign-up failed on the server. If this keeps happening, check the Auth logs in Supabase.';
  }

  const m = raw.toLowerCase();

  if (m.includes('email rate limit exceeded')) {
    return 'Too many emails sent recently. This resets within the hour, so try again then.';
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
  // A failed SMTP handoff surfaces here rather than as a rate-limit message.
  if (m.includes('error sending') || m.includes('smtp')) {
    return 'The confirmation email could not be sent. Check the SMTP settings in Supabase.';
  }

  return raw;
}
