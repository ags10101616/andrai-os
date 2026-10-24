import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricTile } from '@/components/ui/MetricTile';
import { SectionSurface } from '@/components/ui/SectionSurface';
import { StatusTag } from '@/components/ui/StatusTag';

const metrics = [
  {label:'Oportunidades activas',value:'—',hint:'Disponible con OS-05'},
  {label:'Proyectos en curso',value:'—',hint:'Disponible con OS-06'},
  {label:'Cotizaciones',value:'—',hint:'Disponible con OS-07'},
  {label:'Tareas pendientes',value:'—',hint:'Disponible con OS-06'},
] as const;
const stages=['Nuevo','Contactado','Reunión','Propuesta','Ganado'];

export function Overview() {
  return <>
    <section className="page-intro">
      <div>
        <div className="eyebrow">HOY / VISIÓN GENERAL</div>
        <h1>Una operación.<br/>Toda a la vista<span className="accent">.</span></h1>
        <p>Un espacio para decidir con claridad. Los indicadores aparecerán cuando conectemos datos verificados.</p>
      </div>
      <span className="action-disabled">Alta de prospectos en OS-05</span>
    </section>
    <section className="metrics" aria-label="Indicadores aún no conectados">
      {metrics.map(m=><MetricTile key={m.label} {...m}/>)}
    </section>
    <div className="panel-grid">
      <SectionSurface title="Pipeline comercial" subtitle="Seguimiento completo, desde el primer contacto." action={<Link href="/prospectos">Ver prospectos ↗</Link>}>
        <div className="chart-empty" role="img" aria-label="Gráfica de pipeline aún sin datos">
          {stages.map(stage=><div key={stage}>
            <div className="bar-track"><div className="bar-placeholder"/></div>
            <span>{stage}</span>
          </div>)}
        </div>
        <p className="note">Sin cifras simuladas: aquí aparecerá el pipeline real.</p>
      </SectionSurface>
      <SectionSurface title="Requiere atención" subtitle="Próximos compromisos del equipo." action={<Link href="/tareas">Ver tareas ↗</Link>}>
        <EmptyState symbol="✓" title="Agenda por conectar" description="Las tareas reales estarán disponibles al implementar OS-06."/>
      </SectionSurface>
      <SectionSurface title="Proyectos en movimiento" subtitle="Visibilidad sobre entregas y responsables." action={<Link href="/proyectos">Ver proyectos ↗</Link>}>
        <EmptyState symbol="□" title="Todavía sin proyectos" description="La información se mostrará al activar el módulo operativo."/>
      </SectionSurface>
      <SectionSurface title="José Luis" subtitle="Asistencia operativa bajo supervisión." action={<Link href="/jose-luis">Ver integración ↗</Link>}>
        <div className="agent-card">
          <span className="coral-star" aria-hidden="true">✳</span>
          <div><strong>Integración pendiente</strong><small>Sin sesión ni permisos de ejecución</small></div>
          <StatusTag label="Inactivo"/>
        </div>
        <p className="agent-note">José Luis podrá preparar acciones y alertas cuando existan permisos específicos y aprobaciones verificables.</p>
      </SectionSurface>
    </div>
    <SectionSurface title="Actividad reciente" subtitle="Cada cambio quedará respaldado por auditoría." className="activity">
      <EmptyState symbol="↗" title="Sin actividad conectada" description="No mostramos eventos ficticios para llenar el tablero."/>
    </SectionSurface>
  </>;
}
