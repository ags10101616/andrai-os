# OS-05 · CRM foundation, read view and gated intake

**Status:** Phase 1 code preview, not yet an accepted live CRM.
**Dependencies:** OS-02 authenticated owner check pending; OS-03 transactional lead RPC passed SQL rollback tests.

## Functional slice
- Protected \`/prospectos\` page for owner and sales roles only.
- Reads real \`os_opportunities\` and related \`os_clients\` using the user's Supabase cookie-backed session, subject to RLS.
- Stage filter (allowlisted) with latest 60 rows; no invented data or fake counts.
- Initial intake form maps a client and a commercial opportunity, preserving stable client and opportunity UUIDs in sessionStorage across retries.
- UI shows actions clearly disabled until the pilot flag is enabled.
- **Write flag default is OFF**: \`OS05_CRM_WRITES_ENABLED\` must equal \`true\` on the server to call the OS-03 RPC.
- Currency input parsed as minor MXN units from a decimal string (no floats).
- Structured server errors prevent leaking SQL details.

## Security
- Never expose service_role or secrets in the browser.
- Both the route and data adapter call \`requireMembership('prospectos')\`; RLS enforces data access.
- Data writes happen only in OS-03 atomic RPC, never separate client-side inserts.
- Client UUIDs are only operation IDs; sessionStorage contains no PII.
- No public registration, emails, external messaging or AI-powered writes.
- No production merge, sign-in E2E or customer migration yet.

## Remaining for completion
- Owner login E2E; independent Sales role E2E.
- UI interaction test of form errors, retry, zero duplicate inserts.
- Rate limiting / abuse controls and explicit release toggles.
- Pagination for more than 60 records; search and historical notes.
- Phone/email normalization & deduplication under agency rules, and partner linking.
- Real projects, quotes and payments belong to later specs.
