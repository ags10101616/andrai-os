-- OS-08 · Manual cashbook / quote settlement. All QA rows are ROLLED BACK.
-- The ledger is a manually entered record, NOT a bank-verified payment.
begin;
with seed as (
 insert into public.os_clients(id,organization_id,name,source)
 select gen_random_uuid(),organization_id,'OS08 QA Synthetic Customer','QA'
 from public.os_staff where role='owner' and active and bound_user_id is not null
 limit 1 returning id
) select set_config('os08.test_client',id::text,true) from seed;
select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='owner' and active and bound_user_id is not null
 limit 1;
set local role authenticated;
do $test$
declare
 v_customer uuid:=current_setting('os08.test_client')::uuid;
 v_quote uuid:=gen_random_uuid();
 v_receipt uuid:=gen_random_uuid();
 v_refund uuid:=gen_random_uuid();
 v_expense uuid:=gen_random_uuid();
 v_bad uuid:=gen_random_uuid();
 v_lines jsonb:='[{"description":"OS08 QA Web","quantity":1,"unit_minor":1000000}]'::jsonb;
 v_created boolean;
 v_count integer;
 v_summary record;
begin
 select created into v_created from public.os07_create_quote_v1(
  v_quote,v_customer,null,'OS08 Temporal Quote',v_lines,1600,current_date+10,'QA, not for customers'
 );
 if v_created is distinct from true then raise exception 'Quote setup failed';end if;

 begin
  perform * from public.os08_record_manual_entry_v1(
   v_receipt,'receipt',650000,'QA-bank-001','transfer',current_date,'Deposit',v_quote,null
  );
  raise exception 'Premature receipt accepted';
 exception when insufficient_privilege then null;
 end;
 perform * from public.os07_transition_v1(v_quote,1,'submit');
 perform * from public.os07_transition_v1(v_quote,2,'approve');
 perform * from public.os07_transition_v1(v_quote,3,'sent');

 select created into v_created from public.os08_record_manual_entry_v1(
  v_receipt,'receipt',650000,'QA-bank-001','transfer',current_date,'Deposit',v_quote,null);
 if v_created is distinct from true then raise exception 'Receipt was not created';end if;
 select created into v_created from public.os08_record_manual_entry_v1(
  v_receipt,'receipt',650000,'QA-bank-001','transfer',current_date,'Deposit',v_quote,null);
 if v_created is distinct from false then raise exception 'Idempotent replay duplicated receipt';end if;

 begin
  perform * from public.os08_record_manual_entry_v1(
   v_receipt,'receipt',650001,'QA-bank-001','transfer',current_date,'Deposit',v_quote,null);
  raise exception 'Changed UUID payload accepted';
 exception when unique_violation then null;
 end;

 begin
  perform * from public.os08_record_manual_entry_v1(
   v_bad,'receipt',510001,'QA-bank-overpay','transfer',current_date,'Excess',v_quote,null);
  raise exception 'Overpayment accepted';
 exception when invalid_parameter_value then null;
 end;

 begin
  perform * from public.os08_record_manual_entry_v1(
   v_bad,'refund',650001,'QA-bank-overrefund','transfer',current_date,'Excess',v_quote,null);
  raise exception 'Over-refund accepted';
 exception when invalid_parameter_value then null;
 end;

 select created into v_created from public.os08_record_manual_entry_v1(
  v_refund,'refund',200000,'QA-refund-001','transfer',current_date,'Manual refund',v_quote,null);
 if v_created is distinct from true then raise exception 'Refund was not created';end if;

 select created into v_created from public.os08_record_manual_entry_v1(
  v_expense,'expense',250000,'QA-license-001','card',current_date,'Internal license',null,null);
 if v_created is distinct from true then raise exception 'Expense was not created';end if;

 -- An emailed proposal is not an account receivable until recorded as accepted.
 select * into v_summary from public.os08_finance_summary_v1();
 if v_summary.accepted_quote_total_minor<>0 or v_summary.accepted_quote_open_minor<>0
 then raise exception 'Sent proposal counted as accepted debt';end if;

 perform * from public.os07_transition_v1(v_quote,4,'accept');
 select * into v_summary from public.os08_finance_summary_v1();
 if v_summary.receipts_minor<>650000 or v_summary.expenses_minor<>250000
 or v_summary.refunds_minor<>200000 or v_summary.net_movement_minor<>200000
 or v_summary.accepted_quote_total_minor<>1160000 or
 v_summary.accepted_quote_open_minor<>710000
 then raise exception 'Summary reconciliation wrong: %',row_to_json(v_summary);end if;

 select count(*) into v_count from public.os08_quote_balances_v1() qb
 where qb.quote_id=v_quote and qb.quote_total_minor=1160000
   and qb.received_minor=650000 and qb.refunded_minor=200000
   and qb.remaining_minor=710000;
 if v_count<>1 then raise exception 'Per-quote balance incorrect';end if;
 select count(*) into v_count from public.os_ledger where quote_id=v_quote;
 if v_count<>2 then raise exception 'Unexpected quote movements';end if;
 select count(*) into v_count from public.os_audit_events where entity='os_ledger';
 if v_count<>3 then raise exception 'Expected three audited manual events, got %',v_count;end if;

 begin
  update public.os_ledger set amount_minor=1 where id=v_receipt;
  raise exception 'Manual movement was mutable';
 exception when insufficient_privilege then null;
 end;
 begin
  delete from public.os_ledger where id=v_receipt;
  raise exception 'Manual movement was deletable';
 exception when insufficient_privilege then null;
 end;
 -- A forged direct insert still passes the database validation trigger.
 begin
  insert into public.os_ledger(id,organization_id,quote_id,kind,entry_type,
  amount_minor,reference,method,happened_on,entered_by,currency)
  select v_bad,q.organization_id,v_quote,'income','receipt',
   800000,'Direct API overpay','other',current_date,(select auth.uid()),'MXN'
  from public.os_quotes q where q.id=v_quote;
  raise exception 'Direct Data API insert overpaid quote';
 exception when invalid_parameter_value then null;
 end;

 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin
  perform * from public.os08_record_manual_entry_v1(
   v_bad,'expense',100,'Unbound caller','other',current_date,'',null,null);
  raise exception 'Unbound user recorded expense';
 exception when insufficient_privilege then null;
 end;
end $test$;
rollback;

-- After running, the ANDRAI OS commercial row counts must remain unchanged.
