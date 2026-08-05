---
name: auth-flow-auditor
description: Audits and assists in writing backend authentication logic.
disable-model-invocation: true
---
# Auth Auditing Checklist
1. **Email Credential Creation:** Validate email format, password strength, and uniqueness.
2. **Password Resets:** Ensure secure token generation, expiration limits, and non-blocking background email dispatch.
3. Verify proper CORS, state management, and error handling for all auth routes.
