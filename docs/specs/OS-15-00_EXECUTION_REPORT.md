# OS-15-00 — Motion laboratory execution evidence

Date: 2026-10-25. Base: `feature/os-14-hardening` at `c22a710c361a1f45a9565054b71194cebeb629ed`.
Scope: isolated synthetic visual pattern, not integration into the authenticated workspace.
Related research: issue #15. Target: protected Vercel preview only, `/laboratorio`.

## Delivered
- Four coherent views: dashboard, projects, sample quotation and design system.
- Liquid and Editorial finishes within the existing Spectral Ember palette.
- Animated exact-value counters, SVG chart reveal, bounded stagger, sliding period controls,
  project details and progress transitions. No infinite animation or forced scrolling.
- Explicit loading, empty, error and retry scenarios; all clearly simulated.
- Statement and Atelier quotations with validated local quantities and integer-cent totals.
  Browser print produces a static A4 sample. These are NOT commercial quotes or CFDI.
- System and manual reduced-motion settings, manual opaque surfaces, semantic dialogs,
  keyboard containment, Escape/close focus restoration, and static content without JS.
- Separate HTML/style/runtime/model modules. Native CSS/Web Animations; zero new npm dependencies.

## Verification actually executed
| Check | Result | Scope |
|---|---|---|
| Node tests | 9 PASS / 0 FAIL | Environment denial, exact script CSP, fixture/math validation, no business dependencies |
| Chromium behavior/visual checks | 28 PASS / 0 FAIL | Exact lab HTML, offline rendering with CSP; not Next/Auth E2E |
| Browser page/console errors | 0 observed | Executed scenarios only |
| Browser network requests | 0 observed | Isolated artifact, not platform toolbar or authenticated app |
| Responsive layout | PASS | All four views at 1440, 768, 390 and 320 CSS px, no page-level overflow |
| Modal keyboard and focus | PASS | Tab containment, Escape, focus restoration and viewport fit |
| Motion preferences | PASS | OS preference cannot be overridden; no animation after reduced-mode updates |
| Quote input boundaries | PASS | 1..20 integer, invalid input preserves last valid total and disables print button |
| Static print | PASS | Both Statement and Atelier, one A4 page each; visually rendered and inspected |
| No JavaScript | PASS | All essential static view content and baseline values remain present |

Exact rendered HTML SHA-256:
`23c257815f33b8a7d730fb584b305d54d83f664a47bfc3b0d473b755cbeab33a`.

Corrections made during this iteration: project-code search, focus containment,
mobile overflow, period helper consistency, bounded entry animation, and an orphan
print footer in Atelier. The final browser suite was rerun after those corrections.

## Reproduction
Run the existing repository install with its committed lockfile; no package update is required.

```sh
node --experimental-strip-types --test tests/os15-lab.test.mjs
node scripts/os15-preview.mjs
# In a separate terminal with Python playwright==1.57.0 and Chromium installed:
python tests/browser/os15_visual_qa.py
```

The local renderer transpiles only the lab modules using the repository TypeScript dependency.
The browser test reads the exact local response and renders via `set_content` because this
execution environment prohibits browser network navigation. It preserves script/style/connect
CSP directives; `frame-ancestors` is tested in response tests because a meta CSP cannot enforce it.
This is deliberately documented, not presented as browser navigation through Next or Vercel.

## Security and release boundaries
- `/laboratorio` returns 404 for production or unknown environments. Only explicit Vercel
  preview or local development is allowed. No public static bypass file is added to the repo.
- The HTML contains fixed fictitious records only, never reads a session or business database,
  and cannot connect to services (`connect-src 'none'`, `form-action 'none'`). Script is hash-bound.
- No Supabase schema/data changes, no keys, no write flags, no agent permissions, no production
  quote/PDF renderer changes, no customer communications, and no paid assets.
- Existing Vercel SSO must stay enabled; the lab is a design artifact, not an authenticated
  business module. Existing signed-in E2E/recovery/staging blockers are unchanged.
- No modification of main, production aliases, ZONERA, 5TAR HOST or other products.

## Checks not claimed by this report
- Full repository lint/types/tests/build/npm audit and exact-SHA Vercel result must be read
  from the associated PR checks after publication. Local subset results do not replace CI.
- Actual Safari/iOS and Firefox behavior: NOT RUN.
- Live authenticated owner/agent E2E and operational writes: NOT RUN, outside this slice.
- Field Core Web Vitals p75, independent accessibility certification and real-device GPU
  performance: NOT MEASURED. No production performance claim follows from this lab.
- Owner design acceptance and integration into reusable React/Motion components: IN_REVIEW.

## Rollback / next gate
Abandon or revert this additive branch; there is no data migration to reverse.
Next gate is visual selection, then a separate spec ports accepted interactions into small
React client components while preserving server-side authorization and operational data.
