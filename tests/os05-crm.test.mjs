import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMxAmountMinor,formatMxMoneyMinor} from '../src/lib/data/money.ts';
const action=readFileSync('src/app/prospectos/actions.ts','utf8');
const page=readFileSync('src/app/prospectos/page.tsx','utf8');
const form=readFileSync('src/components/crm/LeadIntakeForm.tsx','utf8');
test('Precise MXN amount conversion',()=>{
 assert.equal(parseMxAmountMinor('6500.25'),650025);
 assert.equal(parseMxAmountMinor('6500'),650000);
 assert.equal(parseMxAmountMinor('0.09'),9);
 assert.equal(parseMxAmountMinor(''),0);
 assert.equal(parseMxAmountMinor('0.999'),null);
 assert.equal(parseMxAmountMinor('-2'),null);
 assert.equal(parseMxAmountMinor('1,200.00'),null);
 assert.match(formatMxMoneyMinor(650025),/6,500\.25/);
});
test('The server blocks all writes until review explicitly opts in',()=>{
 assert.match(action,/OS05_CRM_WRITES_ENABLED!=='true'/);
 assert.match(action,/await createLeadAtomic/);
 assert.match(action,/revalidatePath\('\/prospectos'\)/);
});
test('The CRM uses real authorized records and filters',()=>{
 assert.match(page,/await requireMembership\('prospectos'\)/);
 assert.match(page,/await loadPipeline\(stage\)/);
 assert.match(page,/entries\.length===0/);
 assert.doesNotMatch(page,/mock|Math\.random\(/);
});
test('Client retains UUIDs for network retry idempotency',()=>{
 assert.match(form,/sessionStorage\.getItem\(STORE_KEY\)/);
 assert.match(form,/crypto\.randomUUID\(\)/);
 assert.match(form,/formRef\.current\?\.reset\(\)/);
 assert.match(form,/disabled=\{!enabled\|\|pending\|\|!ids\}/);
});
