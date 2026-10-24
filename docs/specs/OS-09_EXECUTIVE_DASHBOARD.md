# OS-09 — Executive Dashboard, Role-aware Metrics & Reports

**State:** technical preview implemented, signed-in human acceptance pending.
**Source:** branch \`feature/os-09\` based on \`feature/os-08\`.
**Pull request:** https://github.com/ags10101616/andrai-os/pull/9
**Preview:** https://andrai-os-git-feature-os-09-ags10101616s-projects.vercel.app/resumen

## Purpose

One internal screen to understand ANDRAI performance without pretending commercial
proposals are revenue, or making up data where the CRM is still empty.

### Five operational datasets
- \`os_opportunities\` — open pipeline, stage breakdown, prospect activity and overdue followups.
- \`os_projects\` — active work, overdue milestones at project level, project stages, average reported progress.
- \`os_tasks\` — open/overdue/upcoming tasks, completed tasks in selected period and open deliverables.
- \`os_quotes\` — total quotes, approvals awaiting review and status distribution.
- \`os_ledger\` — **manually entered** receipts/expenses/refunds during selected period, not bank-verified activity. Pending accepted-quote balances derive from the existing secured OS-08 function.

## Time definitions

The user chooses exactly 7, 30 or 90 calendar days. The time zone is
\`America/Monterrey\`; a period includes the current local date plus preceding
calendar days (6, 29 or 89). Created/completed events use timezone-aware
timestamp boundaries. Financial ledger events use manually recorded \`happened_on\`
date. Current open workloads, stage counts and accepted balances are **all-time
point-in-time snapshots** and explicitly *not* filtered by this period.

## Role-specific result contract

| Metric | Direction (owner) | Commercial (sales) | Production |
|---|---|---|---|
| Own tasks / team tasks | All team | Assigned staff only | Assigned staff only |
| Opportunities and quotes | All tenant | All tenant | Absent |
| Projects | All tenant | Absent | Assigned staff only |
| Manual finance and accepted balances | All tenant | Absent | Absent |
| Read-only audit events | Recent tenant events | Absent | Absent |

The SQL result **omits** unauthorized sections. TypeScript verifies both
the authenticated role and the absent sections, failing closed if they disagree.
The CSV exporter uses the *same validated model*, so it cannot emit financial
columns for nonowners.

## Architecture

- \`public.os09_dashboard_v1(p_days)\` — SECURITY INVOKER and
  \`EXECUTE TO authenticated\` only. Role and organization come from the
  bound, active, confirmed \`os_staff\` relationship and the existing
  \`os_private.member_role\` function. RLS applies to every table.
- No new tables, no service-role tokens and **no write operations**.
- \`/resumen\` — exact Next.js App Router route, dynamic server rendering
  with no caching and role-filtered UI.
- \`/resumen/reporte.csv\` — authenticated on-demand UTF-8 CSV containing
  role-permitted aggregates only, \`Cache-Control: private, no-store\`,
  \`Content-Disposition: attachment\` and no index.
- Supporting list previews show a bounded 7 upcoming tasks,
  6 commercial followups and 8 owner-only audit events, **not used for KPI totals**.
- Styled using OS-04 Spectral Ember tokens, with explicit zero-data empty states.

## Verified QA

1. Database rollback test with synthetic client, opportunity, project, tasks,
   accepted quote and manual receipt: all windows 7/30/90 matched expected
   counts, and accepted balances matched OS-08.
2. Authenticated role switching within reversible transactions:
   sales cannot get finance or production metrics; production cannot
   get finance or sales metrics; unbound user blocked.
3. Second tenant synthetic opportunity/project/task did not leak into
   owner dashboard or RLS SELECT queries; ROLLBACK.
4. Unit contract tests: response validation, role mismatch failures,
   CSV segregation, date allowlist and no-store routes.
5. GitHub Actions: npm ci, lint, TypeScript, node tests, build and npm audit.
6. Vercel feature-branch deployment READY behind project-wide Vercel Auth.

## Remaining before closure

- User's OS-02 real login E2E, test account sessions for role denial, secure
  password policy and recovery/invites.
- Authenticated-browser mobile, desktop, keyboard and accessibility validation.
- Revalidate report semantics and QA with first true agency records; no data migration
  was performed and all commercial counts still begin at 0.
- Check performance on large datasets; current SQL computes exact scans and
  can be optimized with dedicated indexes / materialized snapshots later.
- Owner sign-off on CSV format and daily operational indicators.
- GitHub repository is **currently public**, although the Vercel preview is
  access-protected. Do not commit customer records or secrets.
- No background José Luis agents, autonomous reporting or email delivery.

**Verdict:** technical core ready in protected preview; not an operational launch.
