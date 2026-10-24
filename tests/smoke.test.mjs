import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Seven sections are declared',()=>{
 const s=readFileSync('src/lib/modules.ts','utf8');
 for (const route of ['resumen','prospectos','proyectos','cotizaciones','tareas','finanzas','jose-luis']) assert.match(s,new RegExp("slug:'"+route+"'"));
});
test('No business records are exposed in the auth preview',()=>{
 const file=readFileSync('src/app/api/health/route.ts','utf8');
 assert.match(file,/quotes-review-preview-readonly/);
});
test('Indexing disabled',()=>{
 const c=readFileSync('next.config.ts','utf8');
 assert.match(c,/noindex, nofollow/);
});
