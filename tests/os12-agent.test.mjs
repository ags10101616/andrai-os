import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseAgentBrief} from '../src/lib/agent/model.ts';
import {canVisit,isWorkspacePath} from '../src/lib/auth/roles.ts';

const example={
 agent:'jose-luis',role:'agent',access:'brief_read',mode:'read_only',
 projects_active:2,tasks_open:4,deliverables_open:1,
 quotes_in_review:3,opportunities_active:5,as_of:'2026-10-24T18:15:00Z'
};
const read=path=>readFileSync(path,'utf8');

test('Agent brief validates exact minimal non-financial contract',()=>{
 const brief=parseAgentBrief(example);
 assert.equal(brief.projectsActive,2);
 assert.equal(brief.role,'agent');
 assert.equal(brief.mode,'read_only');
 assert.equal('clientName' in brief,false);
 assert.throws(()=>parseAgentBrief({...example,role:'owner'}));
 assert.throws(()=>parseAgentBrief({...example,mode:'write'}));
 assert.throws(()=>parseAgentBrief({...example,tasks_open:-1}));
 assert.throws(()=>parseAgentBrief({...example,finance:{total_minor:10000}}));
});

test('Agent does not inherit human role permissions',()=>{
 assert.equal(canVisit('owner','agente'),false);
 assert.equal(canVisit('sales','agente'),false);
 assert.equal(canVisit('production','agente'),false);
 assert.equal(canVisit('owner','finanzas'),true);
 assert.equal(canVisit(null,'finanzas'),false);
 assert.equal(isWorkspacePath('/agente'),true);
 assert.equal(isWorkspacePath('/agente/../../finanzas'),false);
});

test('Agent account is separate from os_staff and pending by default',()=>{
 const sql=read('docs/sql/OS-12_AGENT_IDENTITY.sql');
 assert.match(sql,/create table public\.os_agent_identities/);
 assert.match(sql,/status text not null default 'pending'/);
 assert.match(sql,/agent_slug='jose-luis'/);
 assert.match(sql,/a\.status='active'/);
 assert.match(sql,/a\.bound_user_id=u\.id/);
 assert.match(sql,/u\.email_confirmed_at is not null/);
 assert.match(sql,/not exists \(\s*select 1 from public\.os_staff/);
 assert.match(sql,/grant select on table public\.os_agent_identities to authenticated/);
 assert.doesNotMatch(sql,/grant (insert|update|delete) on table public\.os_agent_identities to authenticated/i);
});

test('Only narrow sanitized aggregate is available, no admin keys or tool actions',()=>{
 const sql=read('docs/sql/OS-12_AGENT_IDENTITY.sql');
 const data=read('src/lib/agent/brief.ts');
 const page=read('src/app/agente/page.tsx');
 assert.match(sql,/create function os_private\.os12_agent_brief_core/);
 assert.match(sql,/create function public\.os12_agent_brief_v1/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/new.*/);
 assert.match(sql,/no messages|No capabilities/i);
 assert.doesNotMatch(sql,/service_role|send_email|stripe_charge/i);
 assert.match(data,/await requireAgentSession\(\)/);
 assert.match(page,/await requireAgentSession\(\)/);
 assert.match(page,/read_only|solo lectura|solo de lectura/i);
});

test('Authorized agent login is checked after Supabase Auth with no user secrets',()=>{
 const diag=read('src/app/diagnostico-acceso/page.tsx');
 const agent=read('src/lib/agent/session.ts');
 assert.match(diag,/resolveAgentSession\(\)/);
 assert.match(diag,/href="\/agente"/);
 assert.match(agent,/auth\.getUser\(\)/);
 assert.match(agent,/\.eq\('bound_user_id',user\.id\)/);
 assert.match(agent,/\.eq\('login_email',email\)/);
 assert.match(agent,/\.eq\('status','active'\)/);
 assert.doesNotMatch(diag,/access_token|refresh_token/);
});
