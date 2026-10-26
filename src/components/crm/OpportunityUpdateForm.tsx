'use client';
import {useActionState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {updateOpportunityAction,type OpportunityUpdateState} from '@/app/prospectos/actions';
import type {OpportunityDetail} from '@/lib/data/pipeline';

const initial:OpportunityUpdateState={kind:'idle',message:''};

/** No optimistic business writes: save feedback is returned from server/RLS first. */
export function OpportunityUpdateForm({opportunity,enabled,stages}:{
 opportunity:OpportunityDetail;enabled:boolean;
 stages:{value:string;label:string}[];
}){
 const [state,action,pending]=useActionState(updateOpportunityAction,initial);
 const router=useRouter();
 useEffect(()=>{
  if(state.kind!=='success')return;
  const frame=window.requestAnimationFrame(()=>router.refresh());
  return ()=>window.cancelAnimationFrame(frame);
 },[state.kind,router]);
 return <section className="panel os16-editor" aria-labelledby="os16-editor-title">
  <div className="panel-head"><div><h2 id="os16-editor-title">Siguiente movimiento</h2>
   <p>Actualiza la etapa, el seguimiento y el importe estimado. Los cambios se auditan.</p>
  </div></div>
  <form action={action}>
   <input name="opportunity_id" type="hidden" value={opportunity.id} readOnly/>
   <input name="updated_at" type="hidden" value={opportunity.updatedAt} readOnly/>
   <fieldset disabled={!enabled||pending} className="os16-editor-fields">
    <label>Etapa comercial
     <select name="stage" defaultValue={opportunity.stage} required>
      {stages.map(stage=><option key={stage.value} value={stage.value}>{stage.label}</option>)}
     </select>
    </label>
    <label>Valor estimado (MXN)
     <input type="text" name="amount_mxn" inputMode="decimal" required
      maxLength={14} defaultValue={(opportunity.amountMinor/100).toFixed(2)}
      pattern="[0-9]+(\.[0-9]{1,2})?"/>
    </label>
    <label className="os16-editor-wide">Siguiente acción
     <input name="next_action" maxLength={240} minLength={3} required
      defaultValue={opportunity.nextAction}/>
    </label>
    <label>Fecha de seguimiento
     <input type="date" name="next_action_on" required defaultValue={opportunity.nextActionOn}/>
    </label>
    <button className="crm-submit" type="submit" disabled={!enabled||pending}>
     {pending?'Guardando…':'Guardar seguimiento ↗'}
    </button>
   </fieldset>
  </form>
  {!enabled&&<p className="crm-disabled-note">La edición se activará cuando la versión privada pase las verificaciones de uso.</p>}
  {state.message&&<p role="status"
   className={state.kind==='success'?'crm-form-success':'crm-form-feedback'}>{state.message}</p>}
  <p className="os16-onboarding-foot">Si otra sesión cambia este registro, el sistema evitará sobrescribirlo hasta que recargues.</p>
 </section>;
}
