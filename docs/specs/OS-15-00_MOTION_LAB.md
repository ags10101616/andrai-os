# OS-15-00 — Liquid Precision / motion laboratory

Status: IN_REVIEW (visual lab; not production accepted). Base: feature/os-14-hardening @ c22a710c361a1f45a9565054b71194cebeb629ed.
Authorized scope: user requested autonomous implementation of the isolated visual laboratory described in issue #15, following ANDRAI Design & Engineering Playbook v1.0.0. No production release.

## G0 / decisions preserved
Spectral Ember: obsidian, graphite, ivory, coral; Manrope-like system typography.
Existing modules, Auth, roles, Supabase, all write flags and quote/PDF production code are unchanged.
New route /laboratorio contains ONLY deterministic synthetic scenarios, visibly marked DEMO. It never reads business records. Vercel SSO remains required at deployment level. The route returns 404 in production or when deployment environment is unknown; local development is permitted. This is intentionally a separate design artifact, not a replacement of the React workspace or proof of signed-in business flows.

## G1 / vertical slice and acceptance
| ID | Observable requirement | Verification |
|---|---|---|
| VIS-01 | Same content in Liquid and Editorial finishes, without replacing brand colors | Screenshots 1440, 768, 390, 320 CSS px |
| MOT-01 | KPIs animate to exact synthetic values; range changes update chart and totals | Browser range switches and final values |
| MOT-02 | Entrance stagger and chart reveal; no perpetual decoration or delayed interaction | Browser inspection + code review |
| UX-01 | Dashboard, projects, quotation and design-system navigation with direct hash/Back support | Browser and no-JavaScript checks |
| UX-02 | Project drawer: native modal, keyboard containment, Escape and focus restoration | Browser keyboard tests |
| UX-03 | Loading/empty/error/ready are explicit test scenarios, not fake network activity | Browser each state, retry |
| DOC-01 | Two editorial quote formats; local sample totals in integer cents; print-only document | Arithmetic boundary tests + print render |
| A11Y-01 | OS reduced motion honored; manual reduce motion/transparency controls; focus visible | Emulated preference + keyboard + screenshots |
| SEC-01 | No business requests, writes, auth keys, service calls or agents | Code guard + browser network log |
| SEC-02 | Production/unknown environments return 404, no public static bypass | Node response tests |
| PERF-01 | Zero new npm dependencies, external assets and analytics | Diff + browser network log |
| QA-01 | Existing CI and build stay green on final SHA | GitHub checks / Vercel build |

## Design recipe
Light workspace with quiet solid surfaces, dark navigation and a restrained coral accent. Liquid material is limited to toolbar/navigation and one ambient surface. Editorial removes transparency and softens shadows while preserving layout. Four moments: animated data, chart reveal, row stagger and project sheet. Buttons remain usable during animation. Timings: micro 160 ms, panel 240 ms, data 640 ms, stagger 35 ms capped at 280 ms. These are design choices, not performance claims.

## Technical decision / bounded change
For G2 visual exploration, native CSS + Web Animations API avoids installing several libraries before a design is accepted. It implements this narrow lab without changing the runtime dependencies. HTML, styles and behavior are separate source modules served by a Next Route Handler. The exact document is also runnable offline. Later integration into React client islands/Motion is a distinct spec, contingent on design selection; this lab does not claim production component integration.

CSP hashes allow only the lab's fixed script. connect-src 'none'; no external fonts/assets. Dynamic style attributes are limited to trusted fixture chart/progress geometry. Native dialog provides focus containment. No dynamic HTML generated from user input. Quote quantity is validated as a safe integer in [1, 20]. Money is integer cents, rounded once for synthetic 16% tax. No quotes are saved, sent, approved or issued as CFDI.

## Gate / rollback
G2: implementation/design self-review under delegated direction; user acceptance remains IN_REVIEW, not silently ACCEPTED. G3 covers ONLY lab behaviors and environment guards. Existing real-user Auth E2E and release blockers are unaffected.
Rollback: abandon/revert this additive branch, remove /laboratorio and lab modules. No schema, secrets, data, permissions, costs, production aliases or purchased code changed.

## Sources (checked 25 Oct 2026)
- User Library ANDRAI_Playbook_v1.0.0.md sections 03–12 (not copied into this public repo).
- Existing GitHub issue #15 (inspiration only; no paid template code copied).
- https://nextjs.org/docs/app/api-reference/file-conventions/route
- https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
