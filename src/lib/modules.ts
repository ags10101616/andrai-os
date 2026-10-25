export const modules = [
  { slug:'resumen', label:'Resumen', icon:'▦', kicker:'HOY / VISIÓN GENERAL', title:'Una operación. Toda a la vista.', description:'El punto de encuentro de ventas, proyectos y decisiones.', spec:'OS-09' },
  { slug:'prospectos', label:'Prospectos', icon:'◎', kicker:'COMERCIAL / CRM', title:'Cada conversación cuenta.', description:'Prospectos, responsables, etapas y el siguiente paso comercial.', spec:'OS-05' },
  { slug:'proyectos', label:'Proyectos', icon:'▣', kicker:'OPERACIÓN / ENTREGAS', title:'De una idea a una entrega.', description:'Estado, avance, responsables, hitos y próximos entregables.', spec:'OS-06' },
  { slug:'cotizaciones', label:'Cotizaciones', icon:'▤', kicker:'VENTAS / PROPUESTAS', title:'Propuestas con claridad.', description:'Versiones, alcance, precios, aprobación y aceptación.', spec:'OS-07' },
  { slug:'tareas', label:'Tareas', icon:'☑', kicker:'OPERACIÓN / PRIORIDADES', title:'Lo que sigue, siempre claro.', description:'Tareas, fechas y responsabilidades sin pérdida de contexto.', spec:'OS-06' },
  { slug:'finanzas', label:'Finanzas', icon:'◫', kicker:'DIRECCIÓN / CONTROL', title:'El negocio en números.', description:'Anticipos, cuentas por cobrar, movimientos y recurrencia.', spec:'OS-08' },
  { slug:'jose-luis', label:'José Luis', icon:'✳', kicker:'INTELIGENCIA / SUPERVISIÓN', title:'Una operación más atenta.', description:'Bandeja de sugerencias auditadas y decisiones de Dirección, sin ejecución.', spec:'OS-13' },
] as const;
export type ModuleSlug = (typeof modules)[number]['slug'];
export function findModule(slug: string) { return modules.find(m=>m.slug===slug); }
