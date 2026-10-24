'use client';

import { useActionState,useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProjectAction,type ProjectActionState } from '@/app/proyectos/actions';
import type { NameOption } from '@/lib/data/operations';

const KEY='andrai-os:os06-project-id:v1';
const initial:ProjectActionState={status:'idle',message:''};
export function ProjectCreateForm({clients,staff,enabled}:{
 clients:NameOption[];staff:NameOption[];enabled:boolean;
}) {
 const [state,action,pending]=useActionState(createProjectAction,initial);
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
 const canSubmit=enabled&&clients.length>0&&Boolean(id)&&!pending;
 return <section className="panel ops-create" aria-labelledby="new-project-title">
  <div className="panel-head"><div><h2 id="new-project-title">Nuevo proyecto</h2><p>Cliente, responsable y alcance en un solo registro.</p></div>
    <span className={enabled?'ops-active-pill':'ops-locked-pill'}>{enabled?'Piloto habilitado':'Altas desactivadas'}</span></div>
  {!enabled && <p className="ops-note">La captura se habilitará tras revisar el acceso real y los permisos. Esta preview no realiza escrituras.</p>}
  {clients.length===0 && <p className="ops-note">Antes de crear un proyecto necesitamos al menos un cliente registrado mediante el CRM.</p>}
  <form ref={ref} action={action} className="ops-form">
   <input type="hidden" name="project_id" value={id??''} readOnly/>
   <fieldset disabled={!canSubmit} className="ops-fields">
    <div className="ops-fields-grid">
      <label>Cliente *<select name="client_id" required defaultValue=""><option value="" disabled>Seleccionar cliente</option>
      {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Responsable<select name="assignee_id" defaultValue=""><option value="">Asignarme a mí</option>
      {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="ops-col-full">Nombre del proyecto *<input name="name" required minLength={2} maxLength={160} placeholder="Sitio corporativo / marca" /></label>
      <label>Entrega prevista<input name="due_on" type="date"/></label>
      <label>Valor comercial (MXN)<input name="amount_mxn" inputMode="decimal" defaultValue="0.00"
        pattern="[0-9]+(\.[0-9]{1,2})?" placeholder="6500.00"/></label>
    </div>
    <div className="ops-form-footer"><button className="ops-button" type="submit" disabled={!canSubmit}>{pending?'Guardando…':'Crear proyecto ↗'}</button>
    <span>No se permite cambiar la organización de un registro.</span></div>
   </fieldset>
  </form>
  {state.message && <p className={state.status==='success'?'ops-form-success':'ops-form-error'} role="status">{state.message}</p>}
 </section>;
}
