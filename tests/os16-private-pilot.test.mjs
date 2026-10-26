import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isISODate,isUuid} from '../src/lib/data/ops-validation.ts';
import {parseMxAmountMinor} from '../src/lib/data/money.ts';
const read=p=>readFileSync(p,'utf8');
const action=read('src/app/prospectos/actions.ts');
const detail=read('src/app/prospectos/[id]/page.tsx');
const editing=read('src/components/crm/OpportunityUpdateForm.tsx');
const exportRoute=read('src/app/equipo/exportar/route.ts');
const dashboard=read('src/components/dashboard/ExecutiveDashboard.tsx');

test('Existing exact gates protect all CRM updates and tenant scope',()=>{
 assert.match(action,/OS05_CRM_WRITES_ENABLED!=='true'/);
 assert.match(action,/isPilotReadOnly\(\)/);
 assert.match(action,/await requireMembership\('prospectos'\)/);
 assert.match(action,/\.eq\('organization_id',member\.organizationId\)/);
 assert.match(action,/\.eq\('updated_at',updatedAt\)/);
 assert.match(action,/\.select\('id,updated_at'\)\.maybeSingle\(\)/);
});
test('Detail only exposes server RLS authorized contact',()=>{
 assert.match(detail,/await requireMembership\('prospectos'\)/);
 assert.match(detail,/if\(!isUuid\(id\)\)notFound\(\)/);
 assert.match(detail,/loadOpportunityDetail\(id,member\.organizationId\)/);
 assert.match(detail,/enabled=\{enabled\}/);
 assert.doesNotMatch(detail,/service_role|mock|Math\.random/);
});
test('Form retains all cross-session guards, expiry and precise values',()=>{
 assert.match(editing,/name="updated_at"/);
 assert.match(editing,/defaultValue=\{opportunity\.stage\}/);
 assert.match(editing,/defaultValue=\{opportunity\.nextActionOn\}/);
 assert.match(editing,/defaultValue=\{\(opportunity\.amountMinor\/100\)\.toFixed\(2\)\}/);
 assert.match(editing,/disabled=\{!enabled\|\|pending\}/);
 assert.equal(parseMxAmountMinor('2500.50'),250050);
 assert.equal(isISODate('2026-02-30'),false);
 assert.equal(isUuid('not-an-id'),false);
});
test('Owner export refuses unsafe access and never returns partial results',()=>{
 assert.match(exportRoute,/await requireMembership\('equipo'\)/);
 assert.match(exportRoute,/member\.role!=='owner'/);
 assert.match(exportRoute,/\.eq\('organization_id',member\.organizationId\)/);
 assert.match(exportRoute,/MAX_ROWS_PER_TABLE=5000/);
 assert.match(exportRoute,/no-store/);
 assert.match(exportRoute,/restore_supported:false/);
 assert.match(exportRoute,/status:503/);
 assert.doesNotMatch(exportRoute,/service_role|auth\.users|\bINSERT\b|\bDELETE\b|\.upsert\(/);
});
test('Owner sees first-use flow without synthetic business rows',()=>{
 assert.match(dashboard,/os16-first-steps/);
 assert.match(dashboard,/sales\.activeOpportunities===0/);
 assert.match(dashboard,/sales\.quotesTotal===0/);
 assert.match(dashboard,/\/prospectos/);
 assert.match(dashboard,/\/cotizaciones/);
 assert.doesNotMatch(dashboard,/DEMO_PROJECTS|syntheticQuote/);
});
