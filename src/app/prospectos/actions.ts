'use server';

import { isPilotReadOnly } from '@/lib/release/gates';
import { revalidatePath } from 'next/cache';
import { createLeadAtomic } from '@/lib/data/leads';
import {createServerSupabase} from '@/lib/auth/server';
import {requireMembership} from '@/lib/auth/session';
import {isPipelineStage} from '@/lib/data/pipeline';
import {isISODate,isUuid} from '@/lib/data/ops-validation';
import { parseMxAmountMinor } from '@/lib/data/money';

export type LeadSubmissionState = { kind:'idle'|'error'|'success'|'disabled';message:string };
const sources=['Doce Diez','Prospección','Referido','Sitio web','Otro'];

function str(data:FormData,key:string,max:number):string|null {
  const value=data.get(key);
  if(typeof value!=='string'||value.length>max) return null;
  return value.trim();
}
export async function submitLead(_previous:LeadSubmissionState,form:FormData):Promise<LeadSubmissionState> {
  // Always disabled by default; this is a REVIEWABLE PREVIEW, not a live CRM launch.
  if(isPilotReadOnly()||process.env.OS05_CRM_WRITES_ENABLED!=='true'){
    return {kind:'disabled',message:'Las altas están bloqueadas hasta la validación del piloto.'};
  }
  const clientId=str(form,'client_id',40),opportunityId=str(form,'opportunity_id',40);
  const clientName=str(form,'client_name',160),contactName=str(form,'contact_name',160);
  const email=str(form,'email',254),phone=str(form,'phone',64),source=str(form,'source',80);
  const title=str(form,'title',160),nextAction=str(form,'next_action',240),nextActionOn=str(form,'next_action_on',10);
  const amountMinor=parseMxAmountMinor(form.get('amount_mxn'));
  if(!clientId||!opportunityId||!clientName||clientName.length<2||!title||title.length<2||
    !nextAction||nextAction.length<3||!nextActionOn||amountMinor===null||contactName===null||
    email===null||phone===null||!source||!sources.includes(source)){
    return {kind:'error',message:'Revisa los campos y el monto antes de guardar.'};
  }
  if(email && (!email.includes('@') || email.indexOf('@')<1)){
    return {kind:'error',message:'Revisa el correo de contacto.'};
  }
  try {
    await createLeadAtomic({
      clientId,opportunityId,clientName,contactName,email,phone,source,title,
      amountMinor,nextAction,nextActionOn,
    });
    revalidatePath('/prospectos');
    return {kind:'success',message:'Prospecto y oportunidad registrados correctamente.'};
  } catch {
    // Do not leak PostgreSQL internals, existence of clients, or member identifiers.
    return {kind:'error',message:'No pudimos guardar la oportunidad. Puedes reintentar con los mismos identificadores.'};
  }
}


export type OpportunityUpdateState={kind:'idle'|'error'|'success'|'disabled';message:string};

/**
 * First operational editing flow. Uses normal authenticated PostgREST UPDATE
 * with RLS + optimistic timestamp compare, not a SECURITY DEFINER bypass.
 */
export async function updateOpportunityAction(
 _prior:OpportunityUpdateState,form:FormData
):Promise<OpportunityUpdateState>{
 if(isPilotReadOnly()||process.env.OS05_CRM_WRITES_ENABLED!=='true')
  return {kind:'disabled',message:'Los cambios permanecen pausados hasta habilitar el piloto privado.'};
 const member=await requireMembership('prospectos');
 const id=str(form,'opportunity_id',40),updatedAt=str(form,'updated_at',80);
 const stage=str(form,'stage',30),nextAction=str(form,'next_action',240);
 const nextDate=str(form,'next_action_on',10);
 const amount=parseMxAmountMinor(form.get('amount_mxn'));
 if(!isUuid(id)||!updatedAt||!Number.isFinite(Date.parse(updatedAt))||
  !isPipelineStage(stage)||!nextAction||nextAction.length<3||
  !isISODate(nextDate)||amount===null)
  return {kind:'error',message:'Revisa etapa, fecha, importe y siguiente acción.'};
 try{
  const db=await createServerSupabase();
  const {data,error}=await db.from('os_opportunities')
   .update({
    stage,next_action:nextAction,next_action_on:nextDate,amount_minor:amount,
   })
   .eq('id',id).eq('organization_id',member.organizationId)
   .eq('updated_at',updatedAt)
   .select('id,updated_at').maybeSingle();
  if(error)throw error;
  if(!data)return {kind:'error',message:'La oportunidad cambió en otra sesión. Recarga antes de editar.'};
  revalidatePath('/prospectos');revalidatePath('/prospectos/'+id);revalidatePath('/resumen');
  return {kind:'success',message:'Oportunidad y seguimiento actualizados correctamente.'};
 }catch{
  return {kind:'error',message:'No se pudieron guardar los cambios. Revisa tus permisos e inténtalo de nuevo.'};
 }
}
