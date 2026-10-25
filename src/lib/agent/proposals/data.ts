import 'server-only';
import {requireMembership} from '@/lib/auth/session';
import {requireAgentSession} from '@/lib/agent/session';
import {createServerSupabase} from '@/lib/auth/server';
import {
 parseProposals,parseReviewSummary,
 type AgentProposal,type OwnerProposalData
} from './model';

const selection='id,kind,summary,rationale,suggested_next_step,status,revision,created_at,expires_at,resolved_at,review_note';

export async function loadOwnerProposalData():Promise<OwnerProposalData>{
 const member=await requireMembership('jose-luis');
 if(member.role!=='owner')throw new Error('Direction authorization required');
 const db=await createServerSupabase();
 const [list,summary,controls]=await Promise.all([
  db.from('os_agent_proposals').select(selection)
   .eq('organization_id',member.organizationId)
   .order('created_at',{ascending:false}).limit(60),
  db.rpc('os13_review_summary_v1').single(),
  db.from('os13_proposal_controls').select('intake_enabled,review_enabled')
   .eq('organization_id',member.organizationId).single(),
 ]);
 if(list.error||summary.error||controls.error)
  throw new Error('Unable to load owner review workspace');
 return {
  proposals:parseProposals(list.data),
  summary:parseReviewSummary(summary.data),
  controls:{
   intakeEnabled:controls.data.intake_enabled===true,
   reviewEnabled:controls.data.review_enabled===true
  }
 };
}

export async function loadAgentOwnProposals():Promise<AgentProposal[]>{
 const agent=await requireAgentSession();
 const db=await createServerSupabase();
 const {data,error}=await db.from('os_agent_proposals').select(selection)
  .eq('organization_id',agent.organizationId)
  .order('created_at',{ascending:false}).limit(20);
 if(error)throw new Error('Unable to retrieve agent draft proposals');
 return parseProposals(data);
}
