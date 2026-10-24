import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/auth/server';

export type AgentAccess =
 | {kind:'signed-out'}
 | {kind:'restricted'}
 | {kind:'agent';agent:{slug:'jose-luis';displayName:string;organizationId:string}};

/** A dot is not a staff member and cannot inherit human permissions. */
export async function resolveAgentSession():Promise<AgentAccess>{
 const db=await createServerSupabase();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user?.id||!user.email||!user.email_confirmed_at)
  return {kind:'signed-out'};
 const email=user.email.trim().toLowerCase();
 const {data, error:rowError}=await db.from('os_agent_identities')
  .select('agent_slug,display_name,organization_id,login_email,bound_user_id,status')
  .eq('bound_user_id',user.id)
  .eq('login_email',email)
  .eq('status','active')
  .limit(2);
 if(rowError)throw new Error('Agent identity verification temporarily unavailable');
 if(!data||data.length!==1||data[0].agent_slug!=='jose-luis')
  return {kind:'restricted'};
 const row=data[0];
 if(row.bound_user_id!==user.id||row.login_email!==email)
  return {kind:'restricted'};
 return {kind:'agent',agent:{
  slug:'jose-luis',displayName:row.display_name,
  organizationId:row.organization_id
 }};
}
export async function requireAgentSession(){
 const session=await resolveAgentSession();
 if(session.kind==='signed-out')redirect('/login');
 if(session.kind!=='agent')redirect('/acceso-restringido');
 return session.agent;
}
