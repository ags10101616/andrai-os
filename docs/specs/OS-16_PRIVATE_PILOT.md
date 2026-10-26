# ANDRAI OS · OS-16 / Private operational pilot

**Playbook:** Design & Engineering v1.0.0 · Advanced; work on stacked branch
`feature/os-16-private-pilot` (based on OS-15 official UI, not `main`).
**Owner request:** prepare ANDRAI OS for daily use now, safely.
**Version:** 2026-10-25 / OS-16-SPEC-01.

## G0 — Verified baseline
- Protected preview has existing confirmed owner account; owner session on OS15
  displayed `/resumen` and navigation. No real commercial records in 8 core tables.
- DB RLS enabled on all 14 public OS tables. OS-13 agent capabilities remain `brief_read`.
- OS10 global read-only and four commercial module switches OFF on OS15 preview.
- All 16 historical transactional SQL fixtures OS03..OS14 passed after retrying
  a transient Supabase connector error; they all include ROLLBACK.
- Supabase password-leak protection still WARN disabled. Cannot toggle via
  connected management tool and requires owner dashboard action.
- GitHub `main` is still OS01, stacked draft PRs; currently repository public.
- No authenticated browser control available via the chat Browser connector,
  which is read-only. Actual UI E2E is a separate remaining gate.

## G1 — Operational scope
Allow Director to proceed in this order:
1. Create CRM client + opportunity with idempotency.
2. Open opportunity detail and update stage, next action/date, estimated value.
   Optimistic `updated_at` prevents lost update; all writes authenticated,
   tenant-scoped by RLS and audited.
3. Create projects for clients and tasks/deliverables by assignment.
4. Version and approve quotes, choose Statement/Atelier PDFs; accept manually.
5. Record manual receipts/expenses/refunds only through owner-authorized,
   append-only ledger, with no actual bank/card processing.
6. Export owner-scoped commercial table rows as private JSON on demand.
7. Preserve separate José Luis identity with no autonomous execution.

## Requirements and acceptance
| ID | Requirement | Evidence / gate |
|---|---|---|
| OPS-01 | Owner first-use guide reflects genuinely empty workspace | Next CI + authenticated browser |
| CRM-01 | Owner/sales may update stage, date, task and estimate | Static tests + OS16 SQL transaction + authenticated UI |
| CRM-02 | Failed/stale update never silently overwrites another edit | Optimistic compare and SQL fixture |
| SEC-01 | Unbound user, production and dot denied business writes | Existing 16 SQL fixtures + new OS16 fixture + server gate |
| SEC-02 | JSON export only `equipo` owner; RLS and no-store; never partial | Unit contract + signed-out preview + owner browser |
| DOC-01 | Export is explicitly not disaster recovery | Wording and owner workflow |
| SAFE-01 | Preview flags OFF until pilot activation evidence accepted | Verify Vercel config; user-authorized opt-in |
| SAFE-02 | No Supabase migrations, no test business records persisted | DB snapshot before/after |
| QA-01 | `npm ci`, lint, types, tests, build, npm audit high all PASS | GitHub Actions on final commit |
| QA-02 | Vercel preview at exact SHA, login and logged-out route security | Deployment inspection + HTTP |
| QA-03 | Real owner browser creates, reopens, updates a record | NOT RUN unless authenticated browser UAT |
| REL-01 | No production/main until recovered Auth links, backups and browser E2E | Block release |

## Implementation decisions
No added dependencies and no changes to Supabase schema or privileged grants.
Export reads only owner-tenant scoped commercial tables and returns JSON, with a
5000-row/table safety cap, no tokens/identities or server credentials. This is a
manual point-in-time export, **not** backup/restore verification.

The CRM update uses the existing RLS UPDATE policy, triggers and
`updated_at` compare, not a new SECURITY DEFINER function. UI remains valid
even if writes are disabled; server always rechecks flags.

## Gate and rollback
A private live-data pilot may be opened on an SSO-protected preview only after
all automated and DB tests pass and the user has explicitly requested activation.
Do not interpret pilot as release G4/G5. Restoring read-only is by reverting
OS10/OS05-08 preview environment flags and redeploying a new preview; this
disables **future** writes but does not erase any records already entered.
For security events, revoke affected sessions separately.
