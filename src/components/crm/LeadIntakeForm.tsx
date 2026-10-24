'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitLead, type LeadSubmissionState } from '@/app/prospectos/actions';
const defaultLeadState:LeadSubmissionState={kind:'idle',message:''};

const STORE_KEY='andrai-os:pending-lead-ids:v1';
type IdPair={clientId:string;opportunityId:string};
function fresh():IdPair {
  return {clientId:crypto.randomUUID(),opportunityId:crypto.randomUUID()};
}
function validPair(value:unknown):value is IdPair {
  return typeof value==='object' && value!==null &&
    'clientId' in value && 'opportunityId' in value &&
    typeof value.clientId==='string' && typeof value.opportunityId==='string' &&
    /^[0-9a-f-]{36}$/i.test(value.clientId) && /^[0-9a-f-]{36}$/i.test(value.opportunityId);
}
export function LeadIntakeForm({enabled}:{enabled:boolean}) {
  const [state, action, pending]=useActionState(submitLead,defaultLeadState);
  const [ids,setIds]=useState<IdPair|null>(null);
  const formRef=useRef<HTMLFormElement>(null);
  const router=useRouter();

  useEffect(()=>{
    let value:IdPair;
    try {
      const stored=sessionStorage.getItem(STORE_KEY);
      const decoded:unknown=stored?JSON.parse(stored):null;
      value=validPair(decoded)?decoded:fresh();
      sessionStorage.setItem(STORE_KEY,JSON.stringify(value));
    } catch {
      value=fresh();
    }
    const frame=window.requestAnimationFrame(()=>setIds(value));
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{
    if(state.kind!=='success') return;
    const frame=window.requestAnimationFrame(()=>{
      formRef.current?.reset();
      try {sessionStorage.removeItem(STORE_KEY);} catch {/* private browsing */}
      const next=fresh();
      try {sessionStorage.setItem(STORE_KEY,JSON.stringify(next));} catch {/* private browsing */}
      setIds(next);
      router.refresh();
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[state.kind,router]);

  return <section className="panel intake-panel" aria-labelledby="crm-add-title">
    <div className="panel-head">
      <div><h2 id="crm-add-title">Nueva oportunidad</h2><p>Cliente y oportunidad en una sola operación segura.</p></div>
      <span className={enabled?'crm-write-enabled':'crm-write-disabled'}>{enabled?'Piloto habilitado':'Altas en espera de QA'}</span>
    </div>
    {!enabled && <p className="crm-disabled-note">La captura está preparada, pero las escrituras están desactivadas. No se guardarán datos hasta aprobar el inicio de sesión y las pruebas completas.</p>}
    <form ref={formRef} action={action} className="crm-form">
      <input type="hidden" name="client_id" value={ids?.clientId??''} readOnly />
      <input type="hidden" name="opportunity_id" value={ids?.opportunityId??''} readOnly />
      <fieldset disabled={!enabled||pending||!ids} className="crm-fields">
        <div className="crm-form-grid">
          <label>Empresa o cliente *<input name="client_name" required minLength={2} maxLength={160} placeholder="Nombre comercial" /></label>
          <label>Persona de contacto<input name="contact_name" maxLength={160} placeholder="Nombre de contacto" /></label>
          <label>Correo de contacto<input name="email" type="email" maxLength={254} placeholder="correo@empresa.com" /></label>
          <label>Teléfono<input name="phone" type="tel" maxLength={64} placeholder="Teléfono de contacto" /></label>
          <label>Origen<select name="source" defaultValue="Prospección">{['Prospección','Doce Diez','Referido','Sitio web','Otro'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Valor estimado (MXN)<input name="amount_mxn" inputMode="decimal" defaultValue="0.00" pattern="[0-9]+(\.[0-9]{1,2})?" placeholder="6500.00"/></label>
          <label className="crm-full">Nombre de oportunidad *<input name="title" minLength={2} maxLength={160} required placeholder="Sitio corporativo · Ejemplo" /></label>
          <label className="crm-full">Siguiente acción *<input name="next_action" minLength={3} maxLength={240} required placeholder="Enviar propuesta, agendar reunión..." /></label>
          <label>Fecha de seguimiento *<input name="next_action_on" type="date" required /></label>
        </div>
        <div className="crm-form-footer">
          <button type="submit" className="crm-submit" disabled={!enabled||pending||!ids}>{pending?'Guardando...':'Registrar prospecto ↗'}</button>
          <span>Las modificaciones quedan sujetas a permisos y auditoría.</span>
        </div>
      </fieldset>
    </form>
    {state.message && <p className={state.kind==='success'?'crm-form-success':'crm-form-feedback'} role="status">{state.message}</p>}
  </section>;
}
