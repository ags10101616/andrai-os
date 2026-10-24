import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 parseDashboardDays,parseExecutiveReport,opportunityKeys,projectKeys,quoteKeys
} from '../src/lib/dashboard/model.ts';
import {buildExecutiveCsv} from '../src/lib/dashboard/csv.ts';

const series=(name,stages)=>stages.map((stage,index)=>({[name]:stage,count:index}));
const raw={
 role:'owner',days:30,as_of:'2026-10-24',period_start:'2026-09-25',
 period_end:'2026-10-24',timezone:'America/Monterrey',
 tasks:{open:1,overdue:1,due_soon_7:0,completed_in_period:1,open_deliverables:1,scope:'team'},
 sales:{
  active_opportunities:1,new_in_period:1,won_total:0,overdue_followups:1,
  open_pipeline_minor:350000,quotes_total:1,quotes_in_review:0,
  pipeline:series('stage',opportunityKeys),quote_statuses:series('status',quoteKeys),
 },
 operations:{
  active:1,delivered_total:0,created_in_period:1,overdue:1,
  avg_active_progress_percent:25.5,scope:'team',stages:series('stage',projectKeys),
 },
 finance:{
  source:'manually_registered',receipts_in_period_minor:250000,
  expenses_in_period_minor:0,refunds_in_period_minor:0,
  net_in_period_minor:250000,accepted_open_minor_all:910000
 }
};
test('7/30/90 day selection is an exact allowlist',()=>{
 assert.equal(parseDashboardDays('7'),7);
 assert.equal(parseDashboardDays(90),90);
 assert.equal(parseDashboardDays('30'),30);
 assert.equal(parseDashboardDays('365'),30);
 assert.equal(parseDashboardDays('anything'),30);
});
test('Owner report has verified monetary and operational amounts',()=>{
 const r=parseExecutiveReport(raw,'owner',30);
 assert.equal(r.finance?.acceptedOpenMinorAll,910000);
 assert.equal(r.sales?.overdueFollowups,1);
 assert.equal(r.operations?.avgActiveProgress,25.5);
 assert.equal(r.tasks.completedInPeriod,1);
});
test('Sales may not receive finance or project sections',()=>{
 const sales={...raw,role:'sales',tasks:{...raw.tasks,scope:'assigned'}};
 delete sales.finance;
 delete sales.operations;
 const r=parseExecutiveReport(sales,'sales',30);
 assert.equal(r.finance,undefined);
 assert.equal(r.operations,undefined);
 assert.ok(r.sales);
 const csv=buildExecutiveCsv(r);
 assert.doesNotMatch(csv,/Finanzas|Saldos|Cobros registrados|Proyectos/);
 assert.match(csv,/Pipeline/);
 assert.throws(()=>parseExecutiveReport({...sales,finance:raw.finance},'sales',30));
});
test('Production may not receive sales or financial sections',()=>{
 const prod={...raw,role:'production',tasks:{...raw.tasks,scope:'assigned'},
 operations:{...raw.operations,scope:'assigned'}};
 delete prod.sales;delete prod.finance;
 const r=parseExecutiveReport(prod,'production',30);
 assert.equal(r.sales,undefined);
 assert.equal(r.finance,undefined);
 const csv=buildExecutiveCsv(r);
 assert.doesNotMatch(csv,/Pipeline|Cotizaciones|Finanzas/);
 assert.match(csv,/Proyectos/);
 assert.throws(()=>parseExecutiveReport({...prod,sales:raw.sales},'production',30));
});
test('Response role mismatches and invalid counts fail closed',()=>{
 assert.throws(()=>parseExecutiveReport(raw,'sales',30));
 assert.throws(()=>parseExecutiveReport(raw,'owner',7));
 assert.throws(()=>parseExecutiveReport({...raw,finance:{...raw.finance,receipts_in_period_minor:-1}},'owner',30));
 assert.throws(()=>parseExecutiveReport({...raw,tasks:{...raw.tasks,overdue:-3}},'owner',30));
});
test('CSV report includes BOM and uses exact filtered metrics',()=>{
 const csv=buildExecutiveCsv(parseExecutiveReport(raw,'owner',30));
 assert.ok(csv.startsWith('\ufeff'));
 assert.match(csv,/250000/);
 assert.match(csv,/910000/);
 assert.match(csv,/America\/Monterrey|2026-09-25/);
 assert.match(csv,/"Finanzas","Movimiento neto registrado"/);
 assert.ok(csv.endsWith('\r\n'));
});
test('Routes are dynamically authenticated and never publicly cached',()=>{
 const route=readFileSync('src/app/resumen/reporte.csv/route.ts','utf8');
 const dashboard=readFileSync('src/lib/dashboard/data.ts','utf8');
 const sql=readFileSync('docs/sql/OS-09_EXECUTIVE_METRICS.sql','utf8');
 assert.match(route,/private, no-store/);
 assert.match(route,/loadExecutiveDashboard\(days\)/);
 assert.match(dashboard,/await requireMembership\('resumen'\)/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/grant execute on function public\.os09_dashboard_v1\(integer\) to authenticated/);
 assert.match(sql,/v_role='owner'/);
 assert.match(sql,/America\/Monterrey/);
});
