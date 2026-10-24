# OS-08 · Execution Report

**Date:** October 24, 2026
**PR:** https://github.com/ags10101616/andrai-os/pull/8 (draft)
**Branch:** feature/os-08, based on feature/os-07
**Protected Preview:** https://andrai-os-git-feature-os-08-ags10101616s-projects.vercel.app

## Shipped
- Migration: \`andrai_os_os08_manual_finance_ledger_v1\` in the isolated ANDRAI OS Supabase project.
- Owner-only, RLS-bound and SECURITY INVOKER RPCs for manually recorded receipts/expenses/refunds, aggregates and accepted quote balances.
- Manual ledger rows are append-only; users cannot delete or alter their amounts.
- Quote-linked payment maximum and refund minimum validated in the database, including direct PostgREST insertion attempts. Advisory transaction locks protect the per-quote cash stream.
- UUID idempotency/replay validation to avoid duplicate writes on network retries.
- Financial summary covers **all** authorized rows. Most-recent-100 activity list is distinct from totals.
- Owner page \`/finanzas\` with metrics, filterable history, accepted-only quote balances, manual receipt/expense/refund intake.
- Preview writes explicitly disabled via \`OS08_FINANCE_WRITES_ENABLED=false\` on feature/os-08.
- No Stripe, bank connectivity, CFDI issuance, legal acceptance, or autonomous agent actions are claimed.

## Verification
### Real PostgreSQL transaction — PASS, ROLLBACK
Versioned test source: \`tests/postgres/os08_manual_finance.rollback.sql\`.
- Synthetic quote total: MXN 11,600.00 (incl. IVA).
- Manual receipt: MXN 6,500.00; synthetic refund: MXN 2,000.00.
- Internal expense: MXN 2,500.00.
- Net cash movement from entries: MXN 2,000.00.
- Outstanding amount after manual acceptance: MXN 7,100.00.
- A quote merely marked sent is NOT counted as accepted receivable.
- Same UUID and same payload replay: \`created=false\`, no duplicate.
- Same UUID with different content: SQLSTATE 23505.
- Overpayment and refund exceeding recorded receipts: SQLSTATE 22023.
- Direct Data API insert attempting overpayment: SQLSTATE 22023.
- UPDATE/DELETE forbidden, audit events match ledger inserts, unbound user denied.
- Transaction ROLLBACK: no synthetic movements persisted.

### Role and tenant tests — PASS, ROLLBACK
- Sales and Production sessions cannot call finance reports or record movements.
- Direction cannot attach a ledger expense to a project in another organization.
- Role and tenant seed changes are rolled back without touching permanent staff.
- Synthetic IDs and names only.

### Build and release
- GitHub CI confirmed npm ci, ESLint, TypeScript, Node unit tests, Next.js production build, npm audit PASS.
- Vercel branch deployment READY; project-wide Vercel Authentication protects previews.
- No merge to main; PR #8 remains draft.

## Known gates / residual risks
- **Owner-authenticated browser E2E** has not occurred (OS-02 verification still pending).
- The system cannot verify whether a manually entered reference was settled by a bank/processor. Different operation UUIDs could still represent an inadvertently repeated real-world payment; reconciliation evidence must be reviewed operationally.
- All write switches remain OFF pending human pilot, rate limiting, independent roles, false-record prevention and release approval.
- Supabase security advisor continues to warn \`auth_leaked_password_protection\` disabled: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Repo temporarily PUBLIC by owner preference. No secrets, personal financial data or customer records are included in this work.
- No general-ledger accounting, tax filings, CFDI, Stripe receipts, AP aging, or actual bank balances exist.
- Forthcoming OS-09 executive dashboard should reuse database RPC summaries, not recalculate from a truncated display list.

**Verdict: OS-08 technical slice validated. Operational finance workflows are NOT approved or activated.**
