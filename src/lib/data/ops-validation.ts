export function isUuid(v:unknown):v is string {
 return typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
export function isISODate(value:unknown):value is string {
 if(typeof value!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const parsed=new Date(value+'T00:00:00Z');
 return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10)===value;
}
export function isRevision(v:unknown):v is number {
 return Number.isSafeInteger(v) && typeof v==='number' && v>=1 && v<=2147483647;
}
export const projectStages=['brief','design','development','review','delivered'] as const;
export type ProjectStage=typeof projectStages[number];
export const projectStageLabels:Readonly<Record<ProjectStage,string>>={
 brief:'Brief',design:'Diseño',development:'Desarrollo',review:'Revisión',delivered:'Entregado'
};
export function isProjectStage(v:unknown):v is ProjectStage {
 return typeof v==='string' && projectStages.includes(v as ProjectStage);
}
export const taskKinds=['task','deliverable','milestone'] as const;
export type TaskKind=typeof taskKinds[number];
export const taskKindLabels:Readonly<Record<TaskKind,string>>={
 task:'Tarea',deliverable:'Entregable',milestone:'Hito'
};
export function isTaskKind(v:unknown):v is TaskKind {
 return typeof v==='string' && taskKinds.includes(v as TaskKind);
}
export const taskPriorities=['low','normal','high','urgent'] as const;
export type TaskPriority=typeof taskPriorities[number];
export const taskPriorityLabels:Readonly<Record<TaskPriority,string>>={
 low:'Baja',normal:'Normal',high:'Alta',urgent:'Urgente'
};
export function isTaskPriority(v:unknown):v is TaskPriority {
 return typeof v==='string' && taskPriorities.includes(v as TaskPriority);
}
export function formatLocalDate(raw:string|null):string {
 if(!raw || !isISODate(raw))return 'Sin fecha';
 return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
   .format(new Date(raw+'T00:00:00Z'));
}
