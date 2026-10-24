'use client';
import { useActionState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateDraftQuoteAction,type QuoteActionState } from '@/app/cotizaciones/actions';
import { QuoteLinesEditor } from './QuoteLinesEditor';
import type { QuoteDetail } from '@/lib/quotes/model';

const initial:QuoteActionState={kind:'idle',message:''};
export function QuoteDraftForm({quote,enabled}:{quote:QuoteDetail;enabled:boolean}){
 const [state,action,pending]=useActionState(updateDraftQuoteAction,initial);
 const router=useRouter();
 useEffect(()=>{
  if(state.kind!=='success')return;
  router.refresh();
 },[state.kind,router]);
 return <section className="panel quote-editor" aria-labelledby="quote-edit-title">
  <div className="panel-head"><div><h2 id="quote-edit-title">Editar borrador · V{quote.version}</h2>
   <p>Los cambios quedan auditados. Se crea una fotografía inmutable al solicitar revisión.</p></div>
   <span className={enabled?'ops-active-pill':'ops-locked-pill'}>{enabled?'Edición habilitada':'Edición desactivada'}</span></div>
  <form action={action}>
   <input type="hidden" name="quote_id" value={quote.id} />
   <input type="hidden" name="revision" value={quote.revision} />
   <fieldset className="ops-fields" disabled={!enabled||pending}>
    <div className="ops-fields-grid">
     <label className="ops-col-full">Título *<input name="title" minLength={2} maxLength={180}
       required defaultValue={quote.title}/></label>
    </div>
    <QuoteLinesEditor initialLines={quote.lines} disabled={!enabled||pending}/>
    <div className="ops-fields-grid">
     <label>IVA<select name="tax_rate_bps" defaultValue={String(quote.taxRateBps)}>
      <option value="1600">IVA 16 %</option><option value="0">IVA 0 % (revisar aplicabilidad)</option>
     </select></label>
     <label>Vigencia<input type="date" name="valid_until" defaultValue={quote.validUntil??''}/></label>
     <label className="ops-col-full">Condiciones y alcance<textarea name="notes" rows={4}
      maxLength={3000} defaultValue={quote.notes}/></label>
    </div>
    <div className="ops-form-footer"><button className="ops-button" type="submit" disabled={!enabled||pending}>
     {pending?'Guardando…':'Guardar cambios ↗'}</button>
     <span>Versión de edición: {quote.revision}</span></div>
   </fieldset>
  </form>
  {state.message&&<p role="status" className={state.kind==='success'?'ops-form-success':'ops-form-error'}>
   {state.message}</p>}
 </section>;
}
