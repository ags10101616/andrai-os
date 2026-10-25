# ANDRAI OS · OS-14 · Release and database hardening

**Branch:** `feature/os-14-hardening` (stacked on OS-13)  
**Scope:** technical quality only; not a production release.

## Verified starting facts (25 October 2026)
- Dedicated Supabase project `zzpmjuzwoshxibknyopi` ACTIVE_HEALTHY.
- 14 public tables, all with RLS; 1 organization, 1 staff and 1 active agent.
- Commercial domain tables and proposal/audit/outbox tables have zero records.
- OS-13 database intake/review flags OFF and no agent `proposal_draft` capability.
- GitHub CI for OS-13 commit c32c68e PASS (workflow 40231667813).
- Protected Vercel preview READY for same commit; SSO enabled for all deploys.
- Supabase security advisor: leaked-password protection OFF (external owner/admin setting).
- Performance advisor: 15 uncovered FK prefixes, RLS auth.uid() init plan on ledger,
  two multiple-permissive SELECT policy groups. Two unused indexes on an empty workspace
  should NOT be removed without workload evidence.

## Changes
1. Merge `os_agent_identities` owner + exact-UID active agent SELECT predicates into
   one **logically equivalent** policy. Remove exact duplicate owner SELECT policy
   on `os_agent_proposals`. Do not expand tenant visibility.
2. Wrap `auth.uid()` in ledger owner INSERT predicate in `select` (same semantics).
3. Add 15 narrowly scoped FK-supporting B-tree indexes. No indexes dropped.
4. Add static Node tests, transactional Postgres assertions and rollback template.
5. Refresh README so it no longer mislabels the project as OS-02 only.

## Acceptance and stop conditions
- Supabase SQL migration recorded once; verify catalog, all critical RLS flags,
  no new public role grants, no direct proposal mutations, feature gates OFF.
- Post-migration security advisor has no NEW findings; performance warnings addressed
  (unused indexes may remain while empty). Re-run and record advisors.
- `npm ci && npm run lint && npm run typecheck && npm run test && npm run build`,
  plus `npm audit --audit-level=high` through GitHub Actions.
- A new protected Vercel preview READY on exact commit; do not infer login works from build.
- Authenticated browser owner/agent, accessibility, backup/restore rehearsal and
  password-leak protection still gate ANY production promotion.
- Keep all OS05/06/07/08/10/13 write switches OFF; proposals remain ideas only.

## Reversibility
`docs/sql/OS-14_ROLLBACK_TEMPLATE.sql` reverses these changes through a new reviewed
migration if necessary. Do not edit completed migration history.

## Explicit non-goals
No merge to main; no payments, email, automated messages, data ingestion or CRM writes.
No new Supabase staging instance (would require cost confirmation). Repo visibility
remains a separate owner decision; do not publish secrets while public.
