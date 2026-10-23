import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allowedBySection, canVisit, isTeamRole, isWorkspacePath } from '../src/lib/auth/roles.ts';

test('Roles reject untrusted values and include only staff roles', () => {
  for (const r of ['owner','sales','production']) assert.equal(isTeamRole(r), true);
  for (const r of ['agent','superadmin','anonymous',null,'']) assert.equal(isTeamRole(r), false);
});
test('Owner can view all workplace routes', () => {
  for (const section of Object.keys(allowedBySection)) assert.equal(canVisit('owner',section), true);
});
test('Sales cannot access owner financial and agent surfaces', () => {
  for (const section of ['finanzas','jose-luis','equipo']) assert.equal(canVisit('sales',section), false);
  for (const section of ['resumen','prospectos','cotizaciones','tareas']) assert.equal(canVisit('sales',section), true);
});
test('Production cannot see sales proposals or owner finances', () => {
  for (const section of ['prospectos','cotizaciones','finanzas','jose-luis','equipo']) assert.equal(canVisit('production',section), false);
  for (const section of ['resumen','proyectos','tareas']) assert.equal(canVisit('production',section), true);
});
test('No role -> no access, and paths are an allowlist', () => {
  assert.equal(canVisit(undefined,'finanzas'), false);
  assert.equal(canVisit('owner','does-not-exist'),false);
  assert.equal(isWorkspacePath('/finanzas'),true);
  assert.equal(isWorkspacePath('/finanzas/../../other'),false);
  assert.equal(isWorkspacePath('/api/health'),false);
});
test('Server trust boundaries are required and there is no public sign-up', () => {
  const session = readFileSync('src/lib/auth/session.ts','utf8');
  const proxy = readFileSync('src/proxy.ts','utf8');
  const actions = readFileSync('src/lib/auth/actions.ts','utf8');
  assert.match(session, /auth\.getUser\(\)/);
  assert.match(session, /from\('os_staff'\)/);
  assert.match(session, /bound_user_id !== user\.id/);
  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.doesNotMatch(actions, /auth\.signUp\(/);
});
