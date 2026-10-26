import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AppShell} from '@/components/AppShell';
import {OpportunityUpdateForm} from '@/components/crm/OpportunityUpdateForm';
import {requireMembership} from '@/lib/auth/session';
import {isPilotReadOnly} from '@/lib/release/gates';
import {loadOpportunityDetail,stageLabels} from '@/lib/data/pipeline';
import {isUuid} from '@/lib/data/ops-validation';
import {formatMxMoneyMinor} from '@/lib/data/money';

export const metadata:Metadata={title:'Oportunidad comercial'};
export const dynamic='force-dynamic';
export const revalidate=0;

export default async function OpportunityDetailPage({params}:{params:Promise<{id:string}>}){
 const member=await requireMembership('prospectos');
 const {id}=await params;
 if(!isUuid(id))notFound();
 const opportunity=await loadOpportunityDetail(id,member.organizationId);
 if(!opportunity)notFound();
 const enabled=!isPilotReadOnly()&&process.env.OS05_CRM_WRITES_ENABLED==='true';
 return <AppShell active="prospectos" role={member.role} displayName={member.displayName}>
  <p className="os16-back"><Link href="/prospectos">← Volver a prospectos</Link></p>
  <section className="page-intro">
   <div><span className="eyebrow">COMERCIAL / OPORTUNIDAD</span>
    <h1>{opportunity.title}<span className="accent">.</span></h1>
    <p>{opportunity.clientName} · {stageLabels[opportunity.stage]}</p>
   </div>
   <span className="action-disabled">{enabled?'Edición privada habilitada':'Lectura real · edición pausada'}</span>
  </section>
  <section className="panel os16-detail-summary">
   <div className="panel-head"><div><h2>Contexto de la oportunidad</h2>
    <p>Datos reales visibles únicamente para Dirección y Comercial.</p></div></div>
   <dl className="os16-detail-facts">
    <div><dt>Cliente</dt><dd>{opportunity.clientName}</dd></div>
    <div><dt>Contacto</dt><dd>{opportunity.contactName||'Sin contacto registrado'}</dd></div>
    <div><dt>Correo</dt><dd>{opportunity.contactEmail||'Sin correo registrado'}</dd></div>
    <div><dt>Teléfono</dt><dd>{opportunity.contactPhone||'Sin teléfono registrado'}</dd></div>
    <div><dt>Etapa</dt><dd>{stageLabels[opportunity.stage]}</dd></div>
    <div><dt>Importe estimado</dt><dd>{formatMxMoneyMinor(opportunity.amountMinor)}</dd></div>
   </dl>
  </section>
  <OpportunityUpdateForm key={opportunity.updatedAt} opportunity={opportunity} enabled={enabled}/>
 </AppShell>;
}
