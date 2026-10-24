import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LeadIntakeForm } from '@/components/crm/LeadIntakeForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';
import { requireMembership } from '@/lib/auth/session';
import { formatMxMoneyMinor } from '@/lib/data/money';
import { loadPipeline, isPipelineStage, pipelineStages, stageLabels } from '@/lib/data/pipeline';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Prospectos'};
export default async function ProspectsPage({searchParams}:{searchParams:Promise<{stage?:string}>}) {
  const member=await requireMembership('prospectos');
  const {stage:stageInput}=await searchParams;
  const stage=isPipelineStage(stageInput)?stageInput:undefined;
  const entries=await loadPipeline(stage);
  const writeEnabled=process.env.OS05_CRM_WRITES_ENABLED==='true';
  return <AppShell active="prospectos" role={member.role} displayName={member.displayName}>
    <section className="page-intro">
      <div><div className="eyebrow">COMERCIAL / CRM / OS-05</div><h1>Cada conversación<br/>cuenta<span className="accent">.</span></h1>
        <p>El contexto, la oportunidad y el siguiente paso permanecen juntos. Solo aparecen registros reales autorizados.</p></div>
      <span className="action-disabled">{writeEnabled?'Piloto privado':'Lectura real · Escrituras pausadas'}</span>
    </section>
    <SectionSurface title="Pipeline comercial" subtitle="Hasta 60 oportunidades recientes por filtro, ordenadas por fecha.">
      <nav className="crm-stage-nav" aria-label="Filtrar oportunidades por etapa">
        <Link href="/prospectos" aria-current={!stage?'page':undefined}>Todas</Link>
        {pipelineStages.map(key=><Link href={'/prospectos?stage='+key} key={key} aria-current={stage===key?'page':undefined}>{stageLabels[key]}</Link>)}
      </nav>
      {entries.length===0 ? <EmptyState symbol="◎" title="Sin oportunidades para mostrar" description="Cuando se activen las altas o exista actividad comercial, los registros aparecerán aquí."/> :
        <div className="crm-table-scroll">
          <table className="crm-table">
            <caption>Oportunidades visibles según tus permisos y el filtro seleccionado</caption>
            <thead><tr><th scope="col">Cliente / oportunidad</th><th scope="col">Etapa</th><th scope="col">Importe estimado</th><th scope="col">Siguiente paso</th><th scope="col">Fecha</th></tr></thead>
            <tbody>{entries.map(entry=><tr key={entry.id}>
              <td><strong>{entry.clientName}</strong><span>{entry.title}</span></td>
              <td><span className="crm-stage-badge">{stageLabels[entry.stage]}</span></td>
              <td>{formatMxMoneyMinor(entry.amountMinor)}</td>
              <td>{entry.nextAction}</td>
              <td>{entry.nextActionOn}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </SectionSurface>
    <LeadIntakeForm enabled={writeEnabled}/>
  </AppShell>;
}
