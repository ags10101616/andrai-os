'use client';
import { useActionState } from 'react';
import { setTaskDoneAction,type TaskActionState } from '@/app/tareas/actions';

const initial:TaskActionState={status:'idle',message:''};
export function TaskStatusForm({id,revision,done,enabled}:{
 id:string;revision:number;done:boolean;enabled:boolean;
}){
 const [state,action,pending]=useActionState(setTaskDoneAction,initial);
 return <form action={action} className="ops-status-form">
  <input type="hidden" name="task_id" value={id}/>
  <input type="hidden" name="revision" value={revision}/>
  <input type="hidden" name="done" value={String(!done)}/>
  <button type="submit" className="ops-mini-button" disabled={!enabled||pending}>
   {pending?'Guardando…':done?'Reabrir ↺':'Marcar lista ✓'}
  </button>
  {state.message&&<p className="ops-inline-message" role="status">{state.message}</p>}
 </form>;
}
