# OS-11 — Transactional Events: Implementation & Verification

**Date:** 24 Oct 2026.
**Branch:** feature/os-11, parent feature/os-10.
**Review:** https://github.com/ags10101616/andrai-os/pull/11
**Protected preview:** https://andrai-os-git-feature-os-11-ags10101616s-projects.vercel.app/eventos

## Delivered

- Added \`public.os_event_outbox\` in the dedicated ANDRAI OS Supabase project.
  Source: \`docs/sql/OS-11_EVENT_OUTBOX.sql\`,
  migration: \`andrai_os_os11_held_event_outbox_v1\`.
- Outbox created transactionally by private audit trigger (one event per audit).
- Sanitized metadata only: category, entity type, action, timestamp.
  No names, contact information, amounts, bank references or message bodies.
- RLS read access limited to Direction; no client INSERT/UPDATE/DELETE grants.
- All dispatch states **HELD**. Database check disallows "sent" or "delivered".
  No mail, SMS, WhatsApp, webhook or José Luis execution path exists.
- Read-only 7/30/90-day summary and up-to-50-event feed SQL RPCs.
- Owner-only \`/eventos\` page, safely typed server data layer, category chart,
  accessible event timeline and dashboard link.
- OS-10 double write safety gates remain enabled; preview has global
  \`OS10_PILOT_READ_ONLY=true\` and OS05–OS08 write flags false.

## Verification (performed)
- Migration DDL preflight inside SQL BEGIN/ROLLBACK passed.
- Database audit/outbox reversible test:
  synthetic client, opportunity, project, task, quote review, manual expense;
  audit count matched outbox count, category mapping correct,
  one-to-one idempotency and zero dispatch, 7/30/90-day report counts valid.
  Sales, Production and unbound identity denied event reports.
  Both invalid period and excessive event feed limit rejected.
  All changes rolled back.
- Cross-tenant reversible test: foreign synthetic tenant created a captured
  audit event. Bound owner of Andrai could not read foreign event or count it.
  Transaction rolled back.
- Node source-contract and parser tests, lint, TypeScript, Next build and
  dependency audit tested by GitHub Actions.
- Vercel build READY; signed-out \`/eventos\` redirects to login,
  including selected time windows, and public health reports OS-11 liveness.
- After QA, real event outbox has zero entries; no synthetic business records were persisted.

## Owner access confirmation
The user directly confirmed successful **login and logout** in OS-10,
recorded in PR #10. A real signed-in walkthrough of OS-11 event page remains
unverified. This does NOT imply full browser E2E of every role.

## Remaining gates and restrictions
- GitHub repo remains PUBLIC per prior owner decision; never store
  customer information, credentials or private event payloads.
- Supabase continues to warn that compromised-password protection is disabled.
- Independent Sales/Production real account denial E2E and staging backup
  restoration are not verified.
- No notification recipients, delivery retry, mobile push, automation,
  agent permissions or external messages are implemented.
- No merge to main, no customer write enablement and no production release.

**Verdict:** OS-11 core completed in a protected read-only preview.
Human review and operational/security release gates are still pending.
