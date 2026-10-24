'use client';
import { useActionState,useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordManualMovement,type FinanceActionState } from '@/app/finanzas/actions';
import {
 financeEntryTypes,financeEntryLabels,financeMethods,financeMethodLabels,
 type FinanceEntryType,type FinanceOption
} from '@/lib/finance/model';

const KEY='andrai-os:os08-manual-entry-id';
const initial:FinanceActionState={kind:'idle',message:''};

export function ManualEntryForm({
 enabled,quotes,projects,
}:{
 enabled:boolean;quotes:FinanceOption[];projects:FinanceOption[];
}){
 const [state,action,pending]=useActionState(recordManualMovement,initial);
 const [id,setId]=useState<string|null>(null);
 const [entryType,setEntryType]=useState<FinanceEntryType>('receipt');
 const [quoteId,setQuoteId]=useState('');
 const ref=useRef<HTMLFormElement>(null);
 const router=useRouter();
 useEffect(()=>{
  let next:string;
  try{
   const saved=sessionStorage.getItem(KEY);
   next=saved&&/^[0-9a-f-]{36}$/i.test(saved)?saved:crypto.randomUUID();
   sessionStorage.setItem(KEY,next);
  }catch{next=crypto.randomUUID();}
  const raf=requestAnimationFrame(()=>setId(next));
  return ()=>cancelAnimationFrame(raf);
 },[]);
 useEffect(()=>{
  if(state.kind!=='success'||!state.entryId)return;
  const raf=requestAnimationFrame(()=>{
   const next=crypto.randomUUID();
   try{sessionStorage.setItem(KEY,next);}catch{/* Private browsing */}
   ref.current?.reset();
   setId(next);setEntryType('receipt');setQuoteId('');
   router.refresh();
  });
  return ()=>cancelAnimationFrame(raf);
 },[state.kind,state.entryId,router]);
 const canSubmit=enabled&&Boolean(id)&&!pending;
 const availableQuotes=quotes.filter(q=>entryType==='refund' ||
   (q.status==='sent'||q.status==='accepted'));
 const canLinkQuote=entryType!=='expense';
 return <section className="panel" aria-labelledby="new-finance-entry">
  <div className="panel-head">
   <div><h2 id="new-finance-entry">Registrar movimiento</h2>
    <p>Libro interno en MXN. Registro manual, sin conexión con bancos ni procesamiento de tarjetas.</p>
   </div>
   <span className={enabled?'ops-active-pill':'ops-locked-pill'}>
    {enabled?'Piloto habilitado':'Movimientos bloqueados'}
   </span>
  </div>
  {!enabled&&<p className="ops-note">Por seguridad, las escrituras están desactivadas en esta preview. Los campos se habilitarán después de probar las sesiones y permisos reales.</p>}
  <form ref={ref} action={action}>
   <input type="hidden" name="entry_id" value={id??''} readOnly/>
   <fieldset className="ops-fields" disabled={!canSubmit}>
    <div className="ops-fields-grid">
     <label>Tipo de movimiento *
      <select name="entry_type" value={entryType} onChange={e=>{
       setEntryType(e.target.value as FinanceEntryType);setQuoteId('');
      }}>
       {financeEntryTypes.map(type=><option key={type} value={type}>{financeEntryLabels[type]}</option>)}
      </select>
     </label>
     <label>Importe (MXN) *
      <input name="amount_mxn" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?"
       placeholder="4500.00" required/>
     </label>
     <label>Medio registrado *
      <select name="method" defaultValue="transfer">
       {financeMethods.map(method=><option key={method} value={method}>{financeMethodLabels[method]}</option>)}
      </select>
     </label>
     <label>Fecha del movimiento *
      <input name="happened_on" type="date" required/>
     </label>
     <label className="ops-col-full">Referencia verificable *
      <input name="reference" minLength={2} maxLength={200} required
       placeholder="Referencia bancaria o folio interno de conciliación"/>
     </label>
     <label>Vincular con cotización{entryType==='refund'?' *':''}
      <select name="quote_id" required={entryType==='refund'} disabled={!canLinkQuote}
       value={canLinkQuote?quoteId:''} onChange={e=>setQuoteId(e.target.value)}>
       <option value="">Sin cotización</option>
       {availableQuotes.map(quote=><option key={quote.id} value={quote.id}>
        {quote.name} · {quote.status==='accepted'?'Aceptada':quote.status==='sent'?'Enviada':'Rechazada'}
       </option>)}
      </select>
     </label>
     <label>Proyecto (solo sin cotización)
      <select key={quoteId} name="project_id" defaultValue="" disabled={!!quoteId}>
       <option value="">Sin proyecto</option>
       {projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
     </label>
     <label className="ops-col-full">Nota interna
      <textarea name="note" rows={3} maxLength={1500}
       placeholder="Contexto del anticipo, gasto o devolución"/>
     </label>
    </div>
    <div className="ops-form-footer">
     <button type="submit" className="ops-button" disabled={!canSubmit}>
      {pending?'Registrando…':'Registrar movimiento ↗'}
     </button>
     <span>Solo Dirección puede guardar. Los registros son inmutables.</span>
    </div>
   </fieldset>
  </form>
  {state.message&&<p role="status"
   className={state.kind==='success'?'ops-form-success':'ops-form-error'}>
   {state.message}
  </p>}
 </section>;
}
