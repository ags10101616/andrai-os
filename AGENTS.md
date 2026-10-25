# ANDRAI OS / Agent engineering rules

1. Work only in the `andrai-os` repository. It is **currently public**, so never commit internal customer data or secrets.
2. Development previews are NOT a production CRM; do not claim commercial writes, auth E2E or agent integrations are live without direct evidence.
3. Never add service_role/secret keys to Git or client code. No hardcoded customer records, prices or fabricated metrics.
4. Do not modify `andrai.com.mx`, ZONERA, 5TAR HOST or the separate `andrai-crm` product.
5. Do not merge to main or promote to production without reproducible CI, branch-specific preview, security/role validation and explicit owner sign-off.
6. Record statuses accurately: PASS only for actual checks; PENDING/BLOCKED/NOT RUN otherwise.
7. Enforce owner-bound membership and strict agent separation. No self-signup, arbitrary team mutations, commercial write flags or autonomous execution.
8. Preserve Spectral Ember brand: obsidian, warm ivory, graphite, coral, Manrope-like typography.
9. Keep the global OS10 pilot read-only switch and per-feature write gates disabled until authenticated browser E2E and release approval.
