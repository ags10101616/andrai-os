/** OS-11: sanitized, read-only, owner-only event feed. NO sending support. */
export const eventClasses=['sales','operations','commerce','finance'] as const;
export type EventClass=(typeof eventClasses)[number];
export const eventClassLabels:Readonly<Record<EventClass,string>>={
 sales:'Comercial',
 operations:'Operación',
 commerce:'Cotizaciones',
 finance:'Finanzas',
};
export const auditActions=['INSERT','UPDATE','DELETE'] as const;
export type AuditAction=(typeof auditActions)[number];
export const auditActionLabels:Readonly<Record<AuditAction,string>>={
 INSERT:'Registrado',
 UPDATE:'Actualizado',
 DELETE:'Eliminado',
};
export const eventEntities=[
 'os_clients','os_opportunities','os_projects','os_tasks',
 'os_quotes','os_quote_snapshots','os_ledger'
] as const;
export type EventEntity=(typeof eventEntities)[number];
export const eventEntityLabels:Readonly<Record<EventEntity,string>>={
 os_clients:'cliente',
 os_opportunities:'oportunidad',
 os_projects:'proyecto',
 os_tasks:'tarea o entregable',
 os_quotes:'cotización',
 os_quote_snapshots:'versión de cotización',
 os_ledger:'movimiento financiero',
};
export type ReportingDays=7|30|90;
export type EventMetric={key:EventClass;count:number};
export type EventActionMetric={key:AuditAction;count:number};
export type EventNotice={
 id:string;
 eventClass:EventClass;
 entity:EventEntity;
 action:AuditAction;
 occurredAt:string;
 dispatchState:'held';
};
export type EventSummary={
 days:ReportingDays;
 asOf:string;
 periodStart:string;
 periodEnd:string;
 total:number;
 held:number;
 externalDispatched:0;
 categories:EventMetric[];
 actions:EventActionMetric[];
};
export type EventInbox={
 summary:EventSummary;
 events:EventNotice[];
};

export function parseReportingDays(input:unknown):ReportingDays{
 if(input===7||input==='7')return 7;
 if(input===90||input==='90')return 90;
 return 30;
}
function obj(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Malformed event record');
 return x as Record<string,unknown>;
}
function uint(x:unknown):number{
 const n=Number(x);
 if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid event count');
 return n;
}
function isClass(x:unknown):x is EventClass{
 return typeof x==='string'&&eventClasses.includes(x as EventClass);
}
function isAction(x:unknown):x is AuditAction{
 return typeof x==='string'&&auditActions.includes(x as AuditAction);
}
function isEntity(x:unknown):x is EventEntity{
 return typeof x==='string'&&eventEntities.includes(x as EventEntity);
}
function isoDate(x:unknown):string{
 if(typeof x!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(x)||
   !Number.isFinite(Date.parse(x+'T12:00:00Z')))
  throw new Error('Invalid reporting period');
 return x;
}
function series<T extends string>(
 raw:unknown,keys:readonly T[]
):Array<{key:T;count:number}>{
 if(!Array.isArray(raw)||raw.length!==keys.length)throw new Error('Malformed series');
 return keys.map((key,index)=>{
  const entry=obj(raw[index]);
  if(entry.key!==key)throw new Error('Unexpected series order');
  return {key,count:uint(entry.count)};
 });
}
export function parseEventSummary(raw:unknown,days:ReportingDays):EventSummary{
 const data=obj(raw);
 if(data.role!=='owner'||data.days!==days||
    data.timezone!=='America/Monterrey')throw new Error('Invalid event scope');
 const total=uint(data.total);
 const held=uint(data.held);
 const dispatched=uint(data.external_dispatched);
 if(total!==held||dispatched!==0)throw new Error('Event dispatch gate violated');
 const categories=series(data.categories,eventClasses);
 const actions=series(data.actions,auditActions);
 if(categories.reduce((n,v)=>n+v.count,0)!==total||
   actions.reduce((n,v)=>n+v.count,0)!==total)
  throw new Error('Inconsistent event totals');
 const asOf=isoDate(data.as_of);
 const periodStart=isoDate(data.period_start);
 const periodEnd=isoDate(data.period_end);
 if(asOf!==periodEnd||periodStart>periodEnd)throw new Error('Invalid date window');
 return {days,asOf,periodStart,periodEnd,total,held,externalDispatched:0,categories,actions};
}
export function parseEventFeed(raw:unknown):EventNotice[]{
 if(!Array.isArray(raw)||raw.length>100)throw new Error('Invalid event feed');
 return raw.map(item=>{
  const ev=obj(item);
  if(typeof ev.event_id!=='string'||!isClass(ev.event_class)||
     !isAction(ev.source_action)||!isEntity(ev.entity_type)||
     ev.dispatch_state!=='held'||typeof ev.occurred_at!=='string'||
     !Number.isFinite(Date.parse(ev.occurred_at)))
     throw new Error('Invalid event item or dispatch state');
  return {
   id:ev.event_id,
   eventClass:ev.event_class,
   entity:ev.entity_type,
   action:ev.source_action,
   occurredAt:ev.occurred_at,
   dispatchState:'held',
  };
 });
}
