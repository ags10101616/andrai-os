# OS-12 · José Luis Dot Account & Read-Only Agent Workspace

**Status:** independent Auth invitation accepted, confirmed account **ACTIVE** and bound to dedicated agent identity. Protected Vercel deployment and real dot-browser E2E still pending.
**Branch:** `feature/os-12` (draft PR #12).
**Capability:** `brief_read` only. **No autonomous actions or human staff permissions.**

## Independent principal

José Luis is a ChatGPT dot; he does not share the owner's Supabase Auth account, cookie session or staff role. The owner created and verified a distinct email alias and completed an invitation in Supabase Auth. The corresponding real confirmed Auth UID was validated against the reserved `os_agent_identities` record and bound through a guarded administrative update.

**Verified current database status**
- Agent slug `jose-luis`; status `active`.
- Email matched exactly to confirmed Auth identity; UID bound.
- Capabilities exactly `['brief_read']`.
- No active human staff membership for that UID.
- Existing Direction membership remains active.
- No password or Auth token entered in Chat or committed to GitHub.

## Architecture

- `public.os_agent_identities` is separate from `os_staff`.
- Only authorized owner can inspect agent registry status.
- `/diagnostico-acceso` distinguishes human staff and agent sessions using fresh Supabase Auth checks.
- `/agente` is not a human dashboard. It is a distinct, RLS-protected portal.
- Guarded private PostgreSQL helper returns only five business *counts* and timestamp:
  active projects, open tasks, open deliverables, quotes in review, active opportunities.
- No clients, names, email addresses, prices, financial entries, invoices or raw row payloads.
- Supabase Auth confirmed UID + normalized email + `active` status + capability `brief_read` must all match.
- Agent cannot have an active staff binding at the same time.
- No writes, outbound communications, payment access, admin keys or automated approval rights.

## Tested

- Confirmed the agent's Auth invitation is accepted, email is confirmed, and account has logged in (in the owner's browser).
- Guarded activation succeeded, with exactly one matching Auth account and no staff conflict.
- Live bound-agent JWT role simulation returned authorized aggregate `brief_read`.
- Negative checks: raw staff, customer, project, finance, event data denied; owner reporting and project mutation denied.
- Verified status change to `suspended` immediately revokes the brief RPC inside a reversible transaction.
- Role and suspension tests use `BEGIN ... ROLLBACK`, preserving the real active identity.
- Node tests, lint, TypeScript, Next build and dependency audit passed on previous OS-12 feature commits.

## Not yet proven

- Dot's **own** cloud-browser sign-in to ANDRAI OS. Auth acceptance in the owner's browser is not an authenticated dot-browser E2E.
- Current OS-12 preview deployment was built before branch environment variables were configured. Signed-out protected routes returned 503 and access diagnostics 500.
- Vercel API refused forced redeployment due to daily free deployment quota. The preview is **NOT YET READY** to hand to José Luis; rebuild and retest after quota availability.
- GitHub repo remains public by owner's preference. No private customer records or tokens belong there.
- Independent staging backup/restore, password leak protection, role E2E and device access remain launch gates.
- Any future agent proposals require typed review and owner approval under OS-13; OS-12 has no sending or execution tools.

## Next secure login step (after Vercel rebuild)

Start work in the José Luis dot, use his own cloud browser to open the protected OS-12 login page; owner takes over the browser to sign in with the *agent* account and completes MFA. Return control to the dot. Confirm `/diagnostico-acceso` shows agent authorization and `/agente` renders the five counts. Verify that `/finanzas`, `/equipo`, ordinary CRM rows, owner CSV/PDF and server admin endpoints remain denied. Never send passwords or cookies through Chat.

To revoke access, suspend the agent principal; this was SQL-tested with rollback.
