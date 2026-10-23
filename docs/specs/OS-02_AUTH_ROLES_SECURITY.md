# OS-02 · Auth, roles & security — implementation spec

**Scope:** Private employee login, owner/sales/production role matrix, server-side verified membership, read-only owner roster and unprivileged runtime.
**Environment:** Preview-only, protected by Vercel Auth. Supabase client receives URL + publishable key only.
**Repo status:** Temporarily public; NEVER commit email allowlists, auth IDs, tokens, client records or service_role credentials.

## Invariants
1. Signed-out visitor cannot access any workspace page.
2. Confirmed Supabase Auth identity MUST match one active, explicitly bound row in \`os_staff\`.
3. Role controls page access on server; a hidden navigation link is not authorization.
4. Postgres RLS remains the final data-access boundary; no admin keys are present.
5. Sales may read proposals and commercial modules but not financials or agent panel.
6. Production may view assigned operational modules but not proposals, finances or agent panel.
7. Owner can see roster, finances and agent status (agent itself stays disabled).
8. No public signup, self-assigned roles or team write endpoint.
9. Auth state and private responses must not be cached.
10. Invalid login error messages never disclose whether an account exists.

## Evidence
- Supabase organization already exists and owner identity is bound to the confirmed auth user through a guarded, scoped data update.
- Verify negative HTTP paths: \`/resumen\` redirects logged-out requests, \`/api/me\` returns 401.
- E2E with a real user's credentials is NOT RUN until the user signs in.
- Provider controls still pending: turn off open signup, enable leaked-password protection, configure recovery/OTP email flow.
- Never claim tests that were not executed.

## Release gate
OS-02 remains a Draft PR until: GitHub CI passes lint/typecheck/tests/build/audit, protected Vercel preview returns secure unauthenticated responses, roles validated under authenticated sessions (owner and denied roles), and the owner reviews the branch. No merge or live rollout without that gate.
