# ANDRAI OS OS-16 / Execution evidence

**Snapshot:** 2026-10-25 America/Monterrey
**Branch:** `feature/os-16-private-pilot` and PR #18 (draft).
**Original branch:** `feature/os-15-workspace-liquid` (PR #17).

## Verified DB tests
The full 16-fixture transaction suite OS03 to OS14 passed after a temporary
connector failure was isolated by a simple `select 1` and later individual
retries. Each has `BEGIN; ... ROLLBACK;`. No synthetic commercial records
remained. Additional OS16 CRM CAS/audit/unbound-role fixture executed with
PASS and ROLLBACK. Database table RLS, active owner and zero real commercial
records verified.

## Changes
Owner first-use guide, authenticated CRM detail/update, export-only JSON
route for owner and a control-status panel. No migrations, no new secrets
or dependencies, no downstream agent execution.

## Expected before pilot
- CI PASS for pinned install, lint, typecheck, unit tests, Next build and
  npm audit high, on final SHA.
- Vercel protected preview on exact SHA and branch-specific Supabase publishable
  configuration.
- Confirm all preview flags and owner membership. Do not activate OS13.
- HTTP logged-out denial and read-only response of export.
- Confirm no user-facing commercial data is synthetic.

## Unresolved release gates
Authenticated UI writing E2E, Safari/mobile manual review, browser
accessibility and Auth recovery, leaked-password protection, managed DB backup
and restore, repository privacy decision and owner production promotion.
These MUST NOT be stated as PASS unless actually verified.

## Rollback
Revert code branch/PR or set OS10 flag to read-only and redeploy the preview.
Records entered after activation are real and are **not** undone by a code
rollback. Preserve and export records before restoring or switching branches.
