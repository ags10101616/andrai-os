import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');

test('Password recovery request does not reveal account existence',()=>{
 const action=read('src/app/recuperar-acceso/actions.ts');
 const page=read('src/app/recuperar-acceso/page.tsx');
 assert.match(action,/auth\.resetPasswordForEmail\(email\)/);
 assert.match(action,/let result:'sent'/);
 assert.match(page,/Si existe una cuenta con ese correo/);
 assert.doesNotMatch(action,/service_role|auth\.admin|createUser|console\./);
});
test('One-time token hash is verified and never forwarded',()=>{
 const source=read('src/app/auth/confirm/route.ts');
 assert.match(source,/type!=='recovery'/);
 assert.match(source,/auth\.verifyOtp\(\{token_hash,type:'recovery'\}\)/);
 assert.match(source,/\/restablecer-contrasena/);
 assert.match(source,/\/recuperar-acceso\?state=expired/);
 assert.match(source,/no-store/);
 assert.doesNotMatch(source,/console\.|searchParams\.set|service_role/);
});
test('Password update requires a verified session and matching password',()=>{
 const action=read('src/app/restablecer-contrasena/actions.ts');
 const page=read('src/app/restablecer-contrasena/page.tsx');
 assert.match(action,/auth\.getUser\(\)/);
 assert.match(action,/auth\.updateUser\(\{password\}\)/);
 assert.match(action,/auth\.signOut\(\)/);
 assert.match(action,/password.length<12/);
 assert.match(action,/password!==confirmation/);
 assert.match(page,/autoComplete="new-password"/);
 assert.doesNotMatch(action,/service_role|auth\.admin|console\./);
});
test('Login has recovery and success feedback',()=>{
 const source=read('src/app/login/page.tsx');
 assert.match(source,/href="\/recuperar-acceso"/);
 assert.match(source,/reset === 'ok'/);
 assert.doesNotMatch(source,/token_hash|access_token|refresh_token/);
});
test('Site URL and email template configuration is explicitly documented',()=>{
 const doc=read('docs/specs/OS-12_PASSWORD_RECOVERY.md');
 assert.match(doc,/localhost:3000/);
 assert.match(doc,/Authentication.*URL Configuration/);
 assert.match(doc,/\.TokenHash/);
 assert.match(doc,/type=recovery/);
 assert.match(doc,/Reset Password/);
 assert.match(doc,/Vercel Authentication/);
});
