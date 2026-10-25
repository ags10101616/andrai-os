import type {Metadata} from 'next';
import Link from 'next/link';
import {requireAgentSession} from '@/lib/agent/session';
import {loadAgentBrief} from '@/lib/agent/brief';
import {loadAgentOwnProposals} from '@/lib/agent/proposals/data';
import {ProposalDraftForm} from '@/components/agent/ProposalDraftForm';
import {proposalLabels,proposalStatusLabels} from '@/lib/agent/proposals/model';
import {isPilotReadOnly} from '@/lib/release/gates';
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
 const [brief,proposals]=await Promise.all([
  loadAgentBrief(),loadAgentOwnProposals()
 ]);
 const intakeEnabled=!isPilotReadOnly()&&process.env.OS13_AGENT_PROPOSALS_ENABLED==='true';
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
   <ProposalDraftForm enabled={intakeEnabled}/>
   <section className="agent-portal-panel agent-proposals-history">
    <div className="eyebrow">OS-13 / HISTORIAL PERSONAL</div>
    <h2>Propuestas enviadas</h2>
    <p>Solo puedes consultar las sugerencias enviadas desde tu propia identidad, no las de Dirección u otros empleados.</p>
    {proposals.length===0?<p className="proposal-form-muted">Todavía no hay propuestas registradas.</p>:
    <ol className="agent-proposals-items">{proposals.map(proposal=><li key={proposal.id}>
     <div><small>{proposalLabels[proposal.kind]}</small><strong>{proposal.summary}</strong></div>
     <span>{proposalStatusLabels[proposal.status]}</span>
    </li>)}</ol>}
    <div className="agent-portal-audit"><span>Indicadores consultados en Supabase</span><time dateTime={brief.asOf}>{new Intl.DateTimeFormat('es-MX',{timeZone:'America/Monterrey',dateStyle:'medium',timeStyle:'short'}).format(new Date(brief.asOf))}</time></div>
   </section>
   <p className="agent-portal-footer">Agente: José Luis · Sesión independiente · Sin datos personales ni información financiera en el resumen.</p>
  </main>
 </div>;
}
