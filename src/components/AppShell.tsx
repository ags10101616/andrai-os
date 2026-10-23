import Link from 'next/link';
import type { ReactNode } from 'react';
import { modules } from '@/lib/modules';
import { signOut } from '@/lib/auth/actions';
import { canVisit, roleLabels, type TeamRole } from '@/lib/auth/roles';

export function AppShell({
  active, children, role, displayName,
}: {
  active: string;
  children: ReactNode;
  role: TeamRole;
  displayName: string;
}) {
  const visible = modules.filter(m => canVisit(role, m.slug));
  return <div className="app-layout">
    <aside className="side">
      <Link className="logo" href="/resumen" aria-label="Andrai OS, resumen">ANDRAI<span>.</span><small>OS / WORKSPACE</small></Link>
      <nav className="nav" aria-label="Módulos">
        <div className="nav-label">ESPACIO DE TRABAJO</div>
        {visible.filter(m => m.slug !== 'jose-luis').map(m =>
          <Link key={m.slug} href={'/' + m.slug} className={'nav-item' + (active === m.slug ? ' selected' : '')} aria-current={active === m.slug ? 'page' : undefined}><span className="nav-icon">{m.icon}</span>{m.label}</Link>
        )}
        {role === 'owner' && <>
          <div className="nav-label nav-label-later">DIRECCIÓN</div>
          <Link href="/equipo" className={'nav-item' + (active === 'equipo' ? ' selected' : '')}><span className="nav-icon">♙</span>Equipo y permisos</Link>
          <Link href="/jose-luis" className={'nav-item' + (active === 'jose-luis' ? ' selected' : '')}><span className="nav-icon">✳</span>José Luis</Link>
        </>}
      </nav>
      <div className="side-bottom">
        <div className="agent-mini"><div><span className="coral-star">✳</span><strong>José Luis</strong><span className="inactive-circle" /></div><p>Integración pendiente. Sin credenciales ni capacidad de ejecución.</p></div>
        <div className="profile"><div className="profile-avatar">{displayName.slice(0,1).toUpperCase()}</div><div><strong>{displayName}</strong><small>{roleLabels[role]}</small></div></div>
        <form action={signOut}><button className="side-signout" type="submit">Cerrar sesión →</button></form>
      </div>
    </aside>
    <div className="main-area">
      <header className="header"><span>ANDRAI <i>/</i> OS-02</span><div><span className="env-pill"><b/> ACCESO PRIVADO</span><span className="edition">{roleLabels[role]} · Spectral Ember</span></div></header>
      <main className="main-content">{children}</main>
      <footer className="footer"><span>ANDRAI OS · OPERACIÓN PRIVADA</span><span>Identidad y rol verificados · Datos operativos pendientes</span></footer>
    </div>
  </div>;
}
