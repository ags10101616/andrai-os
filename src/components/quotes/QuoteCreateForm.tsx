'use client';
import { useActionState,useEffect,useState,useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createQuoteAction,type QuoteActionState } from '@/app/cotizaciones/actions';
import { QuoteLinesEditor } from './QuoteLinesEditor';
import type { NameOption } from '@/lib/data/operations';

const initial:QuoteActionState={kind:'idle',message:''};
const KEY='andrai-os:os07-draft-uuid:v1';
export function QuoteCreateForm({clients,projects,enabled}:{
 clients:NameOption[];
 projects:Array<NameOption&{clientId:string}>;
 enabled:boolean;
}){
 const [state,action,pending]=useActionState(createQuoteAction,initial);
 const [quoteId,setQuoteId]=useState<string|null>(null);
 const [clientId,setClientId]=useState('');
 const form=useRef<HTMLFormElement>(null);
 const router=useRouter();
 useEffect(()=>{
  let id:string;
  try{
   const prior=sessionStorage.getItem(KEY);
   id=prior&&/^[0-9a-f-]{36}$/i.test(prior)?prior:crypto.randomUUID();
   sessionStorage.setItem(KEY,id);
  }catch{id=crypto.randomUUID();}
  const frame=requestAnimationFrame(()=>setQuoteId(id));
  return ()=>cancelAnimationFrame(frame);
 },[]);
 useEffect(()=>{
  if(state.kind!=='success'||!state.quoteId)return;
  const frame=requestAnimationFrame(()=>{
   form.current?.reset();
   setClientId('');
   const next=crypto.randomUUID();
   try{sessionStorage.setItem(KEY,next)}catch{/* Private browsing */}
   setQuoteId(next);
   router.refresh();
  });
  return ()=>cancelAnimationFrame(frame);
 },[state.kind,state.quoteId,router]);
 const active=enabled&&clients.length>0&&!!quoteId&&!pending;
 return <section className="panel quote-editor" aria-labelledby="quote-create-title">
  <div className="panel-head"><div><h2 id="quote-create-title">Nueva cotización</h2>
    <p>Versión 1 · Borrador privado · Cotización comercial, no factura.</p></div>
    <span className={enabled?'ops-active-pill':'ops-locked-pill'}>{enabled?'Piloto habilitado':'Escrituras desactivadas'}</span></div>
  {!enabled&&<p className="ops-note">Las cotizaciones están preparadas, pero el alta sigue bloqueada hasta validar acceso y permisos. No se enviará información a clientes.</p>}
  {!clients.length&&<p className="ops-note">Primero necesitamos un cliente registrado en el CRM para generar una cotización.</p>}
  <form ref={form} action={action}>
   <input type="hidden" name="quote_id" value={quoteId??''} readOnly />
   <fieldset className="ops-fields" disabled={!active}>
    <div className="ops-fields-grid">
      <label>Cliente *<select name="client_id" value={clientId} required
       onChange={e=>setClientId(e.target.value)}>
       <option value="" disabled>Seleccionar cliente</option>
       {clients.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <label>Proyecto vinculado<select key={clientId} name="project_id" defaultValue="">
       <option value="">Sin proyecto vinculado</option>
       {projects.filter(p=>p.clientId===clientId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
      <label className="ops-col-full">Título de cotización *<input name="title" required minLength={2} maxLength={180}
       placeholder="Sitio web corporativo · Desarrollo integral"/></label>
    </div>
    <QuoteLinesEditor disabled={!active}/>
    <div className="ops-fields-grid">
     <label>Tratamiento IVA *<select name="tax_rate_bps" defaultValue="1600">
       <option value="1600">IVA 16 %</option><option value="0">IVA 0 % (revisar aplicabilidad)</option>
      </select></label>
     <label>Vigencia hasta<input type="date" name="valid_until"/></label>
     <label className="ops-col-full">Condiciones y alcance<textarea name="notes" rows={4} maxLength={3000}
       placeholder="Incluye entregables, revisiones, tiempos de ejecución y condiciones comerciales."/></label>
    </div>
    <div className="ops-form-footer">
     <button className="ops-button" disabled={!active} type="submit">{pending?'Guardando…':'Crear borrador ↗'}</button>
     <span>El sistema calcula subtotales, IVA y total desde cada concepto.</span>
    </div>
   </fieldset>
  </form>
  {state.message&&<p role="status" className={state.kind==='success'?'ops-form-success':'ops-form-error'}>
   {state.message}{state.quoteId&&state.kind==='success'&&<>
     {' '}<Link href={'/cotizaciones/'+state.quoteId}>Abrir cotización ↗</Link>
    </>}</p>}
 </section>;
}
