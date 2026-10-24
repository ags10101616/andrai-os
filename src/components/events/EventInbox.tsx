import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';
import {
 eventClassLabels,eventEntityLabels,auditActionLabels,
 type EventInbox as Inbox
} from '@/lib/events/model';

function EventTime({when}:{when:string}){
 const timestamp=new Date(when);
 return <time dateTime={when}>
  {new Intl.DateTimeFormat('es-MX',{
   timeZone:'America/Monterrey',
   dateStyle:'medium',timeStyle:'short'
  }).format(timestamp)}
 </time>;
}
export function EventInboxView({inbox}:{inbox:Inbox}){
 const {summary,events}=inbox;
 const max=Math.max(1,...summary.categories.map(x=>x.count));
 return <>
  <section className="page-intro">
   <div>
    <div className="eyebrow">DIRECCIÓN / EVENTOS / OS-11</div>
    <h1>Todo cambio<br/>tiene historia<span className="accent">.</span></h1>
    <p>Bandeja privada de eventos auditados. Una base para futuras alertas, sin envíos, destinatarios ni permisos autónomos.</p>
   </div>
   <span className="action-disabled">Solo lectura · Cero envíos</span>
  </section>
  <div className="event-toolbar">
   <div className="event-period">
    <span>PERIODO</span>
    <nav aria-label="Periodo de los eventos">
     {([7,30,90] as const).map(days=><Link
      href={days===30?'/eventos':'/eventos?days='+days}
      aria-current={summary.days===days?'page':undefined}
      key={days}>{days} días</Link>)}
    </nav>
   </div>
   <Link href="/resumen">Volver al dashboard ↗</Link>
  </div>
  <p className="event-period-hint">
   Del <strong>{summary.periodStart}</strong> al <strong>{summary.periodEnd}</strong>,
   horario de Monterrey. Solo se muestran los eventos registrados en este workspace.
  </p>
  <div className="event-stat-grid">
   <div className="event-stat">
    <small>Eventos auditados</small><strong>{summary.total.toLocaleString('es-MX')}</strong>
    <span>Periodo seleccionado</span>
   </div>
   <div className="event-stat">
    <small>Eventos retenidos</small><strong>{summary.held.toLocaleString('es-MX')}</strong>
    <span>Sin activar entregas</span>
   </div>
   <div className="event-stat">
    <small>Notificaciones enviadas</small><strong>{summary.externalDispatched}</strong>
    <span>Ningún canal externo habilitado</span>
   </div>
  </div>
  <div className="event-panels">
   <SectionSurface title="De dónde vienen los cambios"
    subtitle="Categorías deducidas de la auditoría, sin copiar datos personales.">
    {summary.total===0?<EmptyState symbol="▦"
     title="Todavía no existen eventos"
     description="La bandeja se llenará cuando haya operaciones reales. No se han creado eventos ficticios."/>:
    <div className="event-categories" role="list" aria-label="Eventos por categoría">
     {summary.categories.map(item=><div role="listitem" className="event-category" key={item.key}>
      <span>{eventClassLabels[item.key]}</span>
      <div className="event-track" aria-hidden="true">
       <div className="event-fill" style={{width:(item.count/max*100)+'%'}}/>
      </div>
      <strong>{item.count}</strong>
     </div>)}
    </div>}
   </SectionSurface>
   <SectionSurface title="Registro reciente"
    subtitle="Hasta 50 eventos del periodo. No se muestran importes ni contenidos de clientes.">
    {events.length===0?<EmptyState symbol="↗"
     title="Sin actividad para mostrar"
     description="La bitácora aún no contiene cambios en el periodo elegido."/>:
    <ol className="event-timeline">{events.map(event=><li key={event.id}>
     <span className="event-timeline-dot" aria-hidden="true"/>
     <div>
      <span className="event-item-category">{eventClassLabels[event.eventClass]}</span>
      <strong>{auditActionLabels[event.action]} · {eventEntityLabels[event.entity]}</strong>
      <small><EventTime when={event.occurredAt}/></small>
     </div>
     <span className="event-held-tag">Retenido</span>
    </li>)}</ol>}
   </SectionSurface>
  </div>
  <div className="event-safety">
   <strong>Notificaciones en preparación, no enviadas.</strong> El sistema conserva señales
   sin correos, WhatsApp, webhooks ni acciones de José Luis. Las entregas deberán aprobarse
   y probarse en specs posteriores.
  </div>
 </>;
}
