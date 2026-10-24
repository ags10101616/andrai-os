import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 isFinanceEntryType,isFinanceMethod,safeFinanceTotal,minorAmount,signedMoneyMXN
} from '../src/lib/finance/model.ts';

test('Only explicit ledger types and methods are permitted',()=>{
 for(const type of ['receipt','expense','refund'])assert.equal(isFinanceEntryType(type),true);
 for(const type of ['charge','stripe','debit','income','payment_verified',null])assert.equal(isFinanceEntryType(type),false);
 for(const method of ['transfer','cash','card','other'])assert.equal(isFinanceMethod(method),true);
 for(const method of ['wire-confirmed','bank-connected',undefined])assert.equal(isFinanceMethod(method),false);
});
test('Accounting is integer MXN, including a negative net movement',()=>{
 assert.equal(minorAmount(650000),650000);
 assert.throws(()=>minorAmount(-1));
 assert.throws(()=>minorAmount(650000.5));
 assert.equal(safeFinanceTotal(1000000000000),1000000000000);
 assert.throws(()=>safeFinanceTotal(-100));
 assert.match(signedMoneyMXN(650000),/6,500\.00/);
 assert.match(signedMoneyMXN(-20000),/200\.00/);
});
test('Quote receipts and refunds are protected by immutable database triggers',()=>{
 const sql=readFileSync('docs/sql/OS-08_MANUAL_FINANCE_LEDGER.sql','utf8');
 assert.match(sql,/security invoker/g);
 assert.match(sql,/os08_validate_manual_entry/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/new\.entry_type='refund'/);
 assert.match(sql,/net_paid\+new\.amount_minor>quote_record\.total_minor/);
 assert.match(sql,/net_paid-new\.amount_minor<0/);
 assert.match(sql,/create trigger os08_no_mutations/);
 assert.match(sql,/os_private\.member_role\(new\.organization_id\)<>'owner'/);
});
test('Summary totals use all records and accepted quotes only',()=>{
 const sql=readFileSync('docs/sql/OS-08_MANUAL_FINANCE_LEDGER.sql','utf8');
 assert.match(sql,/function public\.os08_finance_summary_v1/);
 assert.match(sql,/q\.status='accepted'/);
 assert.match(sql,/function public\.os08_quote_balances_v1/);
 assert.match(sql,/left join public\.os_ledger/);
});
test('The server enforces access and the release gate',()=>{
 const actions=readFileSync('src/app/finanzas/actions.ts','utf8');
 const data=readFileSync('src/lib/finance/data.ts','utf8');
 assert.match(actions,/OS08_FINANCE_WRITES_ENABLED!=='true'/);
 assert.match(actions,/await requireMembership\('finanzas'\)/);
 assert.match(actions,/os08_record_manual_entry_v1/);
 assert.match(data,/await requireMembership\('finanzas'\)/);
 assert.match(data,/os08_finance_summary_v1/);
 assert.match(data,/os08_quote_balances_v1/);
 assert.doesNotMatch(actions,/service_role/);
});
test('The finance form makes manual-only semantics explicit',()=>{
 const form=readFileSync('src/components/finance/ManualEntryForm.tsx','utf8');
 const page=readFileSync('src/app/finanzas/page.tsx','utf8');
 assert.match(form,/sessionStorage\.getItem\(KEY\)/);
 assert.match(form,/entry_id/);
 assert.match(page,/registra movimientos internos declarados manualmente/);
 assert.match(page,/Sin saldos de cotizaciones aceptadas/);
});
