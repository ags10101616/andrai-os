import type {Metadata} from 'next';
import Link from 'next/link';
import {AppShell} from '@/components/AppShell';
import {ProposalReviewForm} from '@/components/agent/ProposalReviewForm';
import {requireMembership} from '@/lib/auth/session';
import {loadOwnerProposalData} from '@/lib/agent/proposals/data';
import {isPilotReadOnly} from '@/lib/release/gates';
import {proposalLabels,proposalStatusLabels,isExpiredUnreviewed} from '@/lib/agent/proposals/model';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'José Luis · Supervisión'};

const spanishDate=(timestamp:string)=>new Intl.DateTimeFormat('es-MX',{
 timeZone:'America/Monterrey',dateStyle:'medium',timeStyle:'short'
}).format(new Date(timestamp));

export default async function OwnerAgentDashboard(){
 const [member,report]=await Promise.all([
  requireMembership('jose-luis'),loadOwnerProposalData(),
 ]);
 const enabled=!isPilotReadOnly()&&
  process.env.OS13_OWNER_REVIEWS_ENABLED==='true'&&report.controls.reviewEnabled;
 const {summary,proposals,controls}=report;
 const now=new Date().toISOString();
 return <AppShell active="jose-luis" role={member.role} displayName={member.displayName}>
  <section className="page-intro">
   <div>
    <div className="eyebrow">DIRECCIÓN / JOSÉ LUIS / OS-13</div>
    <h1>Ideas bajo<br/>tu control<span className="accent">.</span></h1>
    <p>Recomendaciones generadas por una identidad de agente independiente. Cada propuesta queda auditada y requiere tu revisión antes de considerar una acción.</p>
   </div>
   <span className="action-disabled">{enabled?'Revisión habilitada':'Revisión pausada · Solo lectura'}</span>
  </section>
  <div className="proposal-stats" aria-label="Estado de sugerencias">
   {([
    ['Pendientes',summary.proposed],
    ['Aprobadas como idea',summary.approved],
    ['Descartadas',summary.rejected],
    ['Vencidas sin revisar',summary.expiredPending],
   ] as [string,number][]).map(([label,value])=><article className="proposal-stat" key={label}>
    <small>{label}</small><strong>{value.toLocaleString('es-MX')}</strong>
   </article>)}
  </div>
  <div className="proposal-policy">
   <div><strong>Control de recepción</strong><span>{controls.intakeEnabled?'Habilitado en base':'Desactivado en base'}</span></div>
   <div><strong>Control de revisión</strong><span>{controls.reviewEnabled?'Habilitado en base':'Desactivado en base'}</span></div>
   <div><strong>Ejecución automática</strong><span>Inexistente</span></div>
  </div>
  <section className="panel proposal-list">
   <div className="panel-head"><div><h2>Bandeja de propuestas</h2>
    <p>Las últimas 60 sugerencias · Total histórico: {summary.total}. El contenido es texto no confiable; no contiene órdenes ejecutables.</p>
   </div><Link href="/eventos">Ver auditoría ↗</Link></div>
   {proposals.length===0?<div className="proposal-empty">
    <span aria-hidden="true">✳</span><h3>Todavía no hay propuestas</h3>
    <p>La identidad de José Luis está separada, pero la recepción de ideas permanece cerrada hasta completar sus permisos y pruebas reales de navegador.</p>
   </div>:
   <div className="proposal-cards">
    {proposals.map(proposal=>{
     const expired=isExpiredUnreviewed(proposal,now);
     return <article className="proposal-card" key={proposal.id}>
      <div className="proposal-card-heading">
       <div><span className="proposal-kind">{proposalLabels[proposal.kind]}</span>
        <h3>{proposal.summary}</h3></div>
       <span className="proposal-card-status">{expired?'Caducada':proposalStatusLabels[proposal.status]}</span>
      </div>
      <div className="proposal-card-content">
       <div><strong>Motivo</strong><p>{proposal.rationale}</p></div>
       <div><strong>Siguiente paso sugerido</strong><p>{proposal.suggestedNextStep}</p></div>
      </div>
      <div className="proposal-card-meta">
       <span>Registrada: {spanishDate(proposal.createdAt)}</span>
       <span>Vence: {spanishDate(proposal.expiresAt)}</span>
       <span>Versión {proposal.revision}</span>
      </div>
      {proposal.reviewNote&&<p className="proposal-review-history"><strong>Decisión de Dirección:</strong> {proposal.reviewNote}</p>}
      {proposal.status==='proposed'&&!expired&&<ProposalReviewForm
       id={proposal.id} revision={proposal.revision} enabled={enabled}/>}
     </article>;
    })}
   </div>}
  </section>
  <div className="proposal-disclaimer">
   **Aprobación editorial, no ejecución.** Una idea aprobada no crea registros,
   no manda correos, no cambia precios y no autoriza a José Luis a operar herramientas externas.
   El repo continúa en una rama de revisión y las escrituras comerciales están desactivadas.
  </div>
 </AppShell>;
}
