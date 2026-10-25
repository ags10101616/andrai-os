import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/sql/OS-14_RLS_FK_HARDENING.sql','utf8');
const rollback=readFileSync('docs/sql/OS-14_ROLLBACK_TEMPLATE.sql','utf8');
const smoke=readFileSync('tests/postgres/os14_hardening.rollback.sql','utf8');
const indexes=[
  "os14_fk_proposal_agent",
  "os14_fk_proposal_creator",
  "os14_fk_proposal_reviewer",
  "os14_fk_audit_actor",
  "os14_fk_ledger_entered_by",
  "os14_fk_ledger_project",
  "os14_fk_opportunity_assignee",
  "os14_fk_project_assignee",
  "os14_fk_project_client",
  "os14_fk_snapshot_submitter",
  "os14_fk_quote_project",
  "os14_fk_quote_approver",
  "os14_fk_quote_creator",
  "os14_fk_quote_client",
  "os14_fk_task_opportunity"
];

test('OS14 preserves identical identity scopes and removes duplicate policy',()=>{
 assert.match(sql,/status='active' and bound_user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/os_private\.member_role\(organization_id\)='owner'/);
 assert.match(sql,/drop policy os12_agent_self_read/);
 assert.match(sql,/drop policy os12_owner_agent_registry_read/);
 assert.match(sql,/drop policy os_agent_owner_read/);
 assert.match(sql,/entered_by=\(select auth\.uid\(\)\)/);
});
test('Every previously uncovered FK has a documented supporting index',()=>{
 assert.equal(indexes.length,15);
 for(const name of indexes){
  assert.match(sql,new RegExp('create index if not exists '+name+'\\b'));
  assert.match(rollback,new RegExp('drop index if exists public\\.'+name+';'));
 }
});
test('OS14 never broadens grants or activates commercial or dot writes',()=>{
 assert.doesNotMatch(sql,/\bgrant\b|\binsert\s+into\b|\bupdate\s+public\b|\bdelete\s+from\b|\bcreate\s+trigger\b/i);
 assert.doesNotMatch(sql,/OS10_PILOT_READ_ONLY\s*=\s*false|OS13_AGENT_PROPOSALS_ENABLED\s*=\s*true/i);
 assert.match(smoke,/has_table_privilege\('authenticated','public\.os_agent_proposals','INSERT'\)/);
 assert.match(smoke,/os13_proposal_controls/);
 assert.match(smoke,/^rollback;/m);
 assert.doesNotMatch(smoke,/\bcommit;/i);
});
