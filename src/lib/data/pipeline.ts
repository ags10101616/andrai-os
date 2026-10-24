import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireMembership } from '@/lib/auth/session';

export const pipelineStages = ['new','contacted','meeting','proposal','won','lost'] as const;
export type PipelineStage = typeof pipelineStages[number];
export function isPipelineStage(value:unknown):value is PipelineStage {
  return typeof value==='string' && pipelineStages.includes(value as PipelineStage);
}
export const stageLabels:Record<PipelineStage,string> = {
  new:'Nuevo',contacted:'Contactado',meeting:'Reunión',
  proposal:'Propuesta',won:'Ganado',lost:'Perdido',
};
export interface OpportunitySummary {
  id:string;clientName:string;title:string;stage:PipelineStage;
  amountMinor:number;nextAction:string;nextActionOn:string;
}
type DbOpportunity={
  id:unknown;client_id:unknown;title:unknown;stage:unknown;
  amount_minor:unknown;next_action:unknown;next_action_on:unknown;
};

export async function loadPipeline(stage?:PipelineStage):Promise<OpportunitySummary[]> {
  // Double check the role; the SQL query also runs with RLS.
  await requireMembership('prospectos');
  const db=await createServerSupabase();
  const base=db.from('os_opportunities')
    .select('id,client_id,title,stage,amount_minor,next_action,next_action_on')
    .order('created_at',{ascending:false}).limit(60);
  const {data,error}=await (stage?base.eq('stage',stage):base);
  if(error) throw new Error('Failed to load the opportunity list');
  const items=(data??[]) as DbOpportunity[];
  const ids=[...new Set(items.map(x=>String(x.client_id)))];
  if(!ids.length) return [];
  const {data:clients,error:clientError}=await db.from('os_clients')
    .select('id,name').in('id',ids);
  if(clientError) throw new Error('Failed to load linked clients');
  const names=new Map((clients??[]).map(c=>[String(c.id),String(c.name)]));
  return items.filter(x=>isPipelineStage(x.stage)).map(x=>({
    id:String(x.id),clientName:names.get(String(x.client_id))??'Cliente vinculado',
    title:String(x.title),stage:x.stage as PipelineStage,
    amountMinor:Number(x.amount_minor)||0,
    nextAction:String(x.next_action),nextActionOn:String(x.next_action_on),
  }));
}
