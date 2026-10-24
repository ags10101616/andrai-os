import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireMembership, type Member } from '@/lib/auth/session';
import {
 parseExecutiveReport,type ExecutiveReport,type DashboardDays
} from './model';

export type NextTask={id:string;title:string;dueOn:string;kind:string;priority:string};
export type NextFollowup={id:string;title:string;nextAction:string;nextActionOn:string};
export type RecentEvent={action:'INSERT'|'UPDATE'|'DELETE';entity:string;occurredAt:string};
export type DashboardData={
 member:Member;report:ExecutiveReport;
 upcomingTasks:NextTask[];followups:NextFollowup[];
 activity:RecentEvent[];
};
function string(value:unknown,max=240):string {
 return typeof value==='string'?value.slice(0,max):'';
}
function asRecord(v:unknown):Record<string,unknown> {
 if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Malformed dashboard row');
 return v as Record<string,unknown>;
}
const auditableEntities=new Set([
 'os_clients','os_opportunities','os_projects','os_tasks',
 'os_quotes','os_quote_snapshots','os_ledger'
]);
export async function loadExecutiveDashboard(days:DashboardDays):Promise<DashboardData>{
 const member=await requireMembership('resumen');
 const db=await createServerSupabase();

 let tasksQuery=db.from('os_tasks')
  .select('id,title,due_on,kind,priority')
  .eq('organization_id',member.organizationId)
  .eq('done',false);
 if(member.role!=='owner')tasksQuery=tasksQuery.eq('assigned_staff_id',member.id);
 const tasksPromise=tasksQuery.order('due_on',{ascending:true}).limit(7);

 const followupsPromise=member.role!=='production'
  ?db.from('os_opportunities')
   .select('id,title,next_action,next_action_on')
   .eq('organization_id',member.organizationId)
   .in('stage',['new','contacted','meeting','proposal'])
   .order('next_action_on',{ascending:true}).limit(6)
  :Promise.resolve({data:[],error:null});

 const auditPromise=member.role==='owner'
  ?db.from('os_audit_events')
    .select('action,entity,occurred_at')
    .eq('organization_id',member.organizationId)
    .order('occurred_at',{ascending:false}).limit(8)
  :Promise.resolve({data:[],error:null});

 const [metrics,tasks,followups,audit]=await Promise.all([
  db.rpc('os09_dashboard_v1',{p_days:days}),
  tasksPromise,followupsPromise,auditPromise
 ]);
 if(metrics.error||tasks.error||followups.error||audit.error) {
  throw new Error('Unable to read authorized dashboard report');
 }
 const report=parseExecutiveReport(metrics.data,member.role,days);
 const upcomingTasks:NextTask[]=(tasks.data??[]).map((raw:unknown)=>{
  const t=asRecord(raw);
  return {
   id:string(t.id,40),title:string(t.title,180),
   dueOn:string(t.due_on,10),kind:string(t.kind,20),priority:string(t.priority,20)
  };
 });
 const followupRows:NextFollowup[]=(followups.data??[]).map((raw:unknown)=>{
  const o=asRecord(raw);
  return {
   id:string(o.id,40),title:string(o.title,160),
   nextAction:string(o.next_action,240),nextActionOn:string(o.next_action_on,10),
  };
 });
 const activity:RecentEvent[]=(audit.data??[])
  .map((raw:unknown)=>asRecord(raw))
  .filter(x=>auditableEntities.has(string(x.entity))&&
    (x.action==='INSERT'||x.action==='UPDATE'||x.action==='DELETE'))
  .map(x=>({
   action:x.action as RecentEvent['action'],
   entity:string(x.entity,48),
   occurredAt:string(x.occurred_at,45)
  }));
 return {member,report,upcomingTasks,followups:followupRows,activity};
}
