import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isWorkspacePath, shouldRefreshAuthPath } from '@/lib/auth/roles';

/**
 * Refresh cookies on workspace AND session-aware entry/recovery pages.
 * Entry pages are public: a missing session must reach their normal login flow.
 * Authorization is still enforced server-side and by Supabase RLS.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!shouldRefreshAuthPath(pathname)) return NextResponse.next();
  const protectedWorkspace = isWorkspacePath(pathname);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new NextResponse('Workspace temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }

  let response = NextResponse.next({ request });
  const db = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        // Propagate refreshed session to this request's Server Components.
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // And persist the refreshed cookies in the browser.
        items.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Signature verification is a UX gate, not an authorization or membership check.
  const { data, error } = await db.auth.getClaims();
  if (protectedWorkspace && (error || !data?.claims)) {
    const redirected = NextResponse.redirect(new URL('/login', request.url));
    // Preserve any session-clearing cookies generated during the check.
    response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
    redirected.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return redirected;
  }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:png|jpg|jpeg|webp|svg|woff2?)).*)'],
};
