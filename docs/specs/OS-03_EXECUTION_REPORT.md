# ANDRAI OS · OS-03 Execution & Verification

Date: 2026-10-24
Working branch: feature/os-03
Review: https://github.com/ags10101616/andrai-os/pull/3
GitHub Actions: https://github.com/ags10101616/andrai-os/actions/runs/40119172674
Vercel branch preview: https://andrai-os-git-feature-os-03-ags10101616s-projects.vercel.app

**Verdict: Database integrity core PASS; whole spec conditional on real owner-session E2E and UI integration in OS-05. No merge.**

## Shipped
1. Atomic PostgreSQL function \`public.os_create_lead_v1\`; no trusted tenant id from caller.
2. Explicit role membership from the verified bound Supabase Auth identity, owner/sales only.
3. SECURITY INVOKER + original RLS remains active. Authenticated EXECUTE, anonymous denied.
4. Replay-safe pair of UUID request identifiers; a conflicting replay returns SQLSTATE 23505.
5. Normalized input and 22023 validation failures, no client row on partial failure.
6. Immutable \`id\`, \`organization_id\`, \`created_at\` for five commercial tables.
7. Audit triggers for the client and opportunity insert remained active.
8. Service-only TypeScript data adapter for future OS-05 form.
9. Versioned SQL rollback test with synthetic records, and CI contract tests.

## Remote database history (Supabase)
- andrai_os_os03_atomic_lead_identity
- andrai_os_os03_fix_sql_normalization

The latter is a necessary patch: the initial procedure incorrectly treated SQL COALESCE/NULLIF as schema functions. The first test exposed it, the patch was applied and the full tests passed. Keep **both** migrations in historical order.

## Verified PostgreSQL assertions
Executed using a transaction with a simulated authenticated JWT \`sub\`, ending in ROLLBACK (no live client records):
- Bound Direction user: initial create returns \`created=true\`.
- Same identifiers and payload: replay returns \`created=false\` and one opportunity.
- Same identifiers and different title: SQLSTATE 23505; original row unchanged.
- Second opportunity conflicts: new client from the attempted first write is rolled back.
- Attempted organization reassignment: SQLSTATE 42501.
- Invalid one-character client name: SQLSTATE 22023.
- Audit: one client INSERT and one opportunity INSERT.
- Unbound identity: SQLSTATE 42501; no writes.
- Sales role simulation: creation permitted and visible (rolled back).
- Production role simulation: denied (rolled back).
- Final counts: 0 clients, 0 opportunities, 0 audit events; original active owner remains intact.
- Five immutability triggers installed. RPC is SECURITY INVOKER, anonymous EXECUTE=false.

## Code, build and security
- GitHub Actions run 40119172674 succeeded: npm ci from committed lockfile, lint, typecheck, node tests, Next build, npm audit.
- Vercel branch deployment on tested SHA is READY.
- Supabase security advisors: existing \`auth_leaked_password_protection\` warning remains; no new security findings.
- Performance advisors: 13 unindexed foreign keys and one RLS initplan warning remain (to triage as usage warrants).
- No customer records, service role token, commercial amounts or agent accounts were written.
- Repository currently PUBLIC by explicit owner deferral; no private data has been committed.

## Acceptance still pending
1. Owner signs in to OS-02 preview with their own credentials and verifies authorization.
2. End-to-end browser session calls the RPC with correct cookies on the OS-05 form.
3. True cross-tenant test with two separate authorized tenants, plus concurrent replay test.
4. Per-module error UX, idempotency recovery UI and API rate limiting in OS-05.
5. Separate GitHub privacy review and PR approvals before merging.

**Next:** OS-04 visual component system; then OS-05 CRM wiring to this atomic operation.
