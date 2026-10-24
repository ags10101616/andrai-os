# OS-04 · Spectral Ember Component System

**Status:** design-system foundation staged in feature/os-04. The branch inherits OS-03; no live data or agent actions.

## Goals
One coherent set of palettes, typography and reusable UI building blocks across CRM, projects, quotes, finance and José Luis.

## Visual contract
- Brand: Andrai, Quiet Power / Spectral Ember.
- Main shell: obsidian (#0C0E0D); content backgrounds: warm ivory (#F3F0E8).
- Accent: ember (#FF6036) only for emphases. Small action text uses darker #A94020 for contrast.
- Manrope variable font using Next's optimized self-hosting.
- Icons/text remain semantic and never encode status only by color.
- Real empty states with explanations rather than fabricated metrics.
- Side navigation preserves server-verified authorization from OS-02.
- Keyboard skip-link, visible focus and reduced-motion support.
- Mobile navigation horizontally scrolls without the desktop being simply scaled down.

## Delivered
- \`src/styles/tokens.css\`, \`src/lib/brand/tokens.ts\` palette source.
- \`src/components/ui\` lightweight typed Surface, Metric, EmptyState, StatusTag.
- Dashboard refactored to shared primitives, no change in data access behavior.
- Main AppShell a11y enhancements.
- Preview branch protected by Vercel Authentication.
- Static contract tests. Separate visual/browser/aXe verification remains a gate.

## Do not mistake for completion
Actual authenticated-browser review is pending the owner's OS-02 login test. No new live CRM, quote or finance records should be added while the repo remains public and human verification is outstanding.

## Gate
GitHub CI green + Vercel build READY + browser keyboard/focus, mobile & color-contrast inspections, owner visual approval. Keep draft PR until approved.
