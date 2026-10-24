import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireAgentSession } from './session';
import { parseAgentBrief, type AgentBrief } from './model';

export async function loadAgentBrief():Promise<AgentBrief>{
 await requireAgentSession();
 const db=await createServerSupabase();
 const {data,error}=await db.rpc('os12_agent_brief_v1');
 if(error)throw new Error('Agent brief temporarily unavailable');
 return parseAgentBrief(data);
}
