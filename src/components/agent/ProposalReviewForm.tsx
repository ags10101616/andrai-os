'use client';
import {useActionState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {reviewSuggestion,type ProposalReviewState} from '@/app/jose-luis/actions';

const initial:ProposalReviewState={status:'idle',message:''};
export function ProposalReviewForm({id,revision,enabled}:{
 id:string;revision:number;enabled:boolean;
}){
 const [state,action,pending]=useActionState(reviewSuggestion,initial);
 const router=useRouter();
 useEffect(()=>{
  if(state.status!=='approved'&&state.status!=='rejected')return;
  router.refresh();
 },[state.status,router]);
 const canSubmit=enabled&&!pending;
 return <form action={action} className="proposal-review-form">
  <input type="hidden" name="proposal_id" value={id} readOnly/>
  <input type="hidden" name="revision" value={revision} readOnly/>
  <fieldset disabled={!canSubmit}>
   <label htmlFor={'review-'+id}>Motivo de la decisión (obligatorio)
    <textarea id={'review-'+id} name="review_note" rows={3} minLength={10} maxLength={600}
      placeholder="Por qué se aprueba como idea o se descarta" required/>
   </label>
   <div className="proposal-review-buttons">
    <button name="decision" value="approved" type="submit" disabled={!canSubmit}>
      {pending?'Procesando…':'Aprobar idea'}
    </button>
    <button name="decision" value="rejected" type="submit" disabled={!canSubmit}>
      Descartar
    </button>
   </div>
  </fieldset>
  {!enabled&&<p className="proposal-form-muted">Decisiones bloqueadas hasta aprobar el piloto.</p>}
  {state.message&&<p role="status" className={state.status==='approved'||state.status==='rejected'?'proposal-form-ok':'proposal-form-error'}>{state.message}</p>}
 </form>;
}
