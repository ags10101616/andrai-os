import { isPilotReadOnly } from '@/lib/release/gates';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ProjectCreateForm } from '@/components/operations/ProjectCreateForm';
import { ProjectStageForm } from '@/components/operations/ProjectStageForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';
import { listProjects,projectFormOptions } from '@/lib/data/operations';
import { isProjectStage,projectStages,projectStageLabels,formatLocalDate } from '@/lib/data/ops-validation';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Proyectos'};
export default async function ProjectsPage({
 searchParams,
}:{searchParams:Promise<{stage?:string}>}){
 const {stage:stageValue}=await searchParams;
 const stage=isProjectStage(stageValue)?stageValue:undefined;
 const [projects,options]=await Promise.all([listProjects(stage),projectFormOptions()]);
 const {member}=options;
 const writes=!isPilotReadOnly()&&process.env.OS06_OPERATIONS_WRITES_ENABLED==='true';
 return <AppShell active="proyectos" role={member.role} displayName={member.displayName}>
  <section className="page-intro">
   <div><div className="eyebrow">OPERACIÓN / PROYECTOS / OS-06</div>
    <h1>De una idea<br/>a una entrega<span className="accent">.</span></h1>
    <p>Estado, responsables, fechas y entregables para que cada proyecto avance con claridad.</p>
   </div>
   <span className="action-disabled">{writes?'Piloto privado':'Lectura real · cambios pausados'}</span>
  </section>
  <SectionSurface title="Proyectos" subtitle="Máximo 60 proyectos recientes por filtro. El avance procede de registros autorizados.">
   <nav className="ops-filter" aria-label="Filtrar proyectos por etapa">
    <Link href="/proyectos" aria-current={!stage?'page':undefined}>Todos</Link>
    {projectStages.map(s=><Link href={'/proyectos?stage='+s} aria-current={stage===s?'page':undefined} key={s}>{projectStageLabels[s]}</Link>)}
   </nav>
   {projects.length===0?<EmptyState symbol="▣" title="Todavía no hay proyectos en este filtro"
     description="Cuando haya proyectos reales, sus responsables, fechas y tareas aparecerán aquí."/>:
    <div className="ops-project-grid">
     {projects.map(project=>{
      const allowedEditor=member.role==='owner'||(member.role==='production'&&project.assigneeId===member.id);
      return <article className="ops-project-card" key={project.id}>
       <div className="ops-project-head">
        <div><span className="ops-project-client">{project.clientName}</span><h3>{project.name}</h3></div>
        <span className="ops-stage-pill">{projectStageLabels[project.stage]}</span>
       </div>
       <div className="ops-project-progress">
        <div><span>Avance declarado</span><strong>{project.progress}%</strong></div>
        <progress aria-label={'Avance de '+project.name} value={project.progress} max={100}>{project.progress}%</progress>
       </div>
       <dl className="ops-project-meta">
        <div><dt>Responsable</dt><dd>{project.assigneeName}</dd></div>
        <div><dt>Entrega prevista</dt><dd>{formatLocalDate(project.dueOn)}</dd></div>
        <div><dt>Tareas</dt><dd>{project.taskCompleted}/{project.taskTotal} completadas</dd></div>
        <div><dt>Entregables pendientes</dt><dd>{project.openDeliverables}</dd></div>
       </dl>
       <div className="ops-card-footer">
        <Link href={'/tareas?project='+project.id}>Ver tareas del proyecto ↗</Link>
        <span>Rev. {project.revision}</span>
       </div>
       {allowedEditor&&<ProjectStageForm key={project.id+':'+project.revision} id={project.id} revision={project.revision}
        currentStage={project.stage} progress={project.progress} enabled={writes}/>}
      </article>;
     })}
    </div>}
  </SectionSurface>
  {member.role==='owner'&&<ProjectCreateForm clients={options.clients} staff={options.staff} enabled={writes}/>}
 </AppShell>;
}
