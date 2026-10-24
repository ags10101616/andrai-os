'use server';

import { isPilotReadOnly } from '@/lib/release/gates';
import { revalidatePath } from 'next/cache';
import { requireMembership } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';
import { isRevision, isISODate } from '@/lib/data/ops-validation';
import { isQuoteId, isQuoteAction, parseQuoteLines, type QuoteAction } from '@/lib/quotes/model';

export type QuoteActionState={
 kind:'idle'|'success'|'error'|'disabled';
 message:string;
 quoteId?:string;
};
function stringField(form:FormData,name:string,max:number):string|null{
 const value=form.get(name);
 return typeof value==='string'&&value.length<=max?value.trim():null;
}
function writeEnabled():boolean{
 return !isPilotReadOnly()&&process.env.OS07_QUOTES_WRITES_ENABLED==='true';
}
function parseDraft(form:FormData){
 const title=stringField(form,'title',180);
 const notes=stringField(form,'notes',3000);
 const lineText=stringField(form,'lines',30000);
 const taxText=stringField(form,'tax_rate_bps',4);
 const validUntil=stringField(form,'valid_until',10);
 const lines=parseQuoteLines(lineText);
 const taxRateBps=taxText==='0'?0:taxText==='1600'?1600:null;
 if(!title||title.length<2||notes===null||!lines||taxRateBps===null||
   validUntil===null||(validUntil!==''&&!isISODate(validUntil))) return null;
 return {title,notes,lines,taxRateBps,validUntil:validUntil||null};
}
function failure():QuoteActionState{
 return {kind:'error',message:'No fue posible guardar la cotización. Revisa los datos y, si hubo un corte de red, vuelve a intentar.'};
}
export async function createQuoteAction(_prior:QuoteActionState,form:FormData):Promise<QuoteActionState>{
 if(!writeEnabled()) return {kind:'disabled',message:'La creación sigue desactivada hasta aprobar el piloto.'};
 await requireMembership('cotizaciones');
 const quoteId=stringField(form,'quote_id',40);
 const clientId=stringField(form,'client_id',40);
 const projectId=stringField(form,'project_id',40);
 const draft=parseDraft(form);
 if(!isQuoteId(quoteId)||!isQuoteId(clientId)||projectId===null||
   (projectId!==''&&!isQuoteId(projectId))||!draft)
  return {kind:'error',message:'Completa correctamente el cliente, conceptos, cantidades, IVA y vigencia.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os07_create_quote_v1',{
   p_id:quoteId,p_client_id:clientId,p_project_id:projectId||null,
   p_title:draft.title,p_lines:draft.lines,
   p_tax_rate_bps:draft.taxRateBps,p_valid_until:draft.validUntil,p_notes:draft.notes,
  });
  if(error)throw error;
  revalidatePath('/cotizaciones');
  return {kind:'success',quoteId,message:'Borrador creado. Puedes abrirlo y enviarlo a revisión.'};
 }catch{return failure();}
}

export async function updateDraftQuoteAction(_prior:QuoteActionState,form:FormData):Promise<QuoteActionState>{
 if(!writeEnabled())return {kind:'disabled',message:'Las ediciones siguen desactivadas en esta preview.'};
 await requireMembership('cotizaciones');
 const quoteId=stringField(form,'quote_id',40);
 const rev=Number(stringField(form,'revision',15));
 const draft=parseDraft(form);
 if(!isQuoteId(quoteId)||!isRevision(rev)||!draft)
  return {kind:'error',message:'Datos de revisión o conceptos inválidos.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os07_replace_draft_v1',{
   p_id:quoteId,p_revision:rev,p_title:draft.title,
   p_lines:draft.lines,p_tax_rate_bps:draft.taxRateBps,
   p_valid_until:draft.validUntil,p_notes:draft.notes,
  });
  if(error){
   if(error.code==='40001')return {kind:'error',message:'Otra sesión actualizó este borrador. Recarga la cotización antes de continuar.'};
   throw error;
  }
  revalidatePath('/cotizaciones');
  revalidatePath('/cotizaciones/'+quoteId);
  return {kind:'success',quoteId,message:'Borrador actualizado.'};
 }catch{return failure();}
}

export async function transitionQuoteAction(_prior:QuoteActionState,form:FormData):Promise<QuoteActionState>{
 if(!writeEnabled())return {kind:'disabled',message:'Los cambios de estado permanecen desactivados.'};
 const member=await requireMembership('cotizaciones');
 const quoteId=stringField(form,'quote_id',40);
 const action=stringField(form,'action',12);
 const revision=Number(stringField(form,'revision',15));
 if(!isQuoteId(quoteId)||!isRevision(revision)||!isQuoteAction(action))
  return {kind:'error',message:'Acción o versión inválida.'};
 const ownerActions:readonly QuoteAction[]=['approve','sent','accept','reject'];
 if(ownerActions.includes(action)&&member.role!=='owner')
  return {kind:'error',message:'Esta decisión requiere autorización de Dirección.'};
 try{
  const db=await createServerSupabase();
  const {error}=await db.rpc('os07_transition_v1',{
   p_id:quoteId,p_revision:revision,p_action:action,
  });
  if(error){
   if(error.code==='40001')return {kind:'error',message:'La cotización cambió. Recarga antes de tomar otra decisión.'};
   throw error;
  }
  revalidatePath('/cotizaciones');
  revalidatePath('/cotizaciones/'+quoteId);
  const messages:Record<QuoteAction,string>={
   submit:'Versión enviada a revisión interna y conservada en el historial.',
   revise:'Borrador reabierto en una nueva versión; el historial se conserva.',
   approve:'Cotización aprobada por Dirección.',
   sent:'Se registró manualmente como enviada. La plataforma NO mandó correos.',
   accept:'Se registró manualmente la aceptación. Esto NO es una firma electrónica.',
   reject:'Se registró manualmente el rechazo.',
  };
  return {kind:'success',quoteId,message:messages[action]};
 }catch{return {kind:'error',message:'No se pudo cambiar de estado. Verifica los permisos y el flujo.'};}
}
