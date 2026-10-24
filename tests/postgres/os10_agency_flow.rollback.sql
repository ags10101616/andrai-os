-- ANDRAI OS OS-10: integrated agency process using synthetic records.
-- ALL WRITES ARE ROLLED BACK, including audit entries and role simulations.
-- Run only against the isolated ANDRAI OS project with SQL administration rights.
-- No Auth password or personal ID appears in this file.
begin;
select set_config('request.jwt.claim.sub',s.bound_user_id::text,true)
from public.os_staff s where s.role='owner' and s.active and s.bound_user_id is not null limit 1;
set local role authenticated;
do $pilot$
declare
 v_client uuid:=gen_random_uuid();
 v_opportunity uuid:=gen_random_uuid();
 v_quote uuid:=gen_random_uuid();
 v_project uuid:=gen_random_uuid();
 v_task_open uuid:=gen_random_uuid();
 v_task_done uuid:=gen_random_uuid();
 v_receipt uuid:=gen_random_uuid();
 v_expense uuid:=gen_random_uuid();
 v_conflict uuid:=gen_random_uuid();
 v_lines jsonb:='[{"description":"OS10 site build","quantity":1,"unit_minor":650000}]'::jsonb;
 v_day date:=(now() at time zone 'America/Monterrey')::date;
 v_new boolean;v_rev integer;v_snapshots integer;v_count integer;
 v_finance record;v_dashboard jsonb;
begin
 -- Prospect -> atomic client and opportunity
 select created into v_new from public.os_create_lead_v1(
  v_client,v_opportunity,'OS10 Client QA','','',null,'QA',
  'OS10 synthetic website opportunity',650000,'Next agency action',v_day-1);
 if v_new is distinct from true then raise exception 'Client/opportunity not created';end if;
 select created into v_new from public.os_create_lead_v1(
  v_client,v_opportunity,'OS10 Client QA','','',null,'QA',
  'OS10 synthetic website opportunity',650000,'Next agency action',v_day-1);
 if v_new is distinct from false then raise exception 'Lead replay duplicated records';end if;

 -- Quote with exact centavos, one immutable review snapshot, approval
 select created into v_new from public.os07_create_quote_v1(
  v_quote,v_client,null,'OS10 initial commercial quote',v_lines,1600,v_day+15,'QA only');
 if v_new is distinct from true then raise exception 'Quote was not created';end if;
 if (select total_minor from public.os_quotes where id=v_quote)<>754000
 then raise exception 'Quote total != MXN 7540.00';end if;
 perform * from public.os07_transition_v1(v_quote,1,'submit');
 select count(*) into v_snapshots from public.os_quote_snapshots where quote_id=v_quote;
 if v_snapshots<>1 then raise exception 'Review snapshot not created';end if;
 perform * from public.os07_transition_v1(v_quote,2,'approve');
 perform * from public.os07_transition_v1(v_quote,3,'sent');
 perform * from public.os07_transition_v1(v_quote,4,'accept');
 if (select status from public.os_quotes where id=v_quote)<>'accepted'
 then raise exception 'Client acceptance record not registered';end if;
 begin
   delete from public.os_quote_snapshots where quote_id=v_quote;
   raise exception 'Historic quote snapshot was deletable';
 exception when insufficient_privilege then null;
 end;

 -- Project and deliverables linked to same client, one completion
 select created into v_new from public.os06_create_project_v1(
  v_project,v_client,'OS10 QA implementation',v_day+20,null,650000);
 if v_new is distinct from true then raise exception 'Project creation failed';end if;
 perform * from public.os06_set_project_stage_v1(v_project,1,'design',15);
 begin
  perform * from public.os06_set_project_stage_v1(v_project,1,'development',45);
  raise exception 'Stale project edit not blocked';
 exception when serialization_failure then null;
 end;
 select created into v_new from public.os06_create_task_v1(
  v_task_open,'OS10 pending deliverable','',v_day-1,v_project,null,null,'deliverable','urgent');
 if v_new is distinct from true then raise exception 'Open deliverable failed';end if;
 select created into v_new from public.os06_create_task_v1(
  v_task_done,'OS10 reviewed task','',v_day,v_project,null,null,'task','normal');
 if v_new is distinct from true then raise exception 'Completed task create failed';end if;
 perform * from public.os06_set_task_done_v1(v_task_done,1,true);
 if not exists(select 1 from public.os_tasks where id=v_task_done and completed_at is not null)
 then raise exception 'Completed task missing timestamp';end if;

 -- Manual money event, no external Stripe/bank claim
 select created into v_new from public.os08_record_manual_entry_v1(
  v_receipt,'receipt',450000,'OS10-qa-manual-receipt','transfer',v_day,
  'Synthetic reported advance',v_quote,null);
 if v_new is distinct from true then raise exception 'Manual receipt create failed';end if;
 select created into v_new from public.os08_record_manual_entry_v1(
  v_receipt,'receipt',450000,'OS10-qa-manual-receipt','transfer',v_day,
  'Synthetic reported advance',v_quote,null);
 if v_new is distinct from false then raise exception 'Retry duplicated manual payment';end if;
 select created into v_new from public.os08_record_manual_entry_v1(
  v_expense,'expense',120000,'OS10-qa-expense','card',v_day,
  'Synthetic operating cost',null,v_project);
 if v_new is distinct from true then raise exception 'Manual expense create failed';end if;
 begin
  perform * from public.os08_record_manual_entry_v1(
   v_conflict,'receipt',304001,'OS10-excess-receipt','transfer',v_day,
   'Must reject overpayment',v_quote,null);
  raise exception 'Overpayment allowed';
 exception when invalid_parameter_value then null;
 end;

 -- Both financial summaries derive from actual authorised SQL rows, not UI truncation
 select * into v_finance from public.os08_finance_summary_v1();
 if v_finance.receipts_minor<>450000 or v_finance.expenses_minor<>120000
   or v_finance.net_movement_minor<>330000
   or v_finance.accepted_quote_total_minor<>754000
   or v_finance.accepted_quote_open_minor<>304000
 then raise exception 'Finance reconciliation failed: %',row_to_json(v_finance);end if;

 -- The dashboard is consistent with all source modules
 v_dashboard:=public.os09_dashboard_v1(30);
 if v_dashboard->>'role'<>'owner'
  or (v_dashboard->'sales'->>'active_opportunities')::integer<>1
  or (v_dashboard->'sales'->>'quotes_total')::integer<>1
  or (v_dashboard->'operations'->>'active')::integer<>1
  or (v_dashboard->'tasks'->>'open')::integer<>1
  or (v_dashboard->'tasks'->>'completed_in_period')::integer<>1
  or (v_dashboard->'finance'->>'receipts_in_period_minor')::bigint<>450000
  or (v_dashboard->'finance'->>'net_in_period_minor')::bigint<>330000
  or (v_dashboard->'finance'->>'accepted_open_minor_all')::bigint<>304000
 then raise exception 'Cross-module dashboard mismatch: %',v_dashboard;end if;

 select count(*) into v_count from public.os_audit_events
 where (entity='os_clients' and entity_id=v_client)
   or (entity='os_opportunities' and entity_id=v_opportunity)
   or (entity='os_quotes' and entity_id=v_quote)
   or (entity='os_projects' and entity_id=v_project)
   or (entity='os_tasks' and entity_id in (v_task_open,v_task_done))
   or (entity='os_ledger' and entity_id in (v_receipt,v_expense));
 if v_count<8 then raise exception 'Expected cross-module audit trail';end if;
end $pilot$;
rollback;

-- A second read must show unchanged row counts, normally zero in this workspace.
