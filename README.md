# ANDRAI OS — Internal agency operating system

**Current development:** OS-13 supervised agent proposals, plus OS-14 hardening in
`feature/os-14-hardening`. This is a protected, read-only **pilot**;
it is not an operationally approved or production-ready CRM.

## Product
ANDRAI OS is a Next.js 16 / React 19 / TypeScript / Supabase application using
the Spectral Ember design system. It contains authenticated, role-scoped modules
for CRM prospects, projects, tasks, quotes/PDFs, a manual finance ledger,
executive reporting, team access, an event/audit feed, and owner-only José Luis
supervision. The independent José Luis agent has an isolated aggregate-only
briefing portal. OS-13 can draft and review proposals in its implementation,
but **all gates remain disabled**, and approval never executes a proposal.

## Development and quality
Requires Node >=22.12 and npm with the pinned `package-lock.json`.

```bash
npm ci
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY locally.
# Never use service_role credentials in client code or commit them.
npm run quality
```

GitHub Actions runs a reproducible install, lint, TypeScript, unit tests,
Next.js build and npm audit. Vercel previews use SSO protection. Route
`/api/health` tests HTTP liveness ONLY; it is not proof of authenticated
workspace, write integrity, or Supabase backup recovery.

## Safe release rules
- Development branches stack from OS-02 through OS-14. Review each draft PR in order;
  **do not merge the whole 99+-commit stack into main merely because a preview builds**.
- `OS10_PILOT_READ_ONLY` stays true. OS05/06/07/08 commercial-write flags remain false.
- OS13 proposal intake and editorial review flags remain false in both the database
  and Vercel; agent capability `proposal_draft` is not granted.
- No client, payment, accounting, email or external dispatch automations are enabled.
- Human owner and agent E2E, Auth recovery URL configuration, leaked-password
  protection, staging backup/restore, visual/a11y checks and owner release sign-off
  must precede any operational launch.
- The repository is currently **public by prior owner choice**: do not include client
  data, sensitive identifiers or any key material. Re-evaluate Private visibility
  before inviting more collaborators or storing internal operational details.

## Documentation
- `docs/specs/OS-13_SUPERVISED_PROPOSALS.md` — supervised suggestion contract.
- `docs/specs/OS-13_EXECUTION_REPORT.md` — completed OS-13 evidence.
- `docs/specs/OS-14_RELEASE_HARDENING.md` — release hardening acceptance gates.
- `docs/sql/OS-14_RLS_FK_HARDENING.sql` — additive SQL hardening.
- `tests/postgres/os14_hardening.rollback.sql` — transaction-scoped checks.

ANDRAI OS is separate from the marketing site andrai.com.mx, ZONERA,
5TAR HOST and other client projects.
