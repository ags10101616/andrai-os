export const proposalKinds=['alert','followup','task','quote_draft'] as const;
export type ProposalKind=typeof proposalKinds[number];
export const proposalLabels:Record<ProposalKind,string>={
 alert:'Alerta de operación',
 followup:'Seguimiento sugerido',
 task:'Tarea propuesta',
 quote_draft:'Idea para cotización',
};
export const proposalStatuses=['proposed','approved','rejected','expired'] as const;
export type ProposalStatus=typeof proposalStatuses[number];
export const proposalStatusLabels:Record<ProposalStatus,string>={
 proposed:'Por revisar',
 approved:'Idea aprobada',
 rejected:'Descartada',
 expired:'Caducada',
};
export function isProposalKind(v:unknown):v is ProposalKind{
 return typeof v==='string'&&proposalKinds.includes(v as ProposalKind);
}
export function isProposalStatus(v:unknown):v is ProposalStatus{
 return typeof v==='string'&&proposalStatuses.includes(v as ProposalStatus);
}
export interface AgentProposal{
 id:string;kind:ProposalKind;summary:string;rationale:string;
 suggestedNextStep:string;status:ProposalStatus;revision:number;
 createdAt:string;expiresAt:string;resolvedAt:string|null;
 reviewNote:string|null;
}
export interface ReviewSummary{
 proposed:number;approved:number;rejected:number;
 expiredPending:number;total:number;
}
export interface ReviewControls{intakeEnabled:boolean;reviewEnabled:boolean}
export interface OwnerProposalData{
 proposals:AgentProposal[];summary:ReviewSummary;controls:ReviewControls;
}
function n(v:unknown):number{
 const value=Number(v);
 if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid proposal metric');
 return value;
}
export function parseReviewSummary(input:unknown):ReviewSummary{
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw new Error('Malformed proposal summary');
 const r=input as Record<string,unknown>;
 const data={
  proposed:n(r.proposed),approved:n(r.approved),
  rejected:n(r.rejected),expiredPending:n(r.expired_pending),
  total:n(r.total)
 };
 if(data.proposed+data.approved+data.rejected+data.expiredPending!==data.total)
  throw new Error('Inconsistent proposal totals');
 return data;
}
export function parseProposals(raw:unknown):AgentProposal[]{
 if(!Array.isArray(raw)||raw.length>100)
  throw new Error('Malformed proposal feed');
 return raw.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))
   throw new Error('Malformed proposal row');
  const p=item as Record<string,unknown>;
  if(typeof p.id!=='string'||!isProposalKind(p.kind)||
    !isProposalStatus(p.status)||typeof p.summary!=='string'||
    typeof p.rationale!=='string'||typeof p.suggested_next_step!=='string'||
    typeof p.created_at!=='string'||typeof p.expires_at!=='string'||
    !Number.isFinite(Date.parse(p.created_at))||
    !Number.isFinite(Date.parse(p.expires_at))||
    (p.resolved_at!==null&&typeof p.resolved_at!=='string')||
    (p.review_note!==null&&typeof p.review_note!=='string'))
   throw new Error('Invalid proposal contract');
  const revision=n(p.revision);
  if(revision<1)throw new Error('Invalid proposal version');
  return {
   id:p.id,kind:p.kind,summary:p.summary,
   rationale:p.rationale,suggestedNextStep:p.suggested_next_step,
   status:p.status,createdAt:p.created_at,expiresAt:p.expires_at,
   revision,
   resolvedAt:p.resolved_at as string|null,
   reviewNote:p.review_note as string|null,
  };
 });
}
export function isExpiredUnreviewed(proposal:AgentProposal,now:string):boolean{
 return proposal.status==='proposed'&&Date.parse(proposal.expiresAt)<Date.parse(now);
}
