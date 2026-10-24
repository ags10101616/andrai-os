export type DashboardRole='owner'|'sales'|'production';
export type DashboardDays=7|30|90;
export const allowedDashboardDays=[7,30,90] as const;
export const opportunityKeys=['new','contacted','meeting','proposal','won','lost'] as const;
export const projectKeys=['brief','design','development','review','delivered'] as const;
export const quoteKeys=['draft','review','approved','sent','accepted','rejected'] as const;
export const opportunityLabels:Readonly<Record<(typeof opportunityKeys)[number],string>>={
 new:'Nuevas',contacted:'Contactadas',meeting:'Reunión',proposal:'Propuesta',won:'Ganadas',lost:'Perdidas'
};
export const projectLabels:Readonly<Record<(typeof projectKeys)[number],string>>={
 brief:'Brief',design:'Diseño',development:'Desarrollo',review:'Revisión',delivered:'Entregados'
};
export const quoteLabels:Readonly<Record<(typeof quoteKeys)[number],string>>={
 draft:'Borrador',review:'Revisión',approved:'Aprobadas',sent:'Enviadas',accepted:'Aceptadas',rejected:'Rechazadas'
};
export type CountPoint={key:string;count:number};
export type TaskMetrics={open:number;overdue:number;dueSoon7:number;completedInPeriod:number;openDeliverables:number;scope:'team'|'assigned'};
export type SalesMetrics={
 activeOpportunities:number;newInPeriod:number;wonTotal:number;
 overdueFollowups:number;openPipelineMinor:number;quotesTotal:number;
 quotesInReview:number;pipeline:CountPoint[];quoteStatuses:CountPoint[];
};
export type OperationsMetrics={
 active:number;deliveredTotal:number;createdInPeriod:number;
 overdue:number;avgActiveProgress:number;scope:'team'|'assigned';
 stages:CountPoint[];
};
export type FinanceMetrics={
 receiptsInPeriodMinor:number;expensesInPeriodMinor:number;
 refundsInPeriodMinor:number;netInPeriodMinor:number;
 acceptedOpenMinorAll:number;source:'manually_registered'
};
export type ExecutiveReport={
 role:DashboardRole;days:DashboardDays;asOf:string;
 start:string;end:string;timezone:'America/Monterrey';
 tasks:TaskMetrics; sales?:SalesMetrics;operations?:OperationsMetrics;finance?:FinanceMetrics;
};
export function parseDashboardDays(value:unknown):DashboardDays{
 if(value==='7'||value===7)return 7;
 if(value==='90'||value===90)return 90;
 return 30;
}
function row(input:unknown,context:string):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw new Error('Invalid dashboard '+context);
 return input as Record<string,unknown>;
}
function count(input:unknown):number{
 const number=Number(input);
 if(!Number.isSafeInteger(number)||number<0)throw new Error('Invalid count');
 return number;
}
function signed(input:unknown):number{
 const number=Number(input);
 if(!Number.isSafeInteger(number))throw new Error('Invalid signed money');
 return number;
}
function reportDate(v:unknown):string{
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||
   !Number.isFinite(Date.parse(v+'T12:00:00Z')))
  throw new Error('Invalid reporting date');
 return v;
}
function chart(value:unknown,keys:readonly string[],kind:'stage'|'status'):CountPoint[]{
 if(!Array.isArray(value)||value.length!==keys.length)throw new Error('Invalid dashboard chart');
 return keys.map((key,index)=>{
  const item=row(value[index],'chart');
  if(item[kind]!==key)throw new Error('Unexpected dashboard series');
  return {key,count:count(item.count)};
 });
}
function tasks(value:unknown,role:DashboardRole):TaskMetrics{
 const t=row(value,'tasks');
 const expectedScope=role==='owner'?'team':'assigned';
 if(t.scope!==expectedScope)throw new Error('Invalid task scope');
 return {scope:expectedScope,open:count(t.open),overdue:count(t.overdue),
  dueSoon7:count(t.due_soon_7),completedInPeriod:count(t.completed_in_period),
  openDeliverables:count(t.open_deliverables)};
}
function sales(value:unknown):SalesMetrics{
 const s=row(value,'sales');
 return {
  activeOpportunities:count(s.active_opportunities),
  newInPeriod:count(s.new_in_period),wonTotal:count(s.won_total),
  overdueFollowups:count(s.overdue_followups),
  openPipelineMinor:count(s.open_pipeline_minor),
  quotesTotal:count(s.quotes_total),
  quotesInReview:count(s.quotes_in_review),
  pipeline:chart(s.pipeline,opportunityKeys,'stage'),
  quoteStatuses:chart(s.quote_statuses,quoteKeys,'status'),
 };
}
function operations(value:unknown,role:DashboardRole):OperationsMetrics{
 const p=row(value,'operations');
 const expected=role==='owner'?'team':'assigned';
 if(p.scope!==expected)throw new Error('Invalid project scope');
 const progress=Number(p.avg_active_progress_percent);
 if(!Number.isFinite(progress)||progress<0||progress>100)
  throw new Error('Invalid progress');
 return {
  scope:expected,active:count(p.active),
  deliveredTotal:count(p.delivered_total),
  createdInPeriod:count(p.created_in_period),
  overdue:count(p.overdue),
  avgActiveProgress:progress,
  stages:chart(p.stages,projectKeys,'stage')
 };
}
function finance(value:unknown):FinanceMetrics{
 const f=row(value,'finance');
 if(f.source!=='manually_registered')throw new Error('Invalid finance source');
 return {
  source:'manually_registered',
  receiptsInPeriodMinor:count(f.receipts_in_period_minor),
  expensesInPeriodMinor:count(f.expenses_in_period_minor),
  refundsInPeriodMinor:count(f.refunds_in_period_minor),
  netInPeriodMinor:signed(f.net_in_period_minor),
  acceptedOpenMinorAll:count(f.accepted_open_minor_all),
 };
}
export function parseExecutiveReport(value:unknown,expectedRole:DashboardRole,days:DashboardDays):ExecutiveReport{
 const raw=row(value,'response');
 if(raw.role!==expectedRole||raw.days!==days||raw.timezone!=='America/Monterrey')
  throw new Error('Server report role or date-window mismatch');
 const base:ExecutiveReport={
  role:expectedRole,days,timezone:'America/Monterrey',
  asOf:reportDate(raw.as_of),start:reportDate(raw.period_start),end:reportDate(raw.period_end),
  tasks:tasks(raw.tasks,expectedRole),
 };
 if(base.start>base.end||base.asOf!==base.end)throw new Error('Invalid report boundaries');
 if(expectedRole==='production'){
  if('sales' in raw||'finance' in raw)throw new Error('Production must not receive commercial data');
  base.operations=operations(raw.operations,expectedRole);
 }else if(expectedRole==='sales'){
  if('operations' in raw||'finance' in raw)throw new Error('Sales must not receive internal finance');
  base.sales=sales(raw.sales);
 }else{
  base.sales=sales(raw.sales);
  base.operations=operations(raw.operations,expectedRole);
  base.finance=finance(raw.finance);
 }
 return base;
}
