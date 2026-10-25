'use server';
import {revalidatePath} from 'next/cache';
import {isPilotReadOnly} from '@/lib/release/gates';
import {requireMembership} from '@/lib/auth/session';
import {createServerSupabase} from '@/lib/auth/server';
import {isUuid} from '@/lib/data/ops-validation';

export type ProposalReviewState={
 status:'idle'|'approved'|'rejected'|'error'|'disabled';message:string;
};
function str(form:FormData,key:string,max:number):string|null{
 const v=form.get(key);
 return typeof v==='string'&&v.length<=max?v.trim():null;
}
export async function reviewSuggestion(
 prev:ProposalReviewState,form:FormData
):Promise<ProposalReviewState>{
 if(isPilotReadOnly()||process.env.OS13_OWNER_REVIEWS_ENABLED!=='true')
  return {status:'disabled',message:'La revisión todavía está cerrada en el piloto de solo lectura.'};
 const member=await requireMembership('jose-luis');
 if(member.role!=='owner')
  return {status:'error',message:'Solo Dirección puede revisar propuestas.'};
 const id=str(form,'proposal_id',40);
 const revisionText=str(form,'revision',8);
 const decision=str(form,'decision',9);
 const note=str(form,'review_note',600);
 const revision=Number(revisionText);
 if(!isUuid(id)||!Number.isInteger(revision)||revision<1||
  revision>2147483647||(decision!=='approved'&&decision!=='rejected')||
  note===null||note.length<10||/[\x00-\x1f\x7f]/.test(note))
  return {status:'error',message:'Revisa la propuesta, versión, decisión y justificación.'};
 try{
  const db=await createServerSupabase();
  const {data,error}=await db.rpc('os13_review_proposal_v1',{
   p_id:id,p_revision:revision,p_decision:decision,p_review_note:note,
  }).single();
  if(error){
   if(error.code==='40001')return {status:'error',message:'La propuesta ya cambió de estado. Actualiza la página antes de revisarla.'};
   if(error.code==='42501')return {status:'disabled',message:'No está permitido revisar esta propuesta en el estado actual.'};
   if(error.code==='22023')return {status:'error',message:'La decisión no supera la validación.'};
   throw error;
  }
  if(!data||data.new_status!==decision)
   throw new Error('Unexpected review result');
  revalidatePath('/jose-luis');
  revalidatePath('/agente');
  return {
   status:decision,
   message:decision==='approved'
    ?'Idea aprobada y auditada. No se ejecutó ninguna acción.'
    :'Idea descartada y auditada. No se ejecutó ninguna acción.'
  };
 }catch{
  return {status:'error',message:'No se pudo guardar la decisión. Consulta el estado actualizado antes de reintentar.'};
 }
}
