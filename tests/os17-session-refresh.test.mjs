import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isWorkspacePath, shouldRefreshAuthPath } from '../src/lib/auth/roles.ts';

test('session-aware entry routes refresh cookies without becoming protected workspace paths', () => {
  for (const path of [
    '/', '/entrada', '/login', '/diagnostico-acceso',
    '/acceso-restringido', '/restablecer-contrasena',
  ]) {
    assert.equal(shouldRefreshAuthPath(path), true, path);
    assert.equal(isWorkspacePath(path), false, path);
  }
});

test('nested protected workspace paths retain their session refresh and auth gate', () => {
  for (const path of [
    '/agente', '/agente/resumen', '/resumen',
    '/proyectos/123', '/finanzas', '/cotizaciones/123/pdf',
  ]) {
    assert.equal(shouldRefreshAuthPath(path), true, path);
    assert.equal(isWorkspacePath(path), true, path);
  }
});

test('non-auth unrelated paths are untouched by the session refresh proxy', () => {
  for (const path of [
    '/api/health/private', '/api/health/public',
    '/auth/confirm', '/recuperar-acceso', '/login/extra',
    '/agente/../../finanzas', '/not-found',
  ]) {
    assert.equal(shouldRefreshAuthPath(path), false, path);
  }
});

test('proxy refreshes before server rendering and only redirects protected workspaces', () => {
  const source = readFileSync('src/proxy.ts', 'utf8');
  assert.match(source, /shouldRefreshAuthPath\(pathname\)/);
  assert.match(source, /protectedWorkspace = isWorkspacePath\(pathname\)/);
  assert.match(source, /db\.auth\.getClaims\(\)/);
  assert.match(source, /if \(protectedWorkspace && \(error \|\| !data\?\.claims\)\)/);
  assert.match(source, /request\.cookies\.set\(name, value\)/);
  assert.match(source, /response\.cookies\.set\(name, value, options\)/);
  assert.match(source, /response\.cookies\.getAll\(\)\.forEach\(cookie => redirected\.cookies\.set\(cookie\)\)/);
  assert.match(source, /private, no-store/);
  assert.doesNotMatch(source, /service_role|signInAnonymously|disable.*auth|setTimeout/);
});
