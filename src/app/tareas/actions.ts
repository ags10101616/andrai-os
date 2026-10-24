'use server';
import { revalidatePath } from 'next/cache';
import { requireMembership } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';
import { isUuid,isISODate,isRevision,isTaskKind,isTaskPriority } from '@/lib/data/ops-validation';

export type TaskActionState={status:'idle'|'success'|'error'|'disabled';message:string;completedId?:string};
function field(form:FormData,key:string,max:number):string|null{
 const value=form.get(key);return typeof value==='string'&&value.length<=max?value.trim():null;
}
function canWrite(){return process.env.OS06_OPERATIONS_WRITES_ENABLED==='true';}

export async function createTaskAction(_previous:TaskActionState,form:FormData):Promise<TaskActionState>{
 if(!canWrite())return {status:'disabled',message:'La captura de tareas está desactivada hasta validar el piloto.'};
 const member=await requireMembership('tareas');
 const id=field(form,'task_id',40),title=field(form,'title',180);
 const description=field(form,'description',3000),dueOn=field(form,'due_on',10);
 const association=field(form,'association',60),assignee=field(form,'assignee_id',40);
 const kind=field(form,'kind',20),priority=field(form,'priority',20);
 if(!isUuid(id)||!title||title.length<2||description===null||!isISODate(dueOn)||
  !isTaskKind(kind)||!isTaskPriority(priority)||
  (assignee!==null&&assignee!==''&&!isUuid(assignee))||association===null){
   return {status:'error',message:'Completa título, fecha, tipo, prioridad y responsable válidos.'};
 }
 let projectId:string|null=null,opportunityId:string|null=null;
 if(association && association!=='none'){
  const [linkType,linkId,extra]=association.split(':');
  if(extra||!isUuid(linkId))return {status:'error',message:'Vinculación inválida.'};
  if(linkType==='project')projectId=linkId;
  else if(linkType==='opportunity')opportunityId=linkId;
  else return {status:'error',message:'Tipo de vinculación inválido.'};
 }
 if((member.role==='sales'&&projectId)||(member.role==='production'&&opportunityId))
  return {status:'error',message:'Esa vinculación requiere otros permisos.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os06_create_task_v1',{
   p_id:id,p_title:title,p_description:description,p_due_on:dueOn,
   p_project_id:projectId,p_opportunity_id:opportunityId,
   p_assignee_id:member.role==='owner'?(assignee||null):null,
   p_kind:kind,p_priority:priority,
  });
  if(error)throw error;
  revalidatePath('/tareas');
  revalidatePath('/proyectos');
  return {status:'success',message:'Tarea registrada correctamente.',completedId:id};
 }catch{return {status:'error',message:'No se pudo guardar la tarea. Reintenta sin cambiar su identificador.'};}
}

export async function setTaskDoneAction(_previous:TaskActionState,form:FormData):Promise<TaskActionState>{
 if(!canWrite())return {status:'disabled',message:'La actualización de tareas está desactivada.'};
 await requireMembership('tareas');
 const id=field(form,'task_id',40),revision=field(form,'revision',15),done=field(form,'done',5);
 const rev=Number(revision);
 if(!isUuid(id)||!isRevision(rev)||(done!=='true'&&done!=='false'))
  return {status:'error',message:'Datos de actualización inválidos.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os06_set_task_done_v1',{
   p_id:id,p_revision:rev,p_done:done==='true',
  });
  if(error){
   if(error.code==='40001')return {status:'error',message:'La tarea cambió. Recarga antes de actualizar.'};
   throw error;
  }
  revalidatePath('/tareas');
  revalidatePath('/proyectos');
  return {status:'success',message:done==='true'?'Tarea completada.':'Tarea reabierta.'};
 }catch{return {status:'error',message:'No fue posible actualizar la tarea. Revisa permisos o asignación.'};}
}
