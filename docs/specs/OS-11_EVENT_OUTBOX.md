# OS-11 — Internal Event Outbox and Notification Foundation

**Project:** private ANDRAI OS workspace. Branch: \`feature/os-11\`.
**Scope:** event capture and read-only owner inbox only.
**Explicitly NOT in scope:** automated email, WhatsApp, webhooks, Slack,
background agents, deliveries, user subscriptions or action execution.

## Contract
The existing \`os_private.log_change\` trigger writes a metadata-only
\`os_audit_events\` row for every changed domain record. OS-11 installs an
\`AFTER INSERT\` trigger on that audit table that atomically writes
exactly one \`os_event_outbox\` row identified by the audit event ID.

All event values are derived from trusted audit metadata:
- organization_id (RLS-scoped tenant)
- audit_event_id (unique replay guard)
- event_class: sales, operations, commerce, finance
- entity_type, entity_id, action and timestamp
- dispatch_state **held**; the database CHECK disallows other states

**No message body, customer name, email, price, bank reference or recipient
is copied.** The audited domain data remain in their original RLS tables.

## Security
- Table \`public.os_event_outbox\` enables RLS and grants SELECT to
  \`authenticated\` only; owner-only policy must pass \`os_private.member_role\`.
- Client SQL grants no INSERT/UPDATE/DELETE. An immutability trigger prevents
  record changes even if a future permission accidentally opens.
- Private trigger function uses SECURITY DEFINER only to atomically capture
  an already-audited event. It is not an exposed callable public RPC.
- \`public.os11_event_summary_v1\` and \`os11_event_feed_v1\` are
  SECURITY INVOKER, EXECUTE restricted to authenticated, with fresh verified
  owner membership; no tenant/role inputs from user.
- 7/30/90-day windows based on America/Monterrey calendar time.
- Events are viewed on \`/eventos\`, restricted to owner by Next server and RLS;
  list is bounded to 50, aggregate totals cover all rows in the period.
- No José Luis identity, background runner or sending permissions granted.

## Reliability
- Source audit event and outbox event share one DB transaction.
- Failed source transaction rolls back both audit and event; no orphan event.
- \`audit_event_id\` UNIQUE plus INSERT ON CONFLICT DO NOTHING prevents
  repeated capture of the same source audit event.
- No attempt to deliver, retry externally or claim success without an external
  provider. "Retenido" accurately describes the held queue.
- Future OS-12/13 must introduce explicit review approvals, destinations,
  delivery attempt metadata, rate limits, idempotency and provider retry policy
  in additional reviewed migrations. OS-11 itself has no dispatch worker.

## Test plan
1. Reversible integration SQL creates synthetic CRM, project, task, quote and
   expense in one transaction, then verifies audit/outbox counts and category mapping.
2. Validate 7, 30, 90-day reports, an invalid period and invalid limit.
3. Simulated Sales/Production identity has zero owner-only event rows and receives
   insufficient_privilege from both public RPCs.
4. Unbound identity denied.
5. Anon cannot EXECUTE public read RPC or modify the outbox.
6. End fixture with ROLLBACK, verify zero commercial and outbox rows persisted.
7. GitHub CI lint, types, tests, Next production build and npm audit.
8. Vercel preview with SSO protection; signed-out route cannot display inbox.
9. User-authenticated browser E2E and owner visual review pending.

## Operational readiness
OS-10 owner login/logout is now user-confirmed PASS; this does not prove other
accounts or permissions. The repo is temporarily PUBLIC by owner deferral.
All commercial write gates continue OFF and this event inbox never sends notifications.
