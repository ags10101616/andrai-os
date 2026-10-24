import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 isUuid,isISODate,isRevision,isProjectStage,isTaskKind,isTaskPriority,
 formatLocalDate
} from '../src/lib/data/ops-validation.ts';

test('Safe, explicit workflow statuses',()=>{
 for(const k of ['brief','design','development','review','delivered'])assert.equal(isProjectStage(k),true);
 for(const k of ['task','deliverable','milestone'])assert.equal(isTaskKind(k),true);
 for(const k of ['low','normal','high','urgent'])assert.equal(isTaskPriority(k),true);
 assert.equal(isProjectStage('fake'),false);
 assert.equal(isTaskKind('finance'),false);
});
test('Validation of UUIDs, date strings and revisions',()=>{
 assert.equal(isUuid('123e4567-e89b-42d3-a456-426614174000'),true);
 assert.equal(isUuid('not-a-uuid'),false);
 assert.equal(isISODate('2026-10-24'),true);
 assert.equal(isISODate('2026-02-30'),false);
 assert.equal(isRevision(1),true);
 assert.equal(isRevision(0),false);
 assert.match(formatLocalDate('2026-10-24'),/2026/);
});
test('All writes are disabled until server flag is enabled',()=>{
 const p=readFileSync('src/app/proyectos/actions.ts','utf8');
 const t=readFileSync('src/app/tareas/actions.ts','utf8');
 for(const s of [p,t]){
  assert.match(s,/OS06_OPERATIONS_WRITES_ENABLED==='true'/);
  assert.match(s,/requireMembership/);
  assert.doesNotMatch(s,/service_role/);
 }
});
test('Project and task writes call the reviewed database RPCs',()=>{
 const p=readFileSync('src/app/proyectos/actions.ts','utf8');
 const t=readFileSync('src/app/tareas/actions.ts','utf8');
 for(const action of ['os06_create_project_v1','os06_set_project_stage_v1'])assert.ok(p.includes(action));
 for(const action of ['os06_create_task_v1','os06_set_task_done_v1'])assert.ok(t.includes(action));
});
test('Operations surfaces read actual authorized data with empty states',()=>{
 const p=readFileSync('src/app/proyectos/page.tsx','utf8');
 const t=readFileSync('src/app/tareas/page.tsx','utf8');
 assert.match(p,/await Promise\.all\(\[listProjects\(stage\),projectFormOptions\(\)\]\)/);
 assert.match(t,/listTasks\(\{view,projectId\}\)/);
 assert.match(p,/projects\.length===0/);
 assert.match(t,/tasks\.length===0/);
});
test('SQL enforces RLS-based tenant and optimistic revisions',()=>{
 const sql=readFileSync('docs/sql/OS-06_PROJECTS_TASKS.sql','utf8');
 assert.match(sql,/security invoker/g);
 assert.match(sql,/os_private\.member_role/);
 assert.match(sql,/os06_revision_check/);
 assert.match(sql,/revoke update on public\.os_projects,public\.os_tasks from authenticated/);
 assert.match(sql,/grant execute on function public\.os06_set_task_done_v1/);
});
