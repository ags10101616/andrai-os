'use client';
import { useActionState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { transitionQuoteAction,type QuoteActionState } from '@/app/cotizaciones/actions';
import type { QuoteAction } from '@/lib/quotes/model';

const initial:QuoteActionState={kind:'idle',message:''};
export function QuoteTransitionForm({quoteId,revision,actionType,label,enabled,notice}:{
 quoteId:string;revision:number;actionType:QuoteAction;label:string;
 enabled:boolean;notice?:string;
}){
 const [state,action,pending]=useActionState(transitionQuoteAction,initial);
 const router=useRouter();
 useEffect(()=>{
  if(state.kind==='success')router.refresh();
 },[state.kind,router]);
 return <form action={action} className="quote-transition">
  <input type="hidden" name="quote_id" value={quoteId} />
  <input type="hidden" name="revision" value={revision} />
  <input type="hidden" name="action" value={actionType} />
  <button type="submit" disabled={!enabled||pending} className="ops-mini-button">
   {pending?'Actualizando…':label}
  </button>
  {notice&&<small>{notice}</small>}
  {state.message&&<p role="status" className={state.kind==='success'?'ops-form-success':'ops-form-error'}>{state.message}</p>}
 </form>;
}
