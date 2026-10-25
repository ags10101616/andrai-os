'use client';
import {useActionState,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {submitSuggestion,type ProposalSubmitState} from '@/app/agente/actions';
import {proposalKinds,proposalLabels} from '@/lib/agent/proposals/model';

const storageKey='andrai-os:os13-proposal-submit-id';
const initial:ProposalSubmitState={status:'idle',message:''};

export function ProposalDraftForm({enabled}:{enabled:boolean}){
 const [state,formAction,pending]=useActionState(submitSuggestion,initial);
 const [requestId,setRequestId]=useState('');
 const ref=useRef<HTMLFormElement>(null);
 const router=useRouter();
 useEffect(()=>{
  let id='';
  try{
   const saved=sessionStorage.getItem(storageKey);
   id=saved&&/^[0-9a-f-]{36}$/i.test(saved)?saved:crypto.randomUUID();
   sessionStorage.setItem(storageKey,id);
  }catch{id=crypto.randomUUID();}
  const raf=requestAnimationFrame(()=>setRequestId(id));
  return ()=>cancelAnimationFrame(raf);
 },[]);
 useEffect(()=>{
  if(state.status!=='success'||!state.id)return;
  const raf=requestAnimationFrame(()=>{
   const id=crypto.randomUUID();
   try{sessionStorage.setItem(storageKey,id);}catch{/* private browser */}
   setRequestId(id);ref.current?.reset();router.refresh();
  });
  return ()=>cancelAnimationFrame(raf);
 },[state.status,state.id,router]);
 const canSubmit=enabled&&requestId.length===36&&!pending;
 return <section className="agent-portal-panel proposal-agent-form">
  <div className="eyebrow">OS-13 / PROPUESTA SUPERVISADA</div>
  <h2>Comparte una recomendación</h2>
  <p>Las propuestas son sugerencias para Dirección. No pueden ejecutar tareas, alterar el CRM, contactar clientes o registrar movimientos.</p>
  {!enabled&&<p className="proposal-safety-warning" role="status">La recepción de propuestas sigue cerrada. Es una vista anticipada para revisar el formato.</p>}
  <form ref={ref} action={formAction} className="proposal-form">
   <input type="hidden" name="request_id" value={requestId} readOnly/>
   <fieldset disabled={!canSubmit} className="proposal-fields">
    <label>Tipo de sugerencia
     <select name="kind" defaultValue="alert">
      {proposalKinds.map(kind=><option key={kind} value={kind}>{proposalLabels[kind]}</option>)}
     </select>
    </label>
    <label>Título breve
     <input name="summary" minLength={8} maxLength={180} required
       placeholder="Ej. Revisar las prioridades de esta semana"/>
    </label>
    <label>¿Por qué es importante?
     <textarea name="rationale" minLength={20} maxLength={1000} required rows={4}
       placeholder="Describe el problema usando únicamente información autorizada."/>
    </label>
    <label>Siguiente paso recomendado
     <textarea name="suggested_next_step" minLength={8} maxLength={600}
       rows={3} required placeholder="Acción que Dirección debe evaluar."/>
    </label>
    <button className="auth-submit" type="submit" disabled={!canSubmit}>
      {pending?'Guardando…':'Enviar a revisión ↗'}
    </button>
   </fieldset>
  </form>
  {state.message&&<p className={state.status==='success'?'proposal-form-ok':'proposal-form-error'} role="status">{state.message}</p>}
 </section>;
}
