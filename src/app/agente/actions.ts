'use server';

import {revalidatePath} from 'next/cache';
import {isPilotReadOnly} from '@/lib/release/gates';
import {requireAgentSession} from '@/lib/agent/session';
import {createServerSupabase} from '@/lib/auth/server';
import {isProposalKind} from '@/lib/agent/proposals/model';
import {isUuid} from '@/lib/data/ops-validation';

export type ProposalSubmitState={
 status:'idle'|'success'|'disabled'|'error';message:string;id?:string;
};
function str(form:FormData,key:string,max:number):string|null{
 const v=form.get(key);
 return typeof v==='string'&&v.length<=max?v.trim():null;
}
export async function submitSuggestion(
 previous:ProposalSubmitState,form:FormData
):Promise<ProposalSubmitState>{
 if(isPilotReadOnly()||process.env.OS13_AGENT_PROPOSALS_ENABLED!=='true')
  return {status:'disabled',message:'La recepción de propuestas está desactivada durante el piloto.'};
 await requireAgentSession();
 const id=str(form,'request_id',40);
 const kind=str(form,'kind',20);
 const summary=str(form,'summary',180);
 const rationale=str(form,'rationale',1000);
 const nextStep=str(form,'suggested_next_step',600);
 if(!isUuid(id)||!isProposalKind(kind)||
  summary===null||summary.length<8||
  rationale===null||rationale.length<20||
  nextStep===null||nextStep.length<8||
  [summary,rationale,nextStep].some(s=>/[\x00-\x1f\x7f]/.test(s)))
  return {status:'error',message:'Revisa el tipo, título, justificación y siguiente paso sugerido.'};
 try{
  const db=await createServerSupabase();
  const {data,error}=await db.rpc('os13_submit_proposal_v1',{
   p_id:id,p_kind:kind,p_summary:summary,p_rationale:rationale,
   p_next_step:nextStep
  }).single();
  if(error){
   if(error.code==='42501')return {status:'disabled',message:'La cuenta no tiene permiso para entregar propuestas todavía.'};
   if(error.code==='54000')return {status:'error',message:'Alcanzaste el límite de ocho propuestas del día.'};
   if(error.code==='23505')return {status:'error',message:'Este identificador ya pertenece a otra propuesta. No se duplicó.'};
   if(error.code==='22023')return {status:'error',message:'La propuesta no cumple los límites de validación.'};
   throw error;
  }
  if(!data||typeof data!=='object'||!('proposal_id' in data)||
   typeof data.proposal_id!=='string')throw new Error('Malformed submit result');
  revalidatePath('/agente');
  revalidatePath('/jose-luis');
  return {
   status:'success',id:data.proposal_id,
   message:'Sugerencia guardada para revisión de Dirección. No se ejecutó ninguna acción.'
  };
 }catch{
  return {status:'error',message:'No pudimos guardar la sugerencia. Reintenta conservando el mismo identificador.'};
 }
}
