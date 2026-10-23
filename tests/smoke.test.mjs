import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Seven sections are declared',()=>{
 const s=readFileSync('src/lib/modules.ts','utf8');
 for (const route of ['resumen','prospectos','proyectos','cotizaciones','tareas','finanzas','jose-luis']) assert.match(s,new RegExp("slug:'"+route+"'"));
});
test('No live user or customer connection',()=>{
 const file=readFileSync('src/app/api/health/route.ts','utf8');
 assert.match(file,/preview-no-data/);
});
test('Indexing disabled',()=>{
 const c=readFileSync('next.config.ts','utf8');
 assert.match(c,/noindex, nofollow/);
});
