import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';

export const metadata: Metadata = { title: 'Acceso restringido' };
export default function RestrictedPage() {
  return <main className="restricted-page">
    <div className="restricted-card">
      <span className="restricted-logo">ANDRAI<span>.</span></span>
      <div className="eyebrow">PERMISOS / OS-02</div>
      <h1>Acceso restringido.</h1>
      <p>Su cuenta no tiene una membresía activa para esta sección. La autorización se determina en el servidor y en la base de datos.</p>
      <form action={signOut}><button className="auth-submit" type="submit">Cerrar sesión</button></form>
      <Link href="/diagnostico-acceso" className="auth-back">Comprobar sesión y permisos →</Link>
      <Link href="/resumen" className="auth-back">Volver al resumen →</Link>
    </div>
  </main>;
}
