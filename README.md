# ANDRAI OS — OS-02 Authenticated Workspace Preview

Private workspace foundation: seven modules behind Supabase Auth, verified server-side membership and role permissions, Spectral Ember design, no commercial data and a read-only health endpoint.

**This is an OS-02 private-auth preview, NOT a live CRM.** Supabase Auth and staff membership are connected; customers, projects, invoices and autonomous AI are NOT. The GitHub repository remains public temporarily; do not commit secrets or real customer data.

## Stack
Next.js 16 App Router, React 19, TypeScript 6, Supabase SSR and auth/RLS, Tailwind 4 / CSS, Node 22.

## Start
```bash
npm ci
# configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Dependencies are pinned by the committed `package-lock.json` generated from a green CI run. Use `npm ci` for reproducible installation; pull requests must pass lint, TypeScript, tests, build and npm audit.

## Security & product boundaries
- Production/customer data unavailable by design.
- Every page includes noindex robots headers.
- Preview deployment should remain protected by Vercel Authentication.
- OS-02 covers authentication and real Supabase staff/roles. OS-03 covers transactional data integrity. Supabase email/password recovery, admin invites, leaked-password protection and independent signed-in role E2E remain release gates.
- This is separate from the marketing website and commercial Andrai CRM.
