import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isWorkspacePath} from '../src/lib/auth/roles.ts';

const read=(path)=>readFileSync(path,'utf8');
const actionPaths=[
 'src/app/prospectos/actions.ts','src/app/proyectos/actions.ts',
 'src/app/tareas/actions.ts','src/app/cotizaciones/actions.ts',
 'src/app/finanzas/actions.ts'
];
const pagePaths=[
 'src/app/prospectos/page.tsx','src/app/proyectos/page.tsx',
 'src/app/tareas/page.tsx','src/app/cotizaciones/page.tsx',
 'src/app/cotizaciones/[id]/page.tsx','src/app/finanzas/page.tsx'
];
test('All business writes are protected by OS10 global and feature-specific flags',()=>{
 assert.match(read('src/lib/release/gates.ts'),/OS10_PILOT_READ_ONLY!=='false'/);
 for(const path of [...actionPaths,...pagePaths])
  assert.match(read(path),/isPilotReadOnly\(\)/,path);
 for(const flag of ['OS05_CRM_WRITES_ENABLED','OS06_OPERATIONS_WRITES_ENABLED',
    'OS07_QUOTES_WRITES_ENABLED','OS08_FINANCE_WRITES_ENABLED']){
  assert.ok(actionPaths.some(p=>read(p).includes(flag)),'Missing feature flag: '+flag);
 }
});
test('Nested workspace paths refresh Auth in the proxy',()=>{
 assert.equal(isWorkspacePath('/resumen'),true);
 assert.equal(isWorkspacePath('/resumen/reporte.csv'),true);
 assert.equal(isWorkspacePath('/cotizaciones/123e4567-e89b-42d3-a456-426614174000/pdf'),true);
 assert.equal(isWorkspacePath('/api/me'),false);
 assert.equal(isWorkspacePath('/diagnostico-acceso'),false);
 assert.equal(isWorkspacePath('/finanzas/../../other'),false);
});
test('Sign-in directs to a separate server-authorized diagnostics page',()=>{
 assert.match(read('src/lib/auth/actions.ts'),/redirect\('\/diagnostico-acceso'\)/);
 assert.match(read('src/app/diagnostico-acceso/page.tsx'),/await resolveSession\(\)/);
 assert.match(read('src/lib/auth/session.ts'),/bound_user_id !== user\.id/);
 assert.match(read('docs/sql/OS-10_STRICT_MEMBER_BINDING.sql'),/s\.bound_user_id=u\.id/);
 assert.doesNotMatch(read('src/app/diagnostico-acceso/page.tsx'),/verifiedEmail|user\.email|access_token/);
});
test('Deep health endpoint requires Auth, RLS and never leaks business metrics',()=>{
 const source=read('src/app/api/health/private/route.ts');
 assert.match(source,/await resolveSession\(\)/);
 assert.match(source,/os09_dashboard_v1/);
 assert.match(source,/status:401/);
 assert.match(source,/status:403/);
 assert.match(source,/private, no-store/);
 assert.doesNotMatch(source,/service_role|raw_user_meta_data|data\.finance/);
});
test('Cross-module QA fixture never commits synthetic customer records',()=>{
 const script=read('tests/postgres/os10_agency_flow.rollback.sql');
 for(const name of ['os_create_lead_v1','os07_create_quote_v1',
  'os06_create_project_v1','os06_create_task_v1',
  'os08_record_manual_entry_v1','os09_dashboard_v1'])
   assert.ok(script.includes(name),name);
 assert.match(script,/^rollback;/m);
 assert.doesNotMatch(script,/\bcommit;/i);
});
