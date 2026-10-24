# OS-12 · José Luis Dot Account & Read-Only Agent Workspace

**Status:** backend infrastructure and UI prepared; account remains PENDING.
**Repository:** \`ags10101616/andrai-os\`, branch \`feature/os-12\`, parent \`feature/os-11\`.
**Capability:** read-only safe summary. **No autonomous actions.**

## Why a separate principal
José Luis is a ChatGPT dot using its own cloud-browser session. It is not a human
ANDRAI employee. It must not receive the owner account, a staff role, production
secrets, a service-role key, or a shared password.

OS-12 provisions one pending \`os_agent_identities\` row for agent slug \`jose-luis\`,
with NULL login email and NULL Auth UID. This is **not yet an active Supabase login**
and cannot be used until a valid external mailbox and verified Auth identity exist.

## Read-only architecture
- A separate \`os_agent_identities\` table; no \`os_staff\` role changes.
- \`status=pending|active|suspended\`, initially PENDING. No self-service writes.
- Server verifies confirmed Supabase Auth UID and exact normalized email.
- Private, guarded PostgreSQL helper returns only aggregated counts:
  active projects, open tasks, open deliverables, quotes in review,
  active opportunities and timestamp.
- No names, email addresses, financial values, customer documents,
  invoices, webhook credentials or private account details.
- Core helper is private SECURITY DEFINER guarded by UID/email/status,
  and exposed only through a public SECURITY INVOKER wrapper.
- Base domain RLS continues to deny direct rows to this agent account.
- Next.js route \`/agente\` uses a separate UI, **not** human AppShell/RBAC.
- \`/diagnostico-acceso\` recognizes the agent role only after secure verification.
- Owner-only \`/equipo\` shows agent provisioning status without secrets.

## Secure onboarding checklist (not executed)
1. Owner selects or controls a dedicated address/alias at an external email provider.
   ChatGPT dots do not automatically receive a standalone email inbox.
2. Owner creates a separate Supabase Auth user with that address through the
   supported Auth invitation/signup flow, and confirms email in their mailbox.
3. Administrator verifies auth.users identity and email, and binds the existing
   pending \`os_agent_identities\` row to the verified Auth UID. This must be
   performed as an explicitly reviewed administrative step, not from a public route.
4. Only after verification, change status to active and set activated_at.
   Confirm the email matches, and that the agent has no active human staff membership.
5. Launch a task inside the actual José Luis dot, open its own cloud browser,
   navigate to a protected ANDRAI OS login URL and **take over the browser** to
   enter the password and complete MFA. Never send a password in chat.
6. Return control to José Luis; verify \`/diagnostico-acceso\` sees agent scope,
   and \`/agente\` loads the safe summary.
7. Verify no access to \`/finanzas\`, staff routes, normal CRM rows, owner audit,
   billing endpoints, PDF/CSV downloads, admin keys or private data.
8. Suspend the agent principal on risk or change of staff. Test revocation.
9. Vercel preview Authentication is an independent gate; temporary share links
   are not a durable production login strategy.
10. Before production use, make the GitHub repository private and complete OS-10
    backup/restore, real role E2E and password-protection controls.

## Test evidence
- Reversible PostgreSQL test temporarily separates existing owner identity
  from staff (inside ROLLBACK), binds it as a synthetic agent and confirms the
  safe count is visible while base CRM and Finance RLS deny data.
- PENDING agent cannot fetch the safe brief.
- App source-contract tests enforce role isolation and safe outputs.
- Actual José Luis dot browser E2E is NOT RUN; no mailbox or Auth account
  was invented/created.

## OS-13 (next gate)
Typed proposals, dry-run, human approval, strict budgets, rate limits,
audited outcomes, reversible changes where possible, and a global kill switch.
OS-12 does not perform writes, messaging, collections or external sending.
