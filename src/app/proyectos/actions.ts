'use server';
import { revalidatePath } from 'next/cache';
import { requireMembership } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';
import { parseMxAmountMinor } from '@/lib/data/money';
import { isUuid,isISODate,isRevision,isProjectStage } from '@/lib/data/ops-validation';

export type ProjectActionState={status:'idle'|'success'|'error'|'disabled';message:string;completedId?:string};
function field(form:FormData,key:string,max:number):string|null {
 const value=form.get(key);
 return typeof value==='string'&&value.length<=max?value.trim():null;
}
function canWrite():boolean{return process.env.OS06_OPERATIONS_WRITES_ENABLED==='true';}

export async function createProjectAction(_previous:ProjectActionState,form:FormData):Promise<ProjectActionState>{
 if(!canWrite())return {status:'disabled',message:'Las escrituras permanecen desactivadas hasta aprobar el piloto.'};
 const member=await requireMembership('proyectos');
 if(member.role!=='owner')return {status:'error',message:'Solo Dirección puede crear proyectos.'};
 const id=field(form,'project_id',40),clientId=field(form,'client_id',40);
 const name=field(form,'name',160),date=field(form,'due_on',10);
 const assignee=field(form,'assignee_id',40);
 const amount=parseMxAmountMinor(form.get('amount_mxn'));
 if(!isUuid(id)||!isUuid(clientId)||!name||name.length<2||
 (date!==''&&!isISODate(date))||assignee===null||(assignee!==''&&!isUuid(assignee))||
 amount===null)return {status:'error',message:'Revisa cliente, nombre, monto, fecha y responsable.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os06_create_project_v1',{
   p_id:id,p_client_id:clientId,p_name:name,p_due_on:date||null,
   p_assignee_id:assignee||null,p_amount_minor:amount,
  });
  if(error)throw error;
  revalidatePath('/proyectos');
  return {status:'success',message:'Proyecto registrado correctamente.',completedId:id};
 }catch{return {status:'error',message:'No se pudo guardar el proyecto. Reintenta con el mismo identificador.'};}
}

export async function changeProjectStageAction(_previous:ProjectActionState,form:FormData):Promise<ProjectActionState>{
 if(!canWrite())return {status:'disabled',message:'Los cambios de etapa están desactivados en esta preview.'};
 const member=await requireMembership('proyectos');
 if(!['owner','production'].includes(member.role))return {status:'error',message:'Sin permisos para cambiar proyectos.'};
 const id=field(form,'project_id',40),v=field(form,'revision',15),
 stage=field(form,'stage',30),progress=field(form,'progress',4);
 const rev=Number(v),percent=Number(progress);
 if(!isUuid(id)||!isRevision(rev)||!isProjectStage(stage)||
 progress===null||progress===''||!Number.isInteger(percent)||percent<0||percent>100)
  return {status:'error',message:'Etapa, porcentaje o revisión inválidos.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os06_set_project_stage_v1',{
   p_id:id,p_revision:rev,p_stage:stage,p_progress:percent,
  });
  if(error){
   if(error.code==='40001')return {status:'error',message:'El proyecto cambió desde otra sesión. Recarga antes de guardar.'};
   if(error.code==='22023')return {status:'error',message:'Avanza una etapa a la vez; Entregado requiere 100%.'};
   throw error;
  }
  revalidatePath('/proyectos');
  return {status:'success',message:'Etapa actualizada.'};
 }catch{return {status:'error',message:'No se pudo actualizar el proyecto. Verifica tus permisos y reintenta.'};}
}
