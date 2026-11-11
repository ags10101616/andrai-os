import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');

test('Entry checks verified staff first, and only then the independent agent', () => {
  const source = read('src/lib/auth/entry.ts');
  assert.match(source, /await resolveSession\(\)/);
  assert.match(source, /if \(staff\.kind === 'member'\) return 'resumen'/);
  assert.match(source, /if \(staff\.kind === 'signed-out'\) return 'login'/);
  assert.match(source, /await resolveAgentSession\(\)/);
  assert.match(source, /if \(dot\.kind === 'agent'\) return 'agente'/);
  assert.match(source, /return 'restricted'/);
  assert.ok(source.indexOf('await resolveSession()') < source.indexOf('await resolveAgentSession()'));
  assert.doesNotMatch(source, /service_role|signInAnonymously|admin\.createUser/);
});

test('A valid session goes to the correct protected workspace', () => {
  const entry = read('src/app/entrada/page.tsx');
  const login = read('src/app/login/page.tsx');
  const home = read('src/app/page.tsx');
  const auth = read('src/lib/auth/actions.ts');
  assert.match(entry, /resolveWorkspaceLanding\(\)/);
  assert.match(entry, /redirect\('\/resumen'\)/);
  assert.match(entry, /redirect\('\/agente'\)/);
  assert.match(entry, /redirect\('\/acceso-restringido'\)/);
  assert.match(entry, /redirect\('\/login'\)/);
  assert.match(login, /await resolveWorkspaceLanding\(\)/);
  assert.match(login, /href="\/recuperar-acceso"/);
  assert.match(home, /redirect\('\/entrada'\)/);
  assert.match(auth, /auth\.signInWithPassword\(/);
  assert.match(auth, /redirect\('\/entrada'\)/);
});

test('No login bypass: workspace still checks identity and role on the server', () => {
  const proxy = read('src/proxy.ts');
  const agent = read('src/lib/agent/session.ts');
  const staff = read('src/lib/auth/session.ts');
  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.match(agent, /auth\.getUser\(\)/);
  assert.match(agent, /\.eq\('status','active'\)/);
  assert.match(staff, /auth\.getUser\(\)/);
  assert.match(staff, /\.eq\('bound_user_id',user\.id\)|row\.bound_user_id !== user\.id/);
  assert.doesNotMatch(read('src/app/entrada/page.tsx'), /service_role|secret|token_hash|access_token/);
});
