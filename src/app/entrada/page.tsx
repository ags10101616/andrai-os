import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { resolveWorkspaceLanding } from '@/lib/auth/entry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: 'Entrar a ANDRAI OS',
  robots: { index: false, follow: false, nocache: true },
};

/** Safe one-tap bookmark for an existing, valid staff or agent session. */
export default async function EntryPage() {
  const landing = await resolveWorkspaceLanding();
  if (landing === 'resumen') redirect('/resumen');
  if (landing === 'agente') redirect('/agente');
  if (landing === 'restricted') redirect('/acceso-restringido');
  redirect('/login');
}
