import type {ExecutiveReport} from './model';

function escapeCell(value:string|number):string{
 const raw=String(value);
 // CSV labels and values are static schema fields or strictly verified numeric/date values.
 // Quote everything to preserve comma separators in Excel.
 return '"'+raw.replaceAll('"','""')+'"';
}
export function buildExecutiveCsv(report:ExecutiveReport):string{
 const entries:(string|number)[][]=[
  ['Área','Indicador','Valor','Unidad','Alcance'],
  ['Reporte','Rol',report.role,'rol','autorizado'],
  ['Reporte','Desde',report.start,'fecha','periodo'],
  ['Reporte','Hasta',report.end,'fecha','periodo'],
  ['Tareas','Pendientes',report.tasks.open,'tareas',report.tasks.scope],
  ['Tareas','Vencidas',report.tasks.overdue,'tareas',report.tasks.scope],
  ['Tareas','Próximos 7 días',report.tasks.dueSoon7,'tareas',report.tasks.scope],
  ['Tareas','Completadas en periodo',report.tasks.completedInPeriod,'tareas','periodo'],
  ['Tareas','Entregables abiertos',report.tasks.openDeliverables,'entregables',report.tasks.scope],
 ];
 if(report.sales){
  entries.push(
   ['Comercial','Oportunidades activas',report.sales.activeOpportunities,'oportunidades','actual'],
   ['Comercial','Nuevas oportunidades',report.sales.newInPeriod,'oportunidades','periodo'],
   ['Comercial','Seguimientos vencidos',report.sales.overdueFollowups,'seguimientos','actual'],
   ['Comercial','Cotizaciones en revisión',report.sales.quotesInReview,'cotizaciones','actual'],
   ['Comercial','Pipeline abierto',report.sales.openPipelineMinor,'centavos MXN','actual']
  );
  for(const point of report.sales.pipeline){
   entries.push(['Pipeline',point.key,point.count,'oportunidades','actual']);
  }
  for(const point of report.sales.quoteStatuses){
   entries.push(['Cotizaciones',point.key,point.count,'cotizaciones','actual']);
  }
 }
 if(report.operations){
  entries.push(
   ['Proyectos','Activos',report.operations.active,'proyectos',report.operations.scope],
   ['Proyectos','Nuevos en periodo',report.operations.createdInPeriod,'proyectos','periodo'],
   ['Proyectos','Atrasados',report.operations.overdue,'proyectos',report.operations.scope],
   ['Proyectos','Entregados',report.operations.deliveredTotal,'proyectos',report.operations.scope],
   ['Proyectos','Progreso promedio activo',report.operations.avgActiveProgress,'%','actual']
  );
  for(const point of report.operations.stages){
   entries.push(['Etapas de proyecto',point.key,point.count,'proyectos',report.operations.scope]);
  }
 }
 if(report.role==='owner'){
  if(!report.finance)throw new Error('Owner finance metrics missing');
  entries.push(
   ['Finanzas','Cobros registrados',report.finance.receiptsInPeriodMinor,'centavos MXN','periodo'],
   ['Finanzas','Gastos registrados',report.finance.expensesInPeriodMinor,'centavos MXN','periodo'],
   ['Finanzas','Devoluciones registradas',report.finance.refundsInPeriodMinor,'centavos MXN','periodo'],
   ['Finanzas','Movimiento neto registrado',report.finance.netInPeriodMinor,'centavos MXN','periodo'],
   ['Finanzas','Saldo cotizaciones aceptadas',report.finance.acceptedOpenMinorAll,'centavos MXN','actual']
  );
 }
 return '\ufeff'+entries.map(row=>row.map(escapeCell).join(',')).join('\r\n')+'\r\n';
}
