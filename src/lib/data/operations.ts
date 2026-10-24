import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireMembership, type Member } from '@/lib/auth/session';
import {
  isProjectStage,isTaskKind,isTaskPriority,
  type ProjectStage,type TaskKind,type TaskPriority,
} from './ops-validation';

export type NameOption={id:string;name:string};
export type ProjectCard={
 id:string;clientId:string;clientName:string;name:string;stage:ProjectStage;
 progress:number;dueOn:string|null;assigneeId:string|null;assigneeName:string;
 revision:number;taskTotal:number;taskCompleted:number;openDeliverables:number;
};
export type TaskCard={
 id:string;title:string;description:string;kind:TaskKind;priority:TaskPriority;
 dueOn:string;done:boolean;completedAt:string|null;revision:number;
 assigneeId:string|null;assigneeName:string;
 projectId:string|null;projectName:string|null;opportunityId:string|null;opportunityName:string|null;
};

export async function listProjects(stage?:ProjectStage):Promise<ProjectCard[]> {
 const member=await requireMembership('proyectos');
 const db=await createServerSupabase();
 const query=db.from('os_projects')
 .select('id,client_id,name,stage,progress,due_on,assigned_staff_id,revision')
 .eq('organization_id',member.organizationId)
 .order('updated_at',{ascending:false}).limit(60);
 const {data,error}=await (stage?query.eq('stage',stage):query);
 if(error) throw new Error('Project list unavailable');
 const items=(data??[]) as Array<Record<string,unknown>>;
 if(items.length===0)return [];
 const clientIds=[...new Set(items.map(x=>String(x.client_id)))];
 const projectIds=items.map(x=>String(x.id));
 const [clients,staff,tasks]=await Promise.all([
  db.from('os_clients').select('id,name').eq('organization_id',member.organizationId).in('id',clientIds),
  db.from('os_staff').select('id,display_name').eq('organization_id',member.organizationId),
  db.from('os_tasks').select('project_id,kind,done').eq('organization_id',member.organizationId).in('project_id',projectIds).limit(2000),
 ]);
 if(clients.error||staff.error||tasks.error)throw new Error('Project relations unavailable');
 const cNames=new Map((clients.data??[]).map(c=>[String(c.id),String(c.name)]));
 const staffNames=new Map((staff.data??[]).map(s=>[String(s.id),String(s.display_name)]));
 const taskStats=new Map<string,{total:number;done:number;openDeliverables:number}>();
 for(const task of tasks.data??[]){
  const id=String(task.project_id);
  const stats=taskStats.get(id)??{total:0,done:0,openDeliverables:0};
  stats.total+=1;
  if(task.done)stats.done+=1;
  if(task.kind==='deliverable'&&!task.done)stats.openDeliverables+=1;
  taskStats.set(id,stats);
 }
 return items.filter(x=>isProjectStage(x.stage)).map(x=>{
  const stats=taskStats.get(String(x.id))??{total:0,done:0,openDeliverables:0};
  const assigneeId=x.assigned_staff_id?String(x.assigned_staff_id):null;
  return {
   id:String(x.id),clientId:String(x.client_id),
   clientName:cNames.get(String(x.client_id))??'Cliente vinculado',
   name:String(x.name),stage:x.stage as ProjectStage,
   progress:Number(x.progress),dueOn:x.due_on?String(x.due_on):null,
   assigneeId,assigneeName:assigneeId?staffNames.get(assigneeId)??'Sin responsable activo':'Sin asignar',
   revision:Number(x.revision),taskTotal:stats.total,taskCompleted:stats.done,
   openDeliverables:stats.openDeliverables,
  };
 });
}
export async function listTasks(opts?:{view?:'pending'|'done'|'all';projectId?:string}):Promise<TaskCard[]> {
 const member=await requireMembership('tareas');
 const db=await createServerSupabase();
 let query=db.from('os_tasks')
 .select('id,title,description,due_on,done,kind,priority,completed_at,revision,assigned_staff_id,project_id,opportunity_id')
 .eq('organization_id',member.organizationId).order('due_on',{ascending:true}).limit(80);
 if(opts?.view==='pending'||!opts?.view)query=query.eq('done',false);
 if(opts?.view==='done')query=query.eq('done',true);
 if(opts?.projectId)query=query.eq('project_id',opts.projectId);
 const {data,error}=await query;
 if(error)throw new Error('Task list unavailable');
 const rows=(data??[]) as Array<Record<string,unknown>>;
 if(rows.length===0)return [];
 const projects=[...new Set(rows.map(x=>x.project_id?String(x.project_id):'').filter(Boolean))];
 const opportunities=[...new Set(rows.map(x=>x.opportunity_id?String(x.opportunity_id):'').filter(Boolean))];
 const [staff,projs,opps]=await Promise.all([
  db.from('os_staff').select('id,display_name').eq('organization_id',member.organizationId),
  projects.length?db.from('os_projects').select('id,name').eq('organization_id',member.organizationId).in('id',projects)
   :Promise.resolve({data:[],error:null}),
  opportunities.length?db.from('os_opportunities').select('id,title').eq('organization_id',member.organizationId).in('id',opportunities)
   :Promise.resolve({data:[],error:null}),
 ]);
 if(staff.error||projs.error||opps.error)throw new Error('Task relations unavailable');
 const memberNames=new Map((staff.data??[]).map(x=>[String(x.id),String(x.display_name)]));
 const projectNames=new Map((projs.data??[]).map(x=>[String(x.id),String(x.name)]));
 const opportunityNames=new Map((opps.data??[]).map(x=>[String(x.id),String(x.title)]));
 return rows.filter(x=>isTaskKind(x.kind)&&isTaskPriority(x.priority)).map(x=>{
  const a=x.assigned_staff_id?String(x.assigned_staff_id):null;
  const project=x.project_id?String(x.project_id):null;
  const opportunity=x.opportunity_id?String(x.opportunity_id):null;
  return {
   id:String(x.id),title:String(x.title),description:String(x.description),
   dueOn:String(x.due_on),kind:x.kind as TaskKind,priority:x.priority as TaskPriority,
   done:Boolean(x.done),completedAt:x.completed_at?String(x.completed_at):null,
   revision:Number(x.revision),assigneeId:a,
   assigneeName:a?memberNames.get(a)??'Sin responsable activo':'Sin asignar',
   projectId:project,projectName:project?projectNames.get(project)??'Proyecto vinculado':null,
   opportunityId:opportunity,opportunityName:opportunity?opportunityNames.get(opportunity)??'Oportunidad vinculada':null,
  };
 });
}

export async function projectFormOptions():Promise<{clients:NameOption[];staff:NameOption[];member:Member}> {
 const member=await requireMembership('proyectos');
 const db=await createServerSupabase();
 if(member.role!=='owner')return {clients:[],staff:[],member};
 const [clients,staff]=await Promise.all([
  db.from('os_clients').select('id,name').eq('organization_id',member.organizationId).order('name').limit(100),
  db.from('os_staff').select('id,display_name').eq('organization_id',member.organizationId).eq('active',true).order('display_name'),
 ]);
 if(clients.error||staff.error)throw new Error('Project form unavailable');
 return {
  clients:(clients.data??[]).map(c=>({id:String(c.id),name:String(c.name)})),
  staff:(staff.data??[]).map(s=>({id:String(s.id),name:String(s.display_name)})),member,
 };
}

export async function taskFormOptions():Promise<{
 staff:NameOption[];projects:NameOption[];opportunities:NameOption[];member:Member
}> {
 const member=await requireMembership('tareas');
 const db=await createServerSupabase();
 const [staff,projects,opportunities]=await Promise.all([
  member.role==='owner'?db.from('os_staff').select('id,display_name').eq('organization_id',member.organizationId).eq('active',true).order('display_name')
   :Promise.resolve({data:[],error:null}),
  member.role!=='sales'?db.from('os_projects').select('id,name').eq('organization_id',member.organizationId).order('name').limit(100)
   :Promise.resolve({data:[],error:null}),
  member.role!=='production'?db.from('os_opportunities').select('id,title').eq('organization_id',member.organizationId).order('created_at',{ascending:false}).limit(100)
   :Promise.resolve({data:[],error:null}),
 ]);
 if(staff.error||projects.error||opportunities.error)throw new Error('Task form unavailable');
 return {
  staff:(staff.data??[]).map(x=>({id:String(x.id),name:String(x.display_name)})),
  projects:(projects.data??[]).map(x=>({id:String(x.id),name:String(x.name)})),
  opportunities:(opportunities.data??[]).map(x=>({id:String(x.id),name:String(x.title)})),member,
 };
}
