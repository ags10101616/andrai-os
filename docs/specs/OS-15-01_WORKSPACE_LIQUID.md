# OS-15-01 / Liquid Precision — authenticated workspace
**Stage:** IN_REVIEW / Advanced · **Base:** OS-15-00 lab SHA 81099608e14ba5e5316f25d61d58a03764e5808a
**Method:** ANDRAI Design & Engineering Playbook v1.0.0 (context → spec → pattern → build → QA → controlled preview).
**Direction:** user approved the OS-15 demo and requested its official UI integration and additional motion.

## G0 / boundaries
The authenticated Next.js workspace, Supabase RLS, user roles, OS10 global read-only and feature write flags remain authoritative and unchanged. No test business data in production or preview. Stack/lockfile preserved.
This branch is stacked on OS-15-00 (and OS14); main is not treated as integrated/ready by assumption.

## G1 / changes & acceptance
| ID | Requirement | Evidence |
|---|---|---|
| VIS-01 | Spectral Ember (obsidian/ivory/coral) with glass only for controls and solid data panels | Screenshot review desktop/mobile |
| MOT-01 | Entering modules reveals panels, limited staggers, hover, progress bars and optional replay | Browser UI, reduced motion |
| MOT-02 | Counters animate only real server-provided counts / cents and retain exact SSR + assistive text | Node test, authenticated E2E |
| DATA-01 | Missing real data stays empty; no demo rows and no client-side business queries | Code audit, real role session |
| SEC-01 | No access, DB, RBAC, write gate, billing or external side-effect changes | Diff audit, existing tests |
| DOC-01 | Statement/Atelier on-screen treatments cannot alter real quote history, total, auth or existing PDF | Node tests and browser check |
| A11Y-01 | OS/manual reduced motion/transparency, focus, tab interaction; no motion required for information | Keyboard + mobile |
| REL-01 | Exact-SHA lint, typecheck, unit tests, build, dependency audit and Vercel protected preview | CI / Vercel |
| REL-02 | Real signed-in owner/sales/production and agent E2E still gate production | Independent QA |

## Implementation choices
Keep app routes as RSC. Add small client islands AnimatedValue, WorkspaceMotion and WorkspacePreferences, and a presentation-only wrapper to server-rendered quote details. Keep synthetic laboratory isolated.
No new npm dependencies. Source-accurate currency is passed as SSR display text, while animated glyphs are aria-hidden. Platform reduced-motion preferences override manual settings; user setting is browser-local.
Visual changes are CSS overrides in a dedicated stylesheet to keep rollback safe.

## Release scope
Preview branch only until real signed-in E2E, backup/recovery and remaining OS14 gates. Do not merge stack to main, promote production or activate writes based solely on a passing build. Revert the additive branch to restore earlier UI; no schema rollback required.
