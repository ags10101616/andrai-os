import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/sql/OS-07_QUOTES_LIFECYCLE.sql','utf8');
const patch=readFileSync('docs/sql/OS-07_PATCH_DERIVED_AMOUNT.sql','utf8');
const actions=readFileSync('src/app/cotizaciones/actions.ts','utf8');
const route=readFileSync('src/app/cotizaciones/[id]/pdf/route.ts','utf8');
const doc=readFileSync('src/lib/quotes/data.ts','utf8');

test('Quote lifecycle is versioned and enforces owner-only approval',()=>{
 for(const name of ['os07_create_quote_v1','os07_replace_draft_v1','os07_transition_v1']) assert.match(sql,new RegExp(name));
 assert.match(sql,/p_action='approve'.*role_name='owner'/);
 assert.match(sql,/quote_snapshots/);
 assert.match(sql,/snapshot_on_review/);
 assert.match(sql,/security invoker/);
});
test('Quote amounts are derived in PostgreSQL and not supplied by browser',()=>{
 assert.match(sql,/new.amount_minor:=subtotal/);
 assert.match(sql,/new.tax_minor:=/);
 assert.match(patch,/alter column amount_minor set default 0/);
 assert.doesNotMatch(actions,/p_amount_minor:/);
});
test('All mutations are gated by server env and member permissions',()=>{
 assert.match(actions,/OS07_QUOTES_WRITES_ENABLED==='true'/);
 assert.match(actions,/await requireMembership\('cotizaciones'\)/);
 assert.match(actions,/revalidatePath\('\/cotizaciones'\)/);
 assert.doesNotMatch(actions,/service_role/);
});
test('PDF downloads verify session, load RLS data and block caching',()=>{
 assert.match(route,/getQuoteDetail\(id\)/);
 assert.match(doc,/await requireMembership\('cotizaciones'\)/);
 assert.match(route,/private, no-store/);
 assert.match(route,/application\/pdf/);
});
test('Snapshots are read-only to API roles',()=>{
 assert.match(sql,/revoke all on public\.os_quote_snapshots from public,anon,authenticated/);
 assert.match(sql,/create policy os07_snapshots_read/);
});
