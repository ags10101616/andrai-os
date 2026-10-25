import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 proposalKinds,proposalLabels,isProposalKind,isProposalStatus,
 parseReviewSummary,parseProposals,isExpiredUnreviewed
} from '../src/lib/agent/proposals/model.ts';

const read=path=>readFileSync(path,'utf8');
const row={
 id:'123e4567-e89b-42d3-a456-426614174000',
 kind:'alert',summary:'Revisar las prioridades del equipo',
 rationale:'Los indicadores apuntan a revisar pendientes sin afectar datos privados.',
 suggested_next_step:'Solicitar revisión interna de actividades',
 status:'proposed',revision:1,
 created_at:'2026-10-24T14:00:00Z',
 expires_at:'2026-11-07T14:00:00Z',resolved_at:null,review_note:null
};
test('Only predefined nonexecuting proposal categories and review statuses are accepted',()=>{
 assert.deepEqual([...proposalKinds],['alert','followup','task','quote_draft']);
 assert.equal(isProposalKind('task'),true);
 assert.equal(isProposalKind('payment'),false);
 assert.equal(isProposalKind('execute'),false);
 assert.equal(isProposalStatus('approved'),true);
 assert.equal(isProposalStatus('executed'),false);
 assert.equal(proposalLabels.alert,'Alerta de operación');
});
test('Review metrics are derived from complete SQL totals and must reconcile',()=>{
 assert.deepEqual(parseReviewSummary({
  proposed:6,approved:1,rejected:1,expired_pending:0,total:8
 }),{proposed:6,approved:1,rejected:1,expiredPending:0,total:8});
 assert.throws(()=>parseReviewSummary({proposed:6,approved:1,rejected:1,expired_pending:0,total:9}));
 assert.throws(()=>parseReviewSummary({proposed:-1,approved:1,rejected:1,expired_pending:0,total:1}));
});
test('Proposal feed validates shape, version and expiry without implicit execution',()=>{
 const proposal=parseProposals([row])[0];
 assert.equal(proposal.status,'proposed');
 assert.equal(isExpiredUnreviewed(proposal,'2026-11-08T00:00:00Z'),true);
 assert.equal(isExpiredUnreviewed(proposal,'2026-10-24T17:00:00Z'),false);
 assert.throws(()=>parseProposals([{...row,kind:'payment'}]));
 assert.throws(()=>parseProposals([{...row,revision:0}]));
 assert.throws(()=>parseProposals([{...row,expires_at:'invalid'}]));
});
test('Database uses independent OFF switches and zero direct client mutations',()=>{
 const sql=read('docs/sql/OS-13_AGENT_PROPOSAL_REVIEW.sql');
 assert.match(sql,/intake_enabled boolean not null default false/);
 assert.match(sql,/review_enabled boolean not null default false/);
 assert.match(sql,/drop constraint os_agent_identities_capabilities_check/);
 assert.match(sql,/array\['proposal_draft'\]::text\[\]/);
 assert.match(sql,/revoke all on public\.os_agent_proposals from public,anon,authenticated/);
 assert.match(sql,/security definer/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/reviewed_by_uid/);
 assert.match(sql,/get diagnostics v_created=row_count/);
 assert.match(sql,/Daily proposal limit reached/);
 assert.match(sql,/no outgoing messages, no domain writes/i);
});
test('Every UI and server action is gated, while approvals cannot launch execution',()=>{
 const agent=read('src/app/agente/actions.ts');
 const owner=read('src/app/jose-luis/actions.ts');
 const agentPage=read('src/app/agente/page.tsx');
 const ownerPage=read('src/app/jose-luis/page.tsx');
 assert.match(agent,/isPilotReadOnly\(\)/);
 assert.match(owner,/isPilotReadOnly\(\)/);
 assert.match(agent,/OS13_AGENT_PROPOSALS_ENABLED/);
 assert.match(owner,/OS13_OWNER_REVIEWS_ENABLED/);
 assert.match(ownerPage,/reviewEnabled/);
 assert.match(agentPage,/ProposalDraftForm/);
 assert.match(ownerPage,/ProposalReviewForm/);
 assert.doesNotMatch(agent+owner,/service_role|signInWithPassword|send_email|fetch\(/);
});
test('Metadata-only audit events include agent proposals without dispatch',()=>{
 const events=read('src/lib/events/model.ts');
 const sql=read('docs/sql/OS-13_AGENT_PROPOSAL_REVIEW.sql');
 assert.match(events,/os_agent_proposals/);
 assert.match(sql,/after insert or update on public\.os_agent_proposals/);
 assert.match(sql,/dispatch_state/);
 assert.match(sql,/os11_capture_audit/);
});
test('Integration QA exists and ends with rollback',()=>{
 const sql=read('tests/postgres/os13_agent_proposals.rollback.sql');
 assert.match(sql,/^rollback;/m);
 assert.doesNotMatch(sql,/\bcommit;/i);
 assert.match(sql,/Eight agent submission events not captured/);
 assert.match(sql,/Agent can see owner-only audit outbox/);
});
