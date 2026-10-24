'use client';
import { useActionState } from 'react';
import { changeProjectStageAction,type ProjectActionState } from '@/app/proyectos/actions';
import { projectStages,projectStageLabels,type ProjectStage } from '@/lib/data/ops-validation';

const initial:ProjectActionState={status:'idle',message:''};
export function ProjectStageForm({id,revision,currentStage,progress,enabled}:{
 id:string;revision:number;currentStage:ProjectStage;progress:number;enabled:boolean;
}){
 const [state,action,pending]=useActionState(changeProjectStageAction,initial);
 return <form className="ops-inline-update" action={action}>
  <input type="hidden" name="project_id" value={id}/>
  <input type="hidden" name="revision" value={revision}/>
  <label>Etapa<select name="stage" defaultValue={currentStage} disabled={!enabled||pending}>
    {projectStages.map(stage=><option key={stage} value={stage}>{projectStageLabels[stage]}</option>)}
  </select></label>
  <label>Progreso %<input name="progress" type="number" min="0" max="100" defaultValue={progress} disabled={!enabled||pending}/></label>
  <button type="submit" className="ops-mini-button" disabled={!enabled||pending}>{pending?'Guardando…':'Actualizar'}</button>
  {state.message && <p role="status" className="ops-inline-message">{state.message}</p>}
 </form>;
}
