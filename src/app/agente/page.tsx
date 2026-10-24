import type {Metadata} from 'next';
import Link from 'next/link';
import {requireAgentSession} from '@/lib/agent/session';
import {loadAgentBrief} from '@/lib/agent/brief';
import {signOut} from '@/lib/auth/actions';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={
 title:'José Luis · Espacio de agente',
 robots:{index:false,follow:false,nocache:true}
};

const labels=[
 ['projectsActive','Proyectos activos','Visibilidad operativa'],
 ['tasksOpen','Tareas pendientes','Acciones que requieren seguimiento'],
 ['deliverablesOpen','Entregables abiertos','Trabajo por completar'],
 ['quotesInReview','Cotizaciones en revisión','Pendientes de decisión humana'],
 ['opportunitiesActive','Oportunidades activas','Pipeline abierto'],
] as const;

export default async function AgentPortal(){
 const identity=await requireAgentSession();
 const brief=await loadAgentBrief();
 return <div className="agent-portal">
  <header className="agent-portal-top">
   <Link href="/agente" className="agent-brand">ANDRAI<span>.</span> <small>AGENT SPACE</small></Link>
   <form action={signOut}><button type="submit" className="agent-signout">Cerrar sesión ↗</button></form>
  </header>
  <main className="agent-portal-main">
   <div className="eyebrow">IDENTIDAD OPERATIVA / OS-12</div>
   <h1>Hola, {identity.displayName}<span className="accent">.</span></h1>
   <p className="agent-portal-description">Acceso independiente y de solo lectura a un resumen autorizado de Andrai. Esta cuenta no es Dirección ni puede actuar en nombre de otra persona.</p>
   <div className="agent-portal-scope"><span className="agent-portal-verified">Identidad verificada</span>
    <span>Permiso: resumen operativo</span><span>Escrituras: desactivadas</span></div>
   <section className="agent-portal-stats" aria-label="Indicadores operativos autorizados">
    {labels.map(([key,label,desc])=><article key={key} className="agent-portal-stat">
     <small>{label}</small><strong>{brief[key]}</strong><span>{desc}</span>
    </article>)}
   </section>
   <section className="agent-portal-panel">
    <div className="eyebrow">PREPARACIÓN DE PROPUESTAS</div>
    <h2>Observar primero. Proponer después.</h2>
    <p>OS-12 habilita la consulta de indicadores. La preparación y revisión de propuestas se añadirá después con aprobación humana explícita. No hay envío de mensajes, cambios comerciales, accesos bancarios ni acciones autónomas.</p>
    <div className="agent-portal-audit"><span>Actualizado desde la base autorizada</span><time dateTime={brief.asOf}>{new Intl.DateTimeFormat('es-MX',{timeZone:'America/Monterrey',dateStyle:'medium',timeStyle:'short'}).format(new Date(brief.asOf))}</time></div>
   </section>
   <p className="agent-portal-footer">Agente: José Luis · Sesión independiente · Sin datos personales ni información financiera en el resumen.</p>
  </main>
 </div>;
}
