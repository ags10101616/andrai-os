import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isWorkspacePath } from '@/lib/auth/roles';

/**
 * Refresh cookies for authenticated workspace pages. This is a UX gate only:
 * secure authorization is rechecked in the server-side data access layer
 * and then enforced again by Supabase RLS.
 */
export async function proxy(request: NextRequest) {
  if (!isWorkspacePath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new NextResponse('Workspace temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  let response = NextResponse.next({ request });
  const db = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  // getClaims is not a substitute for an authoritative membership DB check.
  const { data, error } = await db.auth.getClaims();
  if (error || !data?.claims) {
    const destination = new URL('/login', request.url);
    return NextResponse.redirect(destination);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:png|jpg|jpeg|webp|svg|woff2?)).*)'],
};
