'use server';

import { isPilotReadOnly } from '@/lib/release/gates';
import { revalidatePath } from 'next/cache';
import { createLeadAtomic } from '@/lib/data/leads';
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
