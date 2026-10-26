# OS-15-01 — Liquid Precision / Execution report

**Review state:** IN_REVIEW · authenticated workspace preview, not production release
**Date:** 25 October 2026 (America/Monterrey)
**Branch:** `feature/os-15-workspace-liquid`
**PR:** https://github.com/ags10101616/andrai-os/pull/17
**Research and visual predecessor:** issue #15, OS-15-00 lab and PR #16
**Applicable ANDRAI Playbook:** v1.0.0, Advanced profile.

## G0/G1 — Preserved boundaries
The user approved the visual laboratory and requested integration with ANDRAI OS.
Real backend screens remain Next.js Server Components/RLS protected. This change
does not import synthetic lab data, modify JWT sessions, SQL schemas, organization
membership, role gates, business actions, OS10 global read-only, OS05/06/07/08
write flags, OS13 proposal flags, or permissions for José Luis.

## G2 — Delivered on actual workspace
- Additive `liquid-precision.css`: Spectral Ember surfaces, restrained glass
  toolbar/header, raised panels/cards, darker highlighted KPIs, table row
  entrances, native progress reveals and careful mobile fallbacks.
- `AppShell` with bounded WAAPI entrance, replay and accessible reduced-motion
  and solid-surface preferences. No third-party animation dependencies.
- Real executive KPI counts and manual-finance figures animate their glyphs to
  the **exact server-rendered authorized value**, with a separate screen-reader
  truth. Zero stays zero; no fake charts or rows on empty reports.
- CRM, Projects, Tasks, Finances and Quotes gain consistent panels/filters/table
  behavior without changing records, forms or business logic.
- Quote detail switches Statement/Atelier only at presentation level.
- Auth-protected PDF endpoint now accepts an optional strict Atelier appearance:
  the default `/pdf` is Statement; `/pdf?style=atelier` uses the same quote,
  totals, cents, IVA, status, audit/approval state and pagination.
  The selected style controls its own download link.
- Long synthetic quote fixtures, both template PDFs and rollback-by-revert.
  No database migrations.

## G3 — Evidence on code commit a0f379224acd8c270258a739aac91cd0fb788227
| Verification | Status | Evidence |
| --- | --- | --- |
| Pinned dependency install, lint, TypeScript, all Node tests, Next build, npm audit high | PASS | GitHub workflow runs 40270198410 and 40270201981, both SUCCESS |
| Protected preview build | PASS | Vercel deployment dpl_7eeDrkYeH5PtgH8NntMveXE7bFM6, READY, exact SHA a0f379224acd |
| HTTP liveness | PASS | `/api/health` HTTP 200 with revision a0f379224acd |
| Signed-out route protection | PASS | `/login` HTTP 200; requesting `/resumen` without an app session returns login content (connector follows same-origin redirects). This is **not** signed-in E2E |
| Branch environment | PASS | OS10_PILOT_READ_ONLY=true; OS05/06/07/08/13 write/review flags false; publishable Supabase key only |
| DB no synthetic records | PASS | 0 clients, 0 quotes, 0 ledger entries, 0 proposals; one active `brief_read` agent; database proposal intake/review OFF |
| Synthetic PDF route renderer unit | PASS | Default Statement and new Atelier, valid A4, multi-page quote pagination, no PDF parse errors |
| PDF visual render comparison | PASS for inspected fixture | GitHub workflow artifact `os07-quote-pdf-qa` from run 40270198410: both 2-page A4 PDFs rendered to PNG (130 dpi); overlap of IVA and grand-total panel found and fixed, then re-rendered; captions, totals and disclaimers visually legible |
| Monetary contract check on fixture | PASS | Both outputs text-extract Subtotal MXN 26,000.00, IVA 16% MXN 4,160.00, Total MXN 30,160.00 |
| Browser keyboard/motion in real authenticated workspace | NOT RUN | Requires signed-in owner/sales/production sessions |
| Actual iOS Safari/Firefox cross-browser QA | NOT RUN | No remote authenticated device session |
| Core Web Vitals p75 / actual performance | NOT MEASURED | No field data |
| Full Auth recovery/revocation and backup/restore | BLOCKED / NOT RUN | Open OS14 operational gates |

## Safety and production decision
**DO NOT PROMOTE** solely because preview is ready. Existing 99+ stacked
development commits are not merged to main. Repository remains public under
prior owner decision; no sensitive client details or credentials are committed.
All artificial sample quotes stay in test scope/artifacts and do not populate
Supabase. PDFs never issue CFDI or send external communications.

## Next verified action
Use real, authorized owner account in protected preview to inspect
`/resumen`, `/prospectos`, `/proyectos`, `/tareas`, `/finanzas`
and `/cotizaciones`, at 390/768/1440px, reduced motion and keyboard.
Test Statement/Atelier on an already authorized real quote when present.
Validate restricted sales/production/agent routes and backup/recovery prior
to any main branch integration or production domain promotion.

## Rollback
Revert this feature branch/PR and return to OS-15-00/OS14 UI. No new schema,
external effects or data changes to reverse. The default PDF endpoint remains
compatible; optional appearance is additive.
