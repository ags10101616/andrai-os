# ANDRAI OS — Private Operational Pilot (OS-16)

**Current live pilot branch:** `feature/os-16-private-pilot`. This is a
protected internal preview for real manual data entry by authorized team roles,
NOT a public release, payment processor, automatic invoicing platform or
autonomous agent deployment.

**Preview:** https://andrai-os-git-feature-os-16-private-pilot-ags10101616s-projects.vercel.app

## Start using ANDRAI OS
1. Open the protected preview, pass Vercel SSO, sign in with your
   existing authorized ANDRAI OS account. No public self-registration.
2. **Resumen:** view the real agency indicators and first-use guide.
3. **Prospectos:** create your first client/opportunity, then click the
   client name to update pipeline stage, next follow-up/date and estimated value.
4. **Proyectos / Tareas:** create a project for an existing client,
   assign work and update progress according to your role.
5. **Cotizaciones:** create versioned proposals, review with Direction and
   export either Statement or Atelier PDFs. PDF is not a fiscal CFDI.
6. **Finanzas:** manually register internal receipts and expenses where
   authorized. This is not bank reconciliation or a real payment.
7. **Equipo y permisos:** review the limited member list and download
   an owner-scoped commercial JSON data export. This export **is not** a
   managed PostgreSQL backup/restore procedure. Keep the file private.

All records entered from the protected pilot are **real records stored in
Supabase**, not demo fixtures. Abandoning the branch does not erase them.
A status badge says `PILOTO PRIVADO · CAPTURA MANUAL` when the global
kill switch and module-specific gates are enabled. A `/api/health` check
reports HTTP liveness and mode, not complete database or Auth readiness.

## Architecture and quality
Next.js 16, React 19, TypeScript 6, Supabase SSR/PostgreSQL RLS,
Tailwind 4 and Spectral Ember Liquid Precision. Node >=22.12.
Dependencies pinned in `package-lock.json`.

```sh
npm ci
npm run quality
```

The repository has tests for authentication constraints, role isolation,
CRM transactional writes, projects/tasks, quote versioning/PDF, manual
finance ledger, events, agent limitations and display-only motion.
SQL QA fixtures in `tests/postgres` end with ROLLBACK and should be run
only against the isolated ANDRAI OS database with the stated permissions.
Never execute synthetic INSERT tests against customer systems.

## Hard safety constraints
- Only a **branch-specific protected preview** may run user-approved
  manual capture; main and production promotion remain gated.
- Supabase row-level authorization is always enforced; flag variables
  only gate whether a user is allowed to attempt a mutation.
- The preview may enable `OS10_PILOT_READ_ONLY=false` plus
  OS05/OS06/OS07/OS08 manual write flags. OS13 agent intake/review
  switches MUST remain false. José Luis has `brief_read` only.
- The repo remains **public** by existing owner choice: commit no
  customer data, access tokens or secrets.
- Before unrestricted production release, verify actual signed-in
  human/agent E2E, recovery redirects, leaked-password protection,
  secure backups and restore, device/mobile/a11y QA and owner approval.
- To suspend new manual writes, set the OS10 global read-only
  flag back to true on this preview branch and redeploy. Existing
  records are not automatically rolled back.

## Specs and evidence
- `docs/specs/OS-15-01_EXECUTION_REPORT.md` — Liquid Precision integration.
- `docs/specs/OS-16_PRIVATE_PILOT.md` — gated operational scope.
- `docs/specs/OS-16_EXECUTION_REPORT.md` — verification and gaps.
- `tests/postgres/os16_crm_followup.rollback.sql` — owner CRM update and audit QA.

Separate from andrai.com.mx, ZONERA, 5TAR HOST and andrai-crm.
