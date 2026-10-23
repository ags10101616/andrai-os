import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('OS-02 environment is not configured.');
  }
  return { url, publishableKey };
}

/** Per-request cookie-backed Supabase client; NEVER uses service_role. */
export async function createServerSupabase() {
  const store = await cookies();
  const { url, publishableKey } = publicSupabaseConfig();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items) {
        try {
          for (const { name, value, options } of items) {
            store.set(name, value, options);
          }
        } catch {
          // A Server Component may read, but cannot set, cookies.
          // src/proxy.ts handles token refresh before rendering.
        }
      },
    },
  });
}
