'use client';
import { useActionState,useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTaskAction,type TaskActionState } from '@/app/tareas/actions';
import { taskKinds,taskKindLabels,taskPriorities,taskPriorityLabels } from '@/lib/data/ops-validation';
import type { NameOption } from '@/lib/data/operations';

const KEY='andrai-os:os06-task-id:v1';
const initial:TaskActionState={status:'idle',message:''};
export function TaskCreateForm({projects,opportunities,staff,enabled,defaultProject}:{
 projects:NameOption[];opportunities:NameOption[];staff:NameOption[];
 enabled:boolean;defaultProject?:string;
}){
 const [state,action,pending]=useActionState(createTaskAction,initial);
 const [id,setId]=useState<string|null>(null);
 const ref=useRef<HTMLFormElement>(null);
 const router=useRouter();
 useEffect(()=>{
  let selected:string;
  try{
   const old=sessionStorage.getItem(KEY);
   selected=old&&/^[0-9a-f-]{36}$/i.test(old)?old:crypto.randomUUID();
   sessionStorage.setItem(KEY,selected);
  }catch{selected=crypto.randomUUID();}
  const frame=requestAnimationFrame(()=>setId(selected));
  return ()=>cancelAnimationFrame(frame);
 },[]);
 useEffect(()=>{
  if(state.status!=='success')return;
  const frame=requestAnimationFrame(()=>{
   ref.current?.reset();
   const next=crypto.randomUUID();
   try{sessionStorage.setItem(KEY,next);}catch{/* Private mode */}
   setId(next);
   router.refresh();
  });
  return ()=>cancelAnimationFrame(frame);
 },[state.status,router]);
 const canSubmit=enabled&&Boolean(id)&&!pending;
 const projectDefault=defaultProject&&projects.some(p=>p.id===defaultProject)?'project:'+defaultProject:'none';
 return <section className="panel ops-create" aria-labelledby="new-task-title">
  <div className="panel-head"><div><h2 id="new-task-title">Nueva tarea o entregable</h2>
   <p>Prioridad, fecha, responsable y vínculo con el trabajo.</p></div>
   <span className={enabled?'ops-active-pill':'ops-locked-pill'}>{enabled?'Piloto habilitado':'Altas desactivadas'}</span></div>
  {!enabled&&<p className="ops-note">Este formulario se encuentra bloqueado hasta que la sesión y la matriz de permisos pasen el piloto real.</p>}
  <form ref={ref} action={action}>
   <input type="hidden" name="task_id" value={id??''} readOnly />
   <fieldset className="ops-fields" disabled={!canSubmit}>
    <div className="ops-fields-grid">
      <label className="ops-col-full">Título *<input type="text" name="title" required minLength={2} maxLength={180} placeholder="Entregar prototipo responsive"/></label>
      <label>Tipo<select name="kind" defaultValue="task">{taskKinds.map(k=><option value={k} key={k}>{taskKindLabels[k]}</option>)}</select></label>
      <label>Prioridad<select name="priority" defaultValue="normal">{taskPriorities.map(k=><option value={k} key={k}>{taskPriorityLabels[k]}</option>)}</select></label>
      <label>Vencimiento *<input type="date" name="due_on" required/></label>
      {staff.length>0 && <label>Responsable<select name="assignee_id" defaultValue=""><option value="">Asignarme a mí</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      <label className="ops-col-full">Vinculación<select name="association" defaultValue={projectDefault}>
       <option value="none">Sin vinculación (tarea interna)</option>
       {projects.length>0&&<optgroup label="Proyectos">{projects.map(p=><option key={p.id} value={'project:'+p.id}>{p.name}</option>)}</optgroup>}
       {opportunities.length>0&&<optgroup label="Oportunidades">{opportunities.map(o=><option key={o.id} value={'opportunity:'+o.id}>{o.name}</option>)}</optgroup>}
      </select></label>
      <label className="ops-col-full">Descripción<textarea name="description" rows={3} maxLength={3000} placeholder="Qué se necesita y qué define una entrega terminada"/></label>
    </div>
    <div className="ops-form-footer"><button className="ops-button" type="submit" disabled={!canSubmit}>{pending?'Guardando…':'Registrar tarea ↗'}</button>
    <span>La auditoría guarda cada cambio autorizado.</span></div>
   </fieldset>
  </form>
  {state.message && <p className={state.status==='success'?'ops-form-success':'ops-form-error'} role="status">{state.message}</p>}
 </section>;
}
