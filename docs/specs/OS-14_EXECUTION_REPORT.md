# ANDRAI OS · OS-14 — Execution evidence
**Checked:** 2026-10-25 (America/Monterrey)  
**Branch:** `feature/os-14-hardening`  
**Review:** https://github.com/ags10101616/andrai-os/pull/14 (DRAFT; no merge)

## Scope
Safe isolated workspace hardening. No promotion, no business or agent writes,
no external messaging, no real customer data and no payment operations.

## Versioned database migrations (verified)
- `andrai_os_os14_rls_fk_hardening_v1` applied successfully (20261025205603).
  Consolidated agent identity owner-or-exact-UID SELECT RLS, removed duplicated
  proposal owner policy, optimized ledger Auth accessor, and created fifteen
  B-tree foreign-key support indexes.
- `andrai_os_os14b_proposal_read_policy_v1` applied successfully.
  Consolidated proposal owner-or-authored-active-agent SELECT policy without
  changing its owner, agent, tenant or auth predicates.
- The five transactional PostgreSQL tests below passed after both migrations,
  **all ending in ROLLBACK**:
  `os14_hardening.rollback.sql`,
  `os12_active_agent_access.rollback.sql`,
  `os13_agent_proposals.rollback.sql`,
  `os13_cross_tenant.rollback.sql`,
  `os13_expired_review.rollback.sql`.
- SQL state after QA: 14 exposed-schema tables RLS enabled; 1 organization,
  1 staff owner, 1 active `brief_read` dot; 15 OS14 FK indexes;
  exactly one authenticated SELECT RLS policy on proposals.
  All commercial entities, proposals, audit/outbox tables remain empty.
  Proposal DB `intake_enabled=false`, `review_enabled=false`, and no
  agent has `proposal_draft`.

## Advisors before and after
- Before: 15 foreign keys without covering indexes; one
  `auth_rls_initplan` warning; two `multiple_permissive_policies` groups.
- After OS14B: those three warning categories cleared.
- Remaining SECURITY WARN: Supabase leaked-password protection disabled.
  Admin/provider setting outside this migration; not fixed. Documentation:
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Remaining PERFORMANCE INFO: 13 unused indexes in a database without
  commercial data. Do not drop indexes based solely on no recorded reads.

## CI and preview
- OS14A SHA `5831f130aed66d2af23fb9cdfbf1a37a44ea646a`:
  GitHub quality workflow PASS twice; Vercel protected preview READY.
- OS14B SHA `785d32f471fc95e2eee6dcb6dafc4db9d78b8aa4`:
  GitHub quality workflow PASS on runs `40233230899` and `40233234903`;
  the Vercel preview initially built successfully.
- Found a real configuration defect: newly created OS14 branch had NO
  branch-scoped preview environment variables. A successful build could not
  prove that authenticated routes were properly configured.
- Added and verified nine **OS14 preview-only** Vercel environment keys:
  Supabase URL and publishable key, global OS10 read-only switch ON,
  OS05/06/07/08 write switches OFF and OS13 intake/review switches OFF.
  No secret or value is included in Git.
- After configuring preview env, forced a fresh deployment of the unchanged
  OS14B SHA: Vercel deployment `dpl_CYvi3WpTMSEX7muTdFszqr3zKQ7b`,
  status **READY**, URL
  https://andrai-2q4ff3ccc-ags10101616s-projects.vercel.app.
  It remains protected by Vercel SSO.
- Vercel recent preview runtime error log query returned no records. This is
  NOT a functional or authenticated-browser E2E certification.

## Release decision and remaining gates
**TECHNICAL QA VERIFIED / PILOT READ-ONLY / PRODUCTION NOT AUTHORIZED.**
No PR was merged, `main` was untouched, and deployment was preview only.
Remaining steps before any release:
1. Owner and agent actual signed-in browser E2E including route segregation,
   password recovery, session revocation and role-denial checks. NOT RUN.
2. Independently verify recovery URL provider Auth configuration.
3. Enable leaked-password protection in Supabase Auth admin settings.
4. Perform independent staging/restore drill with approved cost and access,
   or an equivalent verified backup/restore procedure. NOT RUN.
5. Resolve public GitHub repository visibility with owner (public by prior
   choice; no credentials or customer data are to be committed).
6. Visual/accessibility and mobile checks, explicit owner sign-off, review
   stacked PRs in order, and only then decide if/when to release.

The content of this report is evidence, not a claim of 100% readiness.
