import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { TaskCreateForm } from '@/components/operations/TaskCreateForm';
import { TaskStatusForm } from '@/components/operations/TaskStatusForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';
import { listTasks,taskFormOptions } from '@/lib/data/operations';
import { isUuid,taskKindLabels,taskPriorityLabels,formatLocalDate } from '@/lib/data/ops-validation';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Tareas'};
type View='pending'|'done'|'all';
function taskView(v:unknown):View {
 return v==='done'||v==='all'?v:'pending';
}
export default async function TasksPage({
 searchParams,
}:{searchParams:Promise<{view?:string;project?:string}>}){
 const params=await searchParams;
 const view=taskView(params.view);
 const projectId=isUuid(params.project)?params.project:undefined;
 const [tasks,options]=await Promise.all([
  listTasks({view,projectId}),taskFormOptions(),
 ]);
 const {member}=options;
 const writes=process.env.OS06_OPERATIONS_WRITES_ENABLED==='true';
 const projectName=projectId?options.projects.find(p=>p.id===projectId)?.name:null;
 return <AppShell active="tareas" role={member.role} displayName={member.displayName}>
  <section className="page-intro">
   <div><div className="eyebrow">OPERACIÓN / TAREAS / OS-06</div>
    <h1>Lo que sigue,<br/>siempre claro<span className="accent">.</span></h1>
    <p>Tareas, hitos y entregables ligados a proyectos, oportunidades o al trabajo interno del equipo.</p>
   </div>
   <span className="action-disabled">{writes?'Piloto privado':'Lectura real · cambios pausados'}</span>
  </section>
  <SectionSurface title={projectName?'Tareas · '+projectName:'Agenda del equipo'}
   subtitle="Hasta 80 tareas por filtro, priorizadas por vencimiento.">
    <nav className="ops-filter" aria-label="Filtrar tareas por estado">
     {[
      {view:'pending',label:'Pendientes'},
      {view:'done',label:'Terminadas'},
      {view:'all',label:'Todas'},
     ].map(item=><Link key={item.view}
       href={'/tareas?view='+item.view+(projectId?'&project='+projectId:'')}
       aria-current={view===item.view?'page':undefined}>{item.label}</Link>)}
     {projectId&&<Link href="/tareas">Quitar filtro de proyecto ×</Link>}
    </nav>
    {tasks.length===0?<EmptyState symbol="✓" title="Sin tareas en este filtro"
     description="Aquí aparecerán las tareas reales cuando se registren y se asignen."/>:
     <div className="ops-task-list">
      {tasks.map(task=>{
       const allowed=member.role==='owner'||task.assigneeId===member.id;
       return <article className="ops-task-item" key={task.id}>
        <div className="ops-task-main">
         <div className="ops-task-head"><span className="ops-kind-pill">{taskKindLabels[task.kind]}</span>
           <span className={'ops-priority ops-priority-'+task.priority}>{taskPriorityLabels[task.priority]}</span>
           {task.done&&<span className="ops-done-pill">Terminada</span>}</div>
         <h3>{task.title}</h3>
         {task.description&&<p>{task.description}</p>}
         <div className="ops-task-bottom">
          <span>Responsable: {task.assigneeName}</span>
          <span>Vence: {formatLocalDate(task.dueOn)}</span>
          {task.projectName&&<span>Proyecto: {task.projectName}</span>}
          {task.opportunityName&&<span>Oportunidad: {task.opportunityName}</span>}
         </div>
        </div>
        {allowed&&<TaskStatusForm id={task.id} revision={task.revision} done={task.done} enabled={writes}/>}
       </article>;
      })}
     </div>}
  </SectionSurface>
  <TaskCreateForm projects={options.projects} opportunities={options.opportunities}
   staff={options.staff} enabled={writes} defaultProject={projectId}/>
 </AppShell>;
}
