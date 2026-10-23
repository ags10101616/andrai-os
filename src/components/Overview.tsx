import Link from 'next/link';

function Empty({symbol,title,description}:{symbol:string;title:string;description:string}) {return <div className="empty"><span className="empty-symbol">{symbol}</span><strong>{title}</strong><p>{description}</p></div>;}
const metrics=[['Oportunidades activas','Pendiente de conexión'],['Proyectos en curso','Pendiente de conexión'],['Cotizaciones','Pendiente de conexión'],['Tareas pendientes','Pendiente de conexión']];
const stages=['Nuevo','Contactado','Reunión','Propuesta','Ganado'];

export function Overview() {return <>
  <section className="page-intro"><div><div className="eyebrow">HOY / VISIÓN GENERAL</div><h1>Una operación.<br/>Toda a la vista<span className="accent">.</span></h1><p>Este entorno está listo para recibir módulos reales. Aún no hay datos conectados.</p></div><span className="action-disabled">Alta de oportunidades en OS-05</span></section>
  <section className="metrics" aria-label="Indicadores sin datos">{metrics.map(([title,detail])=><div className="metric" key={title}><span>{title}</span><strong>—</strong><small>{detail}</small><div className="tiny-line"/></div>)}</section>
  <div className="panel-grid">
    <section className="panel"><div className="panel-head"><div><h2>Pipeline comercial</h2><p>Las etapas aparecerán al activar el CRM.</p></div><Link href="/prospectos">Ir a prospectos ↗</Link></div><div className="chart-empty" role="img" aria-label="Pipeline vacío, sin datos conectados">{stages.map(s=><div key={s}><div className="bar-track"><div className="bar-placeholder"/></div><span>{s}</span></div>)}</div><p className="note">No se muestran cifras ficticias. Los datos serán reales al conectar el CRM.</p></section>
    <section className="panel"><div className="panel-head"><div><h2>Requiere atención</h2><p>Compromisos y próximos pasos.</p></div><Link href="/tareas">Ver tareas ↗</Link></div><Empty symbol="✓" title="La agenda aún no está conectada" description="OS-06 habilitará las tareas reales del equipo."/></section>
    <section className="panel"><div className="panel-head"><div><h2>Proyectos en movimiento</h2><p>Entregables que requieren seguimiento.</p></div><Link href="/proyectos">Ver proyectos ↗</Link></div><Empty symbol="□" title="Sin proyectos cargados" description="Aquí aparecerán cuando activemos el módulo seguro."/></section>
    <section className="panel"><div className="panel-head"><div><h2>José Luis</h2><p>Agente operativo · estado real</p></div><Link href="/jose-luis">Ver integración ↗</Link></div><div className="agent-card"><span className="coral-star">✳</span><div><strong>Sin conectar</strong><small>Ninguna sesión ni permiso automatizado</small></div><span>Inactivo</span></div><p className="agent-note">Cuando esté conectado, dispondrá de herramientas de lectura y aprobaciones humanas. No tendrá acceso administrativo libre.</p></section>
  </div>
  <section className="panel activity"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Se integrará con el registro auditable.</p></div></div><Empty symbol="↗" title="Sin actividad conectada" description="Nada se inventa para llenar el dashboard."/></section>
</>;}
