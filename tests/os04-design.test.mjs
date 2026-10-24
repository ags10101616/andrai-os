import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('src/app/globals.css','utf8');
const palette=readFileSync('src/styles/tokens.css','utf8');
const shell=readFileSync('src/components/AppShell.tsx','utf8');
const overview=readFileSync('src/components/Overview.tsx','utf8');
const layout=readFileSync('src/app/layout.tsx','utf8');

test('Spectral Ember uses semantic tokens and controlled accent',()=>{
  assert.match(css, /@import "\.\.\/styles\/tokens\.css"/);
  for (const hex of ['#0c0e0d','#f3f0e8','#ff6036','#a94020']) assert.ok(palette.includes(hex));
  assert.match(palette,/--brand-secondary:/);
});
test('Manrope is bundled through Next.js font optimization',()=>{
  assert.match(layout,/next\/font\/google/);
  assert.match(layout,/Manrope\(/);
  assert.match(layout,/className=\{manrope.variable\}/);
});
test('Shell includes keyboard bypass, section roles and labels',()=>{
  assert.match(shell,/href="#workspace-main"/);
  assert.match(shell,/id="workspace-main"/);
  assert.match(shell,/aria-current=/);
  assert.match(shell,/canVisit\(role, m.slug\)/);
});
test('Dashboard is composed from reusable UI primitives',()=>{
  for (const name of ['EmptyState','MetricTile','SectionSurface','StatusTag']) assert.match(overview,new RegExp(name));
  assert.doesNotMatch(overview,/\$\d/);
  assert.match(overview,/Sin cifras simuladas/);
});
