import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEventFeed,parseEventSummary,parseReportingDays} from '../src/lib/events/model.ts';

const summary={
 role:'owner',days:30,
 timezone:'America/Monterrey',
 as_of:'2026-10-24',period_start:'2026-09-25',period_end:'2026-10-24',
 total:8,held:8,external_dispatched:0,
 categories:[
  {key:'sales',count:2},{key:'operations',count:2},
  {key:'commerce',count:3},{key:'finance',count:1}
 ],
 actions:[
  {key:'INSERT',count:7},{key:'UPDATE',count:1},{key:'DELETE',count:0}
 ]
};
const feed=[{
 event_id:'123e4567-e89b-42d3-a456-426614174000',
 event_class:'sales',entity_type:'os_clients',
 source_action:'INSERT',occurred_at:'2026-10-24T15:00:00+00:00',
 dispatch_state:'held'
}];
test('Only approved 7/30/90 reporting windows are accepted',()=>{
 assert.equal(parseReportingDays('7'),7);
 assert.equal(parseReportingDays(90),90);
 assert.equal(parseReportingDays('anything'),30);
 assert.equal(parseReportingDays('14'),30);
});
test('Owner event summary enforces totals, scope and no sending',()=>{
 const s=parseEventSummary(summary,30);
 assert.equal(s.total,8);
 assert.equal(s.held,8);
 assert.equal(s.externalDispatched,0);
 assert.equal(s.categories[2].count,3);
 assert.throws(()=>parseEventSummary({...summary,role:'sales'},30));
 assert.throws(()=>parseEventSummary({...summary,external_dispatched:1},30));
 assert.throws(()=>parseEventSummary({...summary,held:7},30));
 assert.throws(()=>parseEventSummary({...summary,total:9},30));
 assert.throws(()=>parseEventSummary(summary,7));
});
test('Inbound event rows must be sanitized and held',()=>{
 const result=parseEventFeed(feed);
 assert.equal(result[0].eventClass,'sales');
 assert.equal(result[0].dispatchState,'held');
 assert.equal('email' in result[0],false);
 assert.equal('payload' in result[0],false);
 assert.throws(()=>parseEventFeed([{...feed[0],dispatch_state:'sent'}]));
 assert.throws(()=>parseEventFeed([{...feed[0],event_class:'unauthorized'}]));
 assert.throws(()=>parseEventFeed([{...feed[0],occurred_at:'unknown'}]));
});
test('Database uses owner-only RLS, private capture trigger and no deliveries',()=>{
 const sql=readFileSync('docs/sql/OS-11_EVENT_OUTBOX.sql','utf8');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/os_private\.member_role\(organization_id\)='owner'/);
 assert.match(sql,/dispatch_state='held'/);
 assert.match(sql,/security definer/);
 assert.match(sql,/from public\.os_event_outbox/);
 assert.match(sql,/revoke all on table public\.os_event_outbox from public,anon,authenticated/);
 assert.match(sql,/grant select on table public\.os_event_outbox to authenticated/);
 assert.doesNotMatch(sql,/(smtp|send_email|send_whatsapp|service_role)/i);
});
test('Server surfaces read RLS and never give Jose Luis an actor',()=>{
 const data=readFileSync('src/lib/events/data.ts','utf8');
 const roles=readFileSync('src/lib/auth/roles.ts','utf8');
 const page=readFileSync('src/app/eventos/page.tsx','utf8');
 const app=readFileSync('src/components/events/EventInbox.tsx','utf8');
 assert.match(data,/await requireMembership\('eventos'\)/);
 assert.match(data,/db\.rpc\('os11_event_summary_v1'/);
 assert.match(data,/db\.rpc\('os11_event_feed_v1'/);
 assert.match(roles,/eventos: \['owner'\]/);
 assert.match(page,/dynamic='force-dynamic'/);
 assert.match(app,/Notificaciones en preparación, no enviadas/);
 assert.doesNotMatch(data,/(service_role|admin\.listUsers)/i);
});
test('SQL test suite concludes with rollback, not a persistent seed',()=>{
 const fixture=readFileSync('tests/postgres/os11_event_outbox.rollback.sql','utf8');
 assert.match(fixture,/^rollback;/m);
 assert.doesNotMatch(fixture,/\bcommit;/i);
 for(const fn of ['os11_event_summary_v1','os11_event_feed_v1']){
  assert.ok(fixture.includes(fn));
 }
});
