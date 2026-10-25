import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {labModel} from '../src/lib/lab/model.ts';
import {labStyle} from '../src/lib/lab/style.ts';
import {isLabEnvironment,createLabResponse} from '../src/lib/lab/access.ts';
const model=vm.runInNewContext(labModel+'\n({quoteTotals,validQuantity,periodData,averageProgress,DEMO_PROJECTS})');
const read=p=>readFileSync(p,'utf8');

test('OS15 permits only an explicit preview or local development, never production',()=>{
 for(const env of [{},{nodeEnv:'production'},{nodeEnv:'test'},{vercelEnv:'production'},{vercelEnv:'production',nodeEnv:'development'},{vercelEnv:'unknown',nodeEnv:'development'}])assert.equal(isLabEnvironment(env),false);
 assert.equal(isLabEnvironment({vercelEnv:'preview',nodeEnv:'production'}),true);
 assert.equal(isLabEnvironment({nodeEnv:'development'}),true);
});
test('OS15 response denies unknown/production without revealing HTML',async()=>{
 const res=createLabResponse('PRIVATE LAB','alert(1)',{vercelEnv:'production'});
 assert.equal(res.status,404);assert.equal(await res.text(),'Not found');assert.match(res.headers.get('cache-control'),/no-store/);
});
test('OS15 preview binds inline JS to an exact CSP hash and forbids connections',async()=>{
 const js='console.log("test")',hash=createHash('sha256').update(js).digest('base64');
 const res=createLabResponse('<html>DEMO</html>',js,{vercelEnv:'preview'});
 assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/text\/html/);
 const csp=res.headers.get('content-security-policy');
 assert.ok(csp.includes("script-src 'sha256-"+hash+"'"));
 assert.ok(csp.includes("connect-src 'none'"));assert.ok(csp.includes("form-action 'none'"));
 assert.doesNotMatch(csp,/unsafe-eval|script-src 'unsafe-inline'/);
 assert.match(res.headers.get('x-robots-tag'),/noindex/);
 assert.equal(res.headers.get('set-cookie'),null);
});
test('OS15 synthetic quote uses integer cents and exact example totals',()=>{
 const a=model.quoteTotals(1,false);assert.equal(a.subtotal,3230000);assert.equal(a.tax,516800);assert.equal(a.total,3746800);
 const b=model.quoteTotals(2,true);assert.equal(b.subtotal,5490000);assert.equal(b.tax,878400);assert.equal(b.total,6368400);
 for(let quantity=1;quantity<=20;quantity++)for(const support of [false,true]){
  const v=model.quoteTotals(quantity,support);assert.equal(Number.isSafeInteger(v.total),true);
  assert.equal(v.tax,Math.round(v.subtotal*16/100));assert.equal(v.total,v.subtotal+v.tax);
 }
});
test('OS15 quantity rejects noninteger, empty-coerced and extreme amounts',()=>{
 for(const value of [0,-1,1.5,21,Infinity,NaN,Number.MAX_SAFE_INTEGER,'1',null]){
  assert.equal(model.validQuantity(value),false);assert.throws(()=>model.quoteTotals(value,false));
 }
 assert.throws(()=>model.quoteTotals(1,'true'));
});
test('OS15 deterministic periods reconcile to the displayed synthetic totals',()=>{
 assert.equal(model.periodData(7).total,6320000);assert.equal(model.periodData(30).total,14200000);
 for(const period of [7,30,90]){const d=model.periodData(period);assert.equal(d.values.length,d.labels.length);assert.equal(d.total,d.values.reduce((a,b)=>a+b,0));}
 assert.throws(()=>model.periodData(60));assert.equal(model.averageProgress(),68);assert.equal(model.DEMO_PROJECTS.length,3);
 const changed=model.periodData(30);changed.values[0]=0;assert.equal(model.periodData(30).values[0],1200000);
});
test('OS15 browser artifact has no business calls, privileged keys, or markup from input',()=>{
 const runtime=read('src/lib/lab/runtime.ts'),html=read('src/lib/lab/document.ts');
 assert.doesNotMatch(runtime,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|service_role|sb_secret_|\.innerHTML\s*=|eval\s*\(/);
 assert.doesNotMatch(html,/<(?:script|img|link)[^>]+(?:src|href)=["']https?:/i);
 assert.match(runtime,/textContent/);assert.match(html,/DEMO · DATOS SINTÉTICOS/);
 assert.match(html,/Sin validez comercial ni fiscal/);assert.match(html,/<noscript>/);
});
test('OS15 respects reduced motion, native dialogs and bounded animation delays',()=>{
 const runtime=read('src/lib/lab/runtime.ts');
 assert.match(runtime,/prefers-reduced-motion: reduce/);assert.match(runtime,/manualReduced\|\|motionQuery\.matches/);
 assert.match(runtime,/\.showModal\(\)/);assert.match(runtime,/lastTrigger\.focus/);
 assert.match(runtime,/Math\.min\(i\*35,280\)/);assert.match(runtime,/cancelAnimationFrame/);
 assert.match(labStyle,/@media\(prefers-reduced-motion:reduce\)/);assert.match(labStyle,/@media print/);
 assert.match(labStyle,/@media\(max-width:350px\)/);
});
test('OS15 Next entry point is additive and guarded, without operational dependencies',()=>{
 const route=read('src/app/laboratorio/route.ts');
 assert.match(route,/createLabResponse\(labDocument,labRuntime/);assert.match(route,/VERCEL_ENV/);
 assert.doesNotMatch(route,/supabase|rpc\(|auth\/|WRITES_ENABLED|AGENT_PROPOSALS_ENABLED/);
});
