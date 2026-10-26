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

## Pilot activation decision — scope and safeguards
- The owner expressly requested beginning actual use; SQL fixtures OS03..OS14 (16) PASS and OS16 follow-up/audit/unauthorized rollback fixture PASS.
- A confirmed, bound owner account was independently visible in the authenticated OS15 browser tab. Only one active human staff member existed in the DB before activation.
- A new, SSO-protected OS16 preview has 9 branch-scoped Vercel env vars. Dedicated OS05/06/07/08 manual writes were staged true *while OS10 global read-only remained true*, then OS10 was changed to false. OS13 agent flags remain false.
- After Vercel redeployment, verify its exact SHA and `/api/health` shows `private-pilot-manual-entry`; this is pilot activation, NOT production G4.
- Real signed-in form submit from a browser remains NOT RUN by the agent; the owner should use first creation as a monitored smoke. Auth recovery/backup, leaked-password protection and private repo decision are still outstanding.
- Revert instructions: OS10=true and force a new protected preview deployment. Data already entered are real, persist, and are not deleted by rollback.
