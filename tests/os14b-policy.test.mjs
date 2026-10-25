import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/sql/OS-14B_PROPOSAL_SELECT_CONSOLIDATION.sql','utf8');
const rollback=readFileSync('docs/sql/OS-14B_ROLLBACK_TEMPLATE.sql','utf8');
const smoke=readFileSync('tests/postgres/os14_hardening.rollback.sql','utf8');
test('OS14B merges owner and active exact-UID agent proposal visibility without expanding access',()=>{
 assert.match(sql,/os_private\.member_role\(organization_id\)='owner'/);
 assert.match(sql,/created_by_uid=\(select auth\.uid\(\)\)/);
 assert.match(sql,/a\.organization_id=os_agent_proposals\.organization_id/);
 assert.match(sql,/a\.bound_user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/a\.status='active'/);
 assert.match(sql,/drop policy os13_proposals_owner_read/);
 assert.match(sql,/drop policy os13_proposals_agent_own_read/);
 assert.doesNotMatch(sql,/\bgrant\b|\bcreate\s+table\b|\bupdate\s+public\b|\bcreate\s+trigger\b/i);
 assert.match(rollback,/create policy os13_proposals_agent_own_read/);
 assert.match(smoke,/os14_proposal_owner_or_agent_read/);
 assert.match(smoke,/cmd='SELECT'\) <> 1/);
});
