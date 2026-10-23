# ANDRAI OS — OS-01 Next.js Preview

Private workspace foundation: seven navigable modules, Spectral Ember design, empty-state copy and a read-only health endpoint.

**This is an OS-01 visual/technical preview, NOT a live agency system.** No Supabase credentials, accounts, CRM customers, invoices, real analytics or autonomous AI are connected here.

## Stack
Next.js 16 App Router, React 19, TypeScript 6, Tailwind 4 / CSS, Node 22.

## Start
```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Until a reviewed package lock exists, package resolution is not reproducible. Generate and commit `package-lock.json` after validating dependency resolution on a trusted machine or CI.

## Security & product boundaries
- Production/customer data unavailable by design.
- Every page includes noindex robots headers.
- Preview deployment should remain protected by Vercel Authentication.
- OS-02 covers authentication and real Supabase/roles. OS-03 covers transactional data integrity.
- This is separate from the marketing website and commercial Andrai CRM.
