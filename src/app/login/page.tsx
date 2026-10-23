import type { Metadata } from 'next';
import { signInWithPassword } from '@/lib/auth/actions';

export const metadata: Metadata = { title: 'Acceso privado' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <main className="auth-page">
    <section className="auth-brand">
      <div className="auth-wordmark">ANDRAI<span>.</span></div>
      <div>
        <p className="auth-eyebrow">ESTUDIO DE SISTEMAS DIGITALES</p>
        <h1>La operación,<br/>en un solo lugar<span>.</span></h1>
        <p>Un espacio privado para la dirección, los proyectos y las decisiones de Andrai.</p>
      </div>
      <small>ANDRAI OS · SPECTRAL EMBER</small>
    </section>
    <section className="auth-form-side">
      <div className="auth-form-wrap">
        <div className="auth-overline">ACCESO A WORKSPACE / OS-02</div>
        <h2>Bienvenido de nuevo.</h2>
        <p>Ingrese con la cuenta autorizada para ANDRAI OS. No hay registro público.</p>
        {error === 'invalid' && <div role="alert" className="auth-error">No pudimos iniciar sesión. Revise sus datos e inténtelo otra vez.</div>}
        <form action={signInWithPassword} className="auth-form">
          <label htmlFor="login-email">Correo electrónico</label>
          <input id="login-email" type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} required placeholder="correo@empresa.com" />
          <label htmlFor="login-password">Contraseña</label>
          <input id="login-password" type="password" name="password" autoComplete="current-password" minLength={8} maxLength={1024} required />
          <button type="submit" className="auth-submit">Entrar a ANDRAI OS <span aria-hidden="true">↗</span></button>
        </form>
        <div className="auth-notice">¿No tiene acceso o necesita recuperar su contraseña? Solicite ayuda a Dirección. Las invitaciones se gestionan de forma privada.</div>
        <div className="auth-footnote">Acceso restringido · Sesiones verificadas en Supabase · Sin acceso autónomo de agentes</div>
      </div>
    </section>
  </main>;
}
