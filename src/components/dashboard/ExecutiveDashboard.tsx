import Link from 'next/link';
import { signedMoneyMXN } from '@/lib/finance/model';
import { formatLocalDate } from '@/lib/data/ops-validation';
import {
  opportunityLabels,projectLabels,quoteLabels,
  type CountPoint,type ExecutiveReport
} from '@/lib/dashboard/model';
import type {
 NextTask,NextFollowup,RecentEvent
} from '@/lib/dashboard/data';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';

function Counter({label,value,description,href}:{
 label:string;value:string;description:string;href:string;
}){
 return <Link className="db-counter" href={href}>
   <small>{label}</small><strong>{value}</strong><span>{description}</span>
 </Link>;
}
function Breakdown({points,labels,ariaLabel}:{
 points:CountPoint[];labels:Readonly<Record<string,string>>;ariaLabel:string;
}){
 const max=Math.max(1,...points.map(p=>p.count));
 const total=points.reduce((sum,p)=>sum+p.count,0);
 if(total===0)return <EmptyState symbol="▦" title="Sin movimientos registrados"
  description="Los conteos reales de este tablero se mostrarán aquí cuando existan registros." />;
 return <div className="db-breakdown" role="list" aria-label={ariaLabel}>
  {points.map(point=><div className="db-breakdown-row" role="listitem" key={point.key}>
   <span>{labels[point.key]??point.key}</span>
   <div className="db-bar-track" aria-hidden="true">
     <div className="db-bar-fill" style={{width:(100*point.count/max)+'%'}}/>
   </div>
   <strong>{point.count.toLocaleString('es-MX')}</strong>
  </div>)}
 </div>;
}
const taskKindLabels:Readonly<Record<string,string>>={
 task:'Tarea',deliverable:'Entregable',milestone:'Hito'
};
const eventLabels:Readonly<Record<string,string>>={
 os_clients:'Cliente',os_opportunities:'Oportunidad',os_projects:'Proyecto',
 os_tasks:'Tarea',os_quotes:'Cotización',os_quote_snapshots:'Versión de cotización',
 os_ledger:'Movimiento financiero'
};
const actionLabels:Readonly<Record<RecentEvent['action'],string>>={
 INSERT:'Registrado',UPDATE:'Actualizado',DELETE:'Eliminado'
};
function WorkQueue({tasks,today}:{
 tasks:NextTask[];today:string;
}){
 if(!tasks.length)return <EmptyState symbol="✓" title="Sin tareas próximas"
  description="No hay tareas abiertas en la lista autorizada." />;
 return <ul className="db-queue">
  {tasks.map(t=><li key={t.id} className="db-queue-item">
   <span className="db-queue-kind">{taskKindLabels[t.kind]??'Actividad'}</span>
   <strong>{t.title}</strong>
   <span className={t.dueOn<today?'db-past-due':'db-due'}>
    {t.dueOn<today?'Vencida · ':'Vence · '}{formatLocalDate(t.dueOn)}
   </span>
  </li>)}
 </ul>;
}
function Followups({items,today}:{
 items:NextFollowup[];today:string;
}){
 if(!items.length)return <EmptyState symbol="◎" title="Sin próximos seguimientos"
  description="El CRM no tiene oportunidades abiertas con acciones pendientes." />;
 return <ul className="db-queue">
  {items.map(item=><li key={item.id} className="db-queue-item">
   <span className="db-queue-kind">Seguimiento comercial</span>
   <strong>{item.title}</strong>
   <span className="db-next-action">{item.nextAction}</span>
   <span className={item.nextActionOn<today?'db-past-due':'db-due'}>
    {item.nextActionOn<today?'Vencido · ':'Programado · '}{formatLocalDate(item.nextActionOn)}
   </span>
  </li>)}
 </ul>;
}
function AuditTrail({entries}:{
 entries:RecentEvent[];
}){
 if(!entries.length)return <EmptyState symbol="↗" title="Sin cambios registrados"
  description="Los eventos auditados aparecerán aquí cuando exista actividad real." />;
 return <ol className="db-audit">
  {entries.map((event,index)=><li key={index}>
   <span className="db-audit-dot" aria-hidden="true"/>
   <div><strong>{actionLabels[event.action]} · {eventLabels[event.entity]??'Registro'}</strong>
    <small>{event.occurredAt.slice(0,10)} · Evento auditado</small>
   </div>
  </li>)}
 </ol>;
}
function ExecutiveMetrics({r}: {r:ExecutiveReport}){
 const t=r.tasks;
 if(r.role==='production'&&r.operations){
  return <section className="db-metrics" aria-label="Indicadores operativos del rol Producción">
   <Counter label="Proyectos a cargo" value={String(r.operations.active)}
    description="Activos, todos los periodos" href="/proyectos"/>
   <Counter label="Tareas propias abiertas" value={String(t.open)}
    description="Pendientes actuales" href="/tareas"/>
   <Counter label="Entregables abiertos" value={String(t.openDeliverables)}
    description="Requieren una entrega" href="/tareas"/>
   <Counter label="Tareas vencidas" value={String(t.overdue)}
    description="Asignadas a ti" href="/tareas"/>
  </section>;
 }
 if(r.role==='sales'&&r.sales){
  return <section className="db-metrics" aria-label="Indicadores comerciales">
   <Counter label="Oportunidades activas" value={String(r.sales.activeOpportunities)}
    description="Pipeline actual" href="/prospectos"/>
   <Counter label="Nuevas en el periodo" value={String(r.sales.newInPeriod)}
    description={'Últimos '+r.days+' días'} href="/prospectos"/>
   <Counter label="Seguimientos vencidos" value={String(r.sales.overdueFollowups)}
    description="Oportunidades abiertas" href="/prospectos"/>
   <Counter label="Cotizaciones en revisión" value={String(r.sales.quotesInReview)}
    description="Esperando decisión" href="/cotizaciones"/>
  </section>;
 }
 if(r.role==='owner'&&r.sales&&r.operations&&r.finance){
  return <section className="db-metrics" aria-label="Indicadores ejecutivos de Dirección">
   <Counter label="Oportunidades activas" value={String(r.sales.activeOpportunities)}
    description="Pipeline actual" href="/prospectos"/>
   <Counter label="Proyectos activos" value={String(r.operations.active)}
    description="Todo el equipo" href="/proyectos"/>
   <Counter label="Tareas vencidas" value={String(t.overdue)}
    description="Todo el equipo" href="/tareas"/>
   <Counter label="Saldo comercial pendiente" value={signedMoneyMXN(r.finance.acceptedOpenMinorAll)}
    description="Aceptadas · registro manual" href="/finanzas"/>
  </section>;
 }
 throw new Error('Dashboard metrics do not match authorized role');
}
export function ExecutiveDashboard({report,tasks,followups,activity}:{
 report:ExecutiveReport;tasks:NextTask[];followups:NextFollowup[];activity:RecentEvent[];
}){
 const sales=report.sales;
 const projects=report.operations;
 const finance=report.finance;
 return <>
  <section className="db-intro">
   <div>
    <span className="eyebrow">ANDRAI / VISIÓN GENERAL / OS-09</span>
    <h1>Una operación.<br/>Toda a la vista<span className="accent">.</span></h1>
    <p>
     {report.role==='owner'?'Ventas, producción y finanzas conectadas en una sola vista privada.'
      :report.role==='sales'?'Visibilidad comercial sin acceso al libro financiero.'
      :'Proyectos, entregables y prioridades del trabajo asignado.'}
    </p>
   </div>
   <div className="db-asof"><small>DATOS ACTUALIZADOS EN LA CONSULTA</small>
    <strong>{formatLocalDate(report.asOf)}</strong>
    <span>America/Monterrey</span>
   </div>
  </section>
  <div className="db-toolbar">
   <div className="db-window">
    <span>PERIODO</span>
    <nav aria-label="Periodo del reporte">
     {([7,30,90] as const).map(days=><Link key={days}
      href={days===30?'/resumen':'/resumen?days='+days}
      aria-current={days===report.days?'page':undefined}>
      {days} días
     </Link>)}
    </nav>
   </div>
   <Link className="db-export" href={'/resumen/reporte.csv?days='+report.days}>
     Exportar CSV <span aria-hidden="true">↗</span>
   </Link>
  </div>
  <p className="db-period-note">
   Actividad del <strong>{formatLocalDate(report.start)}</strong> al <strong>{formatLocalDate(report.end)}</strong>.
   Los indicadores de pendientes, etapas y saldos muestran la situación actual, independientemente del periodo.
  </p>

  <ExecutiveMetrics r={report}/>

  {finance&&<SectionSurface title={'Finanzas · últimos '+report.days+' días'}
   subtitle="Movimientos declarados manualmente. No equivalen a ingresos conciliados con el banco."
   action={<Link href="/finanzas">Ver libro financiero ↗</Link>}>
    <div className="db-finance-row">
      {([
       ['Cobros registrados',finance.receiptsInPeriodMinor],
       ['Gastos registrados',finance.expensesInPeriodMinor],
       ['Devoluciones registradas',finance.refundsInPeriodMinor],
       ['Movimiento neto',finance.netInPeriodMinor],
      ] as [string,number][]).map(([label,value])=><div key={label}>
       <small>{label}</small><strong>{signedMoneyMXN(value)}</strong>
      </div>)}
    </div>
    <p className="db-caveat">
      Son registros internos. Una cotización enviada no se considera aceptada ni cobrada.
    </p>
  </SectionSurface>}

  <div className="db-panel-grid">
   {sales&&<SectionSurface title="Pipeline comercial"
    subtitle={'Oportunidades por etapa · Valor abierto: '+signedMoneyMXN(sales.openPipelineMinor)}
    action={<Link href="/prospectos">Ver prospectos ↗</Link>}>
      <Breakdown points={sales.pipeline} labels={opportunityLabels} ariaLabel="Conteo real de oportunidades por etapa"/>
      <div className="db-panel-foot">
        <span><strong>{sales.newInPeriod}</strong> nuevas en el periodo</span>
        <span><strong>{sales.overdueFollowups}</strong> seguimientos vencidos</span>
      </div>
    </SectionSurface>}
   {projects&&<SectionSurface title="Proyectos en movimiento"
    subtitle={projects.scope==='team'?'Distribución actual de todo el equipo':'Solo proyectos asignados a ti'}
    action={<Link href="/proyectos">Ver proyectos ↗</Link>}>
      <Breakdown points={projects.stages} labels={projectLabels} ariaLabel="Conteo real de proyectos por etapa"/>
      <div className="db-panel-foot">
       <span><strong>{projects.overdue}</strong> proyectos atrasados</span>
       <span><strong>{projects.avgActiveProgress.toFixed(1)} %</strong> avance promedio activo</span>
      </div>
    </SectionSurface>}
   <SectionSurface title="Prioridades próximas"
    subtitle={report.tasks.scope==='team'?'Tareas pendientes del equipo por fecha':'Tareas que tienes asignadas'}
    action={<Link href="/tareas">Ver tareas ↗</Link>}>
     <WorkQueue tasks={tasks} today={report.asOf}/>
     <div className="db-panel-foot">
       <span><strong>{report.tasks.dueSoon7}</strong> próximos 7 días</span>
       <span><strong>{report.tasks.completedInPeriod}</strong> terminadas en el periodo</span>
     </div>
   </SectionSurface>
   {sales&&<SectionSurface title="Seguimientos comerciales"
    subtitle="Próximas acciones de oportunidades abiertas"
    action={<Link href="/prospectos">Ir al CRM ↗</Link>}>
      <Followups items={followups} today={report.asOf}/>
   </SectionSurface>}
   {sales&&<SectionSurface title="Estado de cotizaciones"
    subtitle={'Total actual: '+sales.quotesTotal+' · En revisión: '+sales.quotesInReview}
    action={<Link href="/cotizaciones">Ver cotizaciones ↗</Link>}>
      <Breakdown points={sales.quoteStatuses} labels={quoteLabels} ariaLabel="Cotizaciones reales por estado"/>
   </SectionSurface>}
   {report.role==='owner'&&<SectionSurface title="Actividad auditada"
    subtitle="Últimos cambios del workspace, sin datos de contacto ni importes">
     <AuditTrail entries={activity}/>
   </SectionSurface>}
  </div>

  <div className="db-ethics-foot">
   <strong>Datos reales, sin relleno.</strong> La fuente es Supabase bajo permisos por rol.
   Los ceros representan ausencia de registros en el workspace, no una pérdida de información.
   José Luis aún no tiene permisos de ejecución ni supervisión autónoma activada.
  </div>
 </>;
}
