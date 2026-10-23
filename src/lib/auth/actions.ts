'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from './server';

export async function signInWithPassword(form: FormData) {
  const emailValue = form.get('email');
  const passwordValue = form.get('password');
  const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : '';
  const password = typeof passwordValue === 'string' ? passwordValue : '';

  if (
    email.length < 5 || email.length > 254 || !email.includes('@') ||
    password.length < 8 || password.length > 1024
  ) {
    redirect('/login?error=invalid');
  }

  const db = await createServerSupabase();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email_confirmed_at) {
    redirect('/login?error=invalid');
  }
  // Membership and route rights are checked afresh on the server by the destination page.
  redirect('/resumen');
}

export async function signOut() {
  const db = await createServerSupabase();
  await db.auth.signOut();
  redirect('/login');
}
