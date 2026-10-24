/** Pure shape validation for a tightly scoped agent brief. */
export interface AgentBrief {
 agent:'jose-luis';role:'agent';access:'brief_read';mode:'read_only';
 projectsActive:number;tasksOpen:number;deliverablesOpen:number;
 quotesInReview:number;opportunitiesActive:number;asOf:string;
}
function record(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new Error('Invalid agent brief');
 return value as Record<string,unknown>;
}
function natural(value:unknown):number{
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<0)
  throw new Error('Invalid agent brief count');
 return n;
}
export function parseAgentBrief(raw:unknown):AgentBrief{
 const data=record(raw);
 if(data.agent!=='jose-luis'||data.role!=='agent'||
    data.access!=='brief_read'||data.mode!=='read_only'||
    typeof data.as_of!=='string'||!Number.isFinite(Date.parse(data.as_of)))
   throw new Error('Unexpected agent access contract');
 const allow=new Set([
  'agent','role','access','mode','as_of','projects_active','tasks_open',
  'deliverables_open','quotes_in_review','opportunities_active'
 ]);
 if(Object.keys(data).some(key=>!allow.has(key)))
  throw new Error('Unapproved data in agent brief');
 return {
  agent:'jose-luis',role:'agent',access:'brief_read',mode:'read_only',
  projectsActive:natural(data.projects_active),
  tasksOpen:natural(data.tasks_open),
  deliverablesOpen:natural(data.deliverables_open),
  quotesInReview:natural(data.quotes_in_review),
  opportunitiesActive:natural(data.opportunities_active),
  asOf:data.as_of
 };
}
