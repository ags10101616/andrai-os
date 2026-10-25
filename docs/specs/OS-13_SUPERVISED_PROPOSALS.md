# OS-13 — Typed Suggestions and Human Editorial Review

**State:** technical implementation in feature/os-13. PR draft; production NOT approved.

## Why it exists
ANDRAI OS had a legacy `os_agent_proposals` table with no source identity or
human review audit. OS-13 makes this a supervised review queue.

## Contract
- Agent suggestions have fixed kinds: alert, followup, task, quote_draft.
- Each has a title, explanation, suggested next step and backend-captured
  sanitized briefing snapshot. Content is UNTRUSTED DATA, never executable code.
- Full attribution to the bound agent Auth UID and tenant. No shared owner login.
- Immutable content after submission; status moves once from proposed to
  approved or rejected, with owner note, time and version.
- An approved idea is never dispatched, executed, synced to CRM, used to
  create tasks or quotes, or used to make a financial transaction.
- Request UUID retry is idempotent; changed payload conflicts. Max eight
  new proposals per agent per Monterrey-local day.
- Proposed items expire for approval after 14 days; rejection is still allowed.

## Triple lock / no accidental release
1. Agent's existing capabilities remain ['brief_read']. This migration only
   expands allowed values to include proposal_draft, but does NOT grant it.
2. Database table os13_proposal_controls starts with intake_enabled=false,
   review_enabled=false. Authenticated Data API cannot update either control.
3. Preview requires OS10_PILOT_READ_ONLY=false plus OS13_AGENT_PROPOSALS_ENABLED
   or OS13_OWNER_REVIEWS_ENABLED=true for the relevant form server action.
   Both module switches remain false in protected preview.

## Authorization
- Client INSERT/UPDATE/DELETE grants on proposal and control tables revoked.
- Security-definer core functions are private, guarded with exact verified
  Auth UID, confirmed email, agent capability or human owner role, tenant
  lock, content validation and flags. Public wrappers are security invoker.
- Owner can review only their tenant, one time per revision. Agent may only
  read its own proposals. Sales/Production may read neither.
- All proposals and decisions append to os_audit_events and OS11 held
  outbox metadata. No notifications leave ANDRAI OS.

## UI
- /jose-luis: owner review queue, breakdown and governance controls;
  forms disabled while flags are OFF.
- /agente: proposed suggestion editor and list of authored items;
  editor disabled while flags are OFF.
- Both routes dynamically server-render under Supabase Auth/RLS.

## Verified
- Reversible PostgreSQL fixture: blocked without capability, blocked while
  controls OFF, two suggestions with idempotent replay and different-payload
  conflict, eight daily limit, role/tenant checks, blocked repeated review,
  owner approval/rejection and exact audit metadata counts.
- SQL ends in ROLLBACK; no customer data or proposal seed survives.
- Node unit tests, lint, Next build, npm audit and Vercel READY must pass.

## Remaining
- José Luis actual dot-browser login is still pending due to deferred
  Supabase Auth recovery URL configuration; no need to stop development.
- Real user E2E, staging backup/restore, GitHub Private, leaked-password
  protection, support workflows and owner review are still pending.
- No PR merge, no production deployment and no automatic execution.