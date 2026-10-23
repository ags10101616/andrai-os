import Link from 'next/link';
import type { ReactNode } from 'react';
import { modules } from '@/lib/modules';

export function AppShell({active,children}: {active:string;children:ReactNode}) {
  return <div className="app-layout">
    <aside className="side">
      <Link className="logo" href="/resumen" aria-label="Andrai OS, resumen">ANDRAI<span>.</span><small>OS / WORKSPACE</small></Link>
      <nav className="nav" aria-label="Módulos">
        <div className="nav-label">ESPACIO DE TRABAJO</div>
        {modules.slice(0,6).map(m=><Link key={m.slug} href={'/'+m.slug} className={'nav-item'+(active===m.slug?' selected':'')} aria-current={active===m.slug?'page':undefined}><span className="nav-icon">{m.icon}</span>{m.label}</Link>)}
        <div className="nav-label nav-label-later">INTELIGENCIA OPERATIVA</div>
        {modules.slice(6).map(m=><Link key={m.slug} href={'/'+m.slug} className={'nav-item'+(active===m.slug?' selected':'')} aria-current={active===m.slug?'page':undefined}><span className="nav-icon">{m.icon}</span>{m.label}</Link>)}
      </nav>
      <div className="side-bottom"><div className="agent-mini"><div><span className="coral-star">✳</span><strong>José Luis</strong><span className="inactive-circle"/></div><p>Integración pendiente. Sin acceso a clientes ni acciones.</p></div><div className="profile"><div className="profile-avatar">A</div><div><strong>ANDRAI</strong><small>Vista estructural OS-01</small></div></div></div>
    </aside>
    <div className="main-area">
      <header className="header"><span>ANDRAI <i>/</i> OS-01</span><div><span className="env-pill"><b/> PREVIEW · SIN DATOS</span><span className="edition">Spectral Ember / V1</span></div></header>
      <main className="main-content">{children}</main>
      <footer className="footer"><span>ANDRAI OS · OPERACIÓN PRIVADA</span><span>Sin integración de datos · OS-01</span></footer>
    </div>
  </div>;
}
