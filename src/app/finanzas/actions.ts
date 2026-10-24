'use server';
import { revalidatePath } from 'next/cache';
import { requireMembership } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';
import { parseMxAmountMinor } from '@/lib/data/money';
import { isISODate,isUuid } from '@/lib/data/ops-validation';
import { isFinanceEntryType,isFinanceMethod } from '@/lib/finance/model';

export type FinanceActionState={
 kind:'idle'|'success'|'error'|'disabled';
 message:string;entryId?:string;
};
function input(form:FormData,key:string,max:number):string|null{
 const value=form.get(key);
 return typeof value==='string'&&value.length<=max?value.trim():null;
}
export async function recordManualMovement(
 _previous:FinanceActionState,form:FormData
):Promise<FinanceActionState>{
 if(process.env.OS08_FINANCE_WRITES_ENABLED!=='true'){
  return {kind:'disabled',message:'El registro de movimientos continúa desactivado hasta aprobar el piloto.'};
 }
 const member=await requireMembership('finanzas');
 if(member.role!=='owner')return {kind:'error',message:'Solo Dirección puede registrar movimientos.'};

 const id=input(form,'entry_id',40);
 const entryType=input(form,'entry_type',10);
 const amountMinor=parseMxAmountMinor(form.get('amount_mxn'));
 const reference=input(form,'reference',200);
 const method=input(form,'method',10);
 const happenedOn=input(form,'happened_on',10);
 const note=input(form,'note',1500);
 const quoteId=input(form,'quote_id',40);
 const projectId=input(form,'project_id',40);
 if(!isUuid(id)||!isFinanceEntryType(entryType)||!isFinanceMethod(method)||
    amountMinor===null||amountMinor<1||reference===null||reference.length<2||
    !isISODate(happenedOn)||note===null||quoteId===null||projectId===null||
    (quoteId!==''&&!isUuid(quoteId))||(projectId!==''&&!isUuid(projectId))||
    (entryType==='expense'&&!!quoteId)||(entryType==='refund'&&!quoteId)){
  return {kind:'error',message:'Revisa tipo, importe, referencia, fecha y vinculación del movimiento.'};
 }
 try {
  const db=await createServerSupabase();
  const {data,error}=await db.rpc('os08_record_manual_entry_v1',{
   p_id:id,p_type:entryType,p_amount_minor:amountMinor,
   p_reference:reference,p_method:method,p_happened_on:happenedOn,
   p_note:note,p_quote_id:quoteId||null,p_project_id:projectId||null,
  }).single();
  if(error){
   if(error.code==='23505')return {
    kind:'error',message:'El identificador ya corresponde a un movimiento distinto. No se registró otro cobro.'
   };
   if(error.code==='22023')return {
    kind:'error',message:'Movimiento inválido: verifica el saldo, importe, fecha y referencia.'
   };
   if(error.code==='42501')return {
    kind:'error',message:'Movimiento no autorizado o cotización no disponible para registrar cobros.'
   };
   throw error;
  }
  if(!data || typeof data!=='object'||!('entry_id' in data)||
      typeof data.entry_id!=='string')throw new Error('Invalid movement result');
  revalidatePath('/finanzas');
  return {
   kind:'success',entryId:data.entry_id,
   message:'Movimiento registrado manualmente. No implica validación bancaria ni procesamiento de un pago.',
  };
 } catch {
  return {kind:'error',message:'No se pudo registrar el movimiento. Reintenta conservando el mismo identificador.'};
 }
}
