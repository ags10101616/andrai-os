import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('docs/sql/OS-03_ATOMIC_LEAD.sql','utf8');
const dataLayer = readFileSync('src/lib/data/leads.ts','utf8');

test('RPC is SECURITY INVOKER with only authenticated EXECUTE', () => {
  assert.match(migration,/function public\.os_create_lead_v1\(/);
  assert.match(migration,/security invoker/);
  assert.match(migration,/from public, anon, authenticated/);
  assert.match(migration,/to authenticated/);
});
test('Tenant is resolved from verified membership rather than caller input', () => {
  assert.match(migration,/s\.bound_user_id = v_user_id/);
  assert.match(migration,/os_private\.member_role\(s\.organization_id\)/);
  assert.doesNotMatch(migration,/p_organization_id/i);
  assert.doesNotMatch(dataLayer,/service_role/i);
});
test('Both writes happen in one RPC with idempotency protection', () => {
  assert.match(migration,/insert into public\.os_clients/);
  assert.match(migration,/insert into public\.os_opportunities/);
  assert.match(migration,/on conflict \(id\) do nothing/g);
  assert.match(migration,/Opportunity idempotency conflict/);
});
test('Identifiers and tenant cannot be reassigned by UPDATE', () => {
  for(const table of ['clients','opportunities','projects','tasks','quotes']) {
    assert.match(migration,new RegExp('create trigger os_'+table+'_immutability'));
  }
  assert.match(migration,/new\.organization_id is distinct from old\.organization_id/);
});
test('Data layer is server-only and fails closed', () => {
  assert.match(dataLayer,/import 'server-only'/);
  assert.match(dataLayer,/await requireMembership\('prospectos'\)/);
  assert.match(dataLayer,/await db\.rpc\('os_create_lead_v1'/);
  assert.match(dataLayer,/retry with the same request IDs/);
});
