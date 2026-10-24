# OS-08 · Finanzas / Manual Ledger and Quote Balances

**Status:** implementation branch, pending technical validation and human E2E.
**Parent:** feature/os-07 · **Branch:** feature/os-08.
**Repository:** ANDRAI OS only; no contact with ANDRAI marketing, ZONERA or 5TAR HOST.

## Problem solved
The initial ledger only held income/expense and did not relate quotes to manually recorded
payments or refunds. Quote amounts alone are not cash. This spec explicitly separates:
- **Quote value** — commercial proposal amount, not settled funds.
- **Receipt** — manually logged receipt; not bank-verified or processor-confirmed.
- **Expense** — manually logged outflow.
- **Refund** — manually logged outflow linked to an eligible quote.
- **Accepted quote balance** — accepted quote total minus linked net receipts;
  acceptance is an internal status, not an enforceable invoice/CFDI.

## Data model and invariants
- Add quote_id, entry_type (receipt/expense/refund), method (transfer/cash/card/other),
  note and MXN-only currency on os_ledger.
- Existing kind ('income'/'expense') retained, mapped deterministically from entry_type.
- Composite FK prevents linking quote from another organization.
- Project references must match linked quote's project if a quote is present.
- Receipt allowed against sent/accepted quotes only.
- Refund allowed only if backed by net receipts, including rejected quotes with previous receipts.
- A quote-linked receipt cannot exceed quote remaining balance.
- Generic expenses cannot have a quote; generic receipts may be unlinked.
- Reference required (2-200 chars), happened_on cannot be in the future,
  all amounts are positive integers in centavos MXN.
- Every ledger row is append-only: no UPDATE/DELETE, even if the browser submits direct REST requests.
- Transaction-level advisory lock serializes changes affecting the same quote.
- UUID supplied by the application is reused on retries, and payload comparison prevents
  a changed retry from silently creating or altering another entry.
- All numbers in financial summaries are aggregated by PostgreSQL across the full
  authorized database; last-100 list is clearly separate from totals.
- Public RPCs use SECURITY INVOKER with original owner-only RLS and a fresh Auth-bound membership.

## User experience
- /finanzas is exclusive to Direction.
- Owner dashboard: manual receipts, expenses, refunds, net movement,
  accepted quote value and pending quote balances.
- Ledger of the 100 most recent movements with filters and quote/project link labels.
- Register movement form with stable idempotency UUID and clear banking disclaimers.
- Write switch \`OS08_FINANCE_WRITES_ENABLED\` explicitly set to FALSE on branch preview.
- Empty database shows genuine zeros/empty states, no historical amounts fabricated.

## Security and reliability tests
- SQL transaction ends with ROLLBACK: partial receipt, duplicate retry, UUID conflict,
  overpayment, over-refund, ledger immutability, direct insert guard and unbound denial.
- Summary verifies MXN 6,500 receipt, 2,000 refund, 2,500 expense:
  net recorded movement MXN 2,000 and accepted quote outstanding MXN 7,100.
- Sent, nonaccepted quote must not count as outstanding accounts receivable.
- Separate simulated sales and production roles denied access to reporting and writes.
- GitHub npm ci, TypeScript, lint, tests, build and audit. Vercel preview READY.
- Owner-authenticated browser E2E, real role sessions, document evidence and any processor
  reconciliation are NOT complete.

## Non-goals / requirements before release
- **No Stripe bank/processor integration**, no automatic payment confirmation.
- No CFDI, accounting general ledger, cash-account reconciliation, tax filing,
  foreign currency, subscription billing or accounts payable aging.
- No mutable ledger corrections; use a compensating audited movement after business review.
- Security advisor still warns if leaked-password protection is disabled.
- Repository is temporarily PUBLIC; do not put secrets, bank credentials or customer records into Git.
- Never enable writes, merge PRs or promote to production without owner E2E,
  role-negative tests, QA and financial workflow approval.
