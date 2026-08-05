---
name: auth-flow-auditor
description: Audits and assists in writing backend authentication logic.
disable-model-invocation: true
---
# Auth Auditing Checklist
1. **Email Credential Creation:** Validate email format, password strength, and uniqueness.
2. **Password Resets:** Ensure secure token generation, expiration limits, and non-blocking background email dispatch.
3. Verify proper CORS, state management, and error handling for all auth routes.

## Known recurring issue: "Sign-up failed on the server" / no reset email arrives

**Symptom:** Signup or password-reset request returns "Sign-up failed on the
server. If this keeps happening, check the Auth logs in Supabase" (the
`humanizeAuthError` fallback in `src/lib/auth-errors.ts` for an *empty*
Supabase error body), or the request appears to succeed but no email ever
arrives. Recurs every time signup/reset gets tested repeatedly (e.g. once
per phase, once per bug-repro session) - it is not intermittent, it is
capacity-based.

**Root cause:** Supabase's built-in email mailer is rate-limited to a
handful of emails/hour by design (it is meant for light use, not repeated
dev testing). Once that quota is spent, `signUp()`/`resetPasswordForEmail()`
fail server-side with no message at all, which is exactly the shape that
triggers the generic fallback above. This is a Supabase **project
dashboard** setting, not a bug in this codebase - do not try to "fix" it
with a code change, and do not assume `humanizeAuthError` or the calling
action is broken. Confirmed twice in this repo's history (see the
"Fix silent password-reset failure" commit and the phase-5 session that
diagnosed it a second time).

**Fix (do this once, in the Supabase dashboard, not in code):**
1. **Authentication → Logs** - filter to the failure's timestamp to see the
   literal rejection reason.
2. **Authentication → Emails** (SMTP settings) - if "Enable Custom SMTP" is
   off, that is almost certainly the cause.
3. Configure a real SMTP provider (Resend, Postmark, or SendGrid all have
   free tiers Supabase's own docs recommend). This removes the rate limit
   entirely - after this, the built-in mailer is no longer in the loop.
4. Separately, confirm **Authentication → URL Configuration → Redirect
   URLs** includes every origin actually used for testing (`http://
   localhost:PORT/**`, each Netlify preview pattern, production). A
   redirect link that arrives but points to an un-allow-listed origin fails
   the same way for a different reason - see `src/app/login/actions.ts`'s
   `siteOrigin()` and `src/app/login/page.tsx`'s reset handler, which
   derive the redirect from the actual request origin rather than a
   hardcoded env var (fixed in this repo already), but Supabase still has
   to be told that origin is allowed.

**When auditing or reproducing an auth bug:** check this section *before*
spending time re-diagnosing a generic signup/reset failure - it is very
likely this, not a new regression.
