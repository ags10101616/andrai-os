-- OS-11 reversible DB QA: transactional event capture, role isolation,
-- no external dispatch, no retained synthetic events or client data.
begin;
select set_config('request.jwt.claim.sub',s.bound_user_id::text,true)
 from public.os_staff s
 where s.active and s.role='owner' and s.bound_user_id is not null limit 1;
set local role authenticated;
do $test$
declare
 v_client uuid:=gen_random_uuid();
 v_opp uuid:=gen_random_uuid();
 v_project uuid:=gen_random_uuid();
 v_task uuid:=gen_random_uuid();
 v_quote uuid:=gen_random_uuid();
 v_expense uuid:=gen_random_uuid();
 v_expected bigint;
 v_audit bigint;
 v_events bigint;
 v_sales bigint;
 v_operations bigint;
 v_commerce bigint;
 v_finance bigint;
 v_feed bigint;
 v_report jsonb;
 v_d integer;
begin
 perform * from public.os_create_lead_v1(
   v_client,v_opp,'OS11 Synthetic Customer','',null,null,'QA',
   'OS11 synthetic opportunity',10000,'Schedule test call',current_date
 );
 perform * from public.os06_create_project_v1(
   v_project,v_client,'OS11 test project',current_date+5,null,10000
 );
 perform * from public.os06_create_task_v1(
   v_task,'Prepare synthetic task','',current_date+1,v_project,null,null,
   'task','normal'
 );
 perform * from public.os07_create_quote_v1(
   v_quote,v_client,null,'OS11 test quote',
   '[{"description":"Test work","quantity":1,"unit_minor":10000}]'::jsonb,
   1600,current_date+10,'Only test data'
 );
 perform * from public.os07_transition_v1(v_quote,1,'submit');
 perform * from public.os08_record_manual_entry_v1(
   v_expense,'expense',5000,'OS11 synthetic cost','other',current_date,
   'Test expense',null,null
 );

 select count(*) into v_audit from public.os_audit_events;
 select count(*) into v_events from public.os_event_outbox;
 if v_audit<>v_events then
  raise exception 'Event outbox count % did not match audit count %',v_events,v_audit;
 end if;
 if v_events<8 then raise exception 'Expected 8+ audited events, got %',v_events;end if;

 select count(*) filter(where event_class='sales'),
  count(*) filter(where event_class='operations'),
  count(*) filter(where event_class='commerce'),
  count(*) filter(where event_class='finance')
 into v_sales,v_operations,v_commerce,v_finance
 from public.os_event_outbox;
 if v_sales<>2 or v_operations<>2 or v_commerce<3 or v_finance<>1 then
  raise exception 'Event classification incorrect: % % % %',
   v_sales,v_operations,v_commerce,v_finance;end if;
 if exists(select 1 from public.os_event_outbox where dispatch_state<>'held') then
  raise exception 'Outbox dispatch state is not held';end if;

 foreach v_d in array array[7,30,90] loop
  v_report:=public.os11_event_summary_v1(v_d);
  if (v_report->>'total')::bigint<>v_events
    or (v_report->>'held')::bigint<>v_events
    or (v_report->>'external_dispatched')::bigint<>0
  then raise exception 'Summary counts inconsistent at % days: %',v_d,v_report;end if;
  select count(*) into v_feed from public.os11_event_feed_v1(v_d,50);
  if v_feed<>v_events then
   raise exception 'Feed count % differs from events %',v_feed,v_events;end if;
 end loop;

 begin
  perform public.os11_event_summary_v1(14);
  raise exception 'Unapproved report window allowed';
 exception when invalid_parameter_value then null;
 end;
 begin
  perform * from public.os11_event_feed_v1(30,101);
  raise exception 'Feed limit >100 was allowed';
 exception when invalid_parameter_value then null;
 end;
 if has_table_privilege('authenticated','public.os_event_outbox','INSERT')
   or has_table_privilege('authenticated','public.os_event_outbox','UPDATE')
   or has_table_privilege('authenticated','public.os_event_outbox','DELETE')
   or has_function_privilege('anon','public.os11_event_feed_v1(integer,integer)','EXECUTE')
 then raise exception 'Unsafe outbox privileges';end if;
end $test$;

-- Simulate a nonowner account: the rows stay in the transaction, but cannot be read.
reset role;
update public.os_staff set role='sales'
 where active and bound_user_id=current_setting('request.jwt.claim.sub')::uuid;
set local role authenticated;
do $sales$
declare v_events bigint;
begin
 select count(*) into v_events from public.os_event_outbox;
 if v_events<>0 then raise exception 'Sales can read owner event history';end if;
 begin
  perform public.os11_event_summary_v1(30);
  raise exception 'Sales could access Direction event summary';
 exception when insufficient_privilege then null;
 end;
 begin
  perform * from public.os11_event_feed_v1(30,20);
  raise exception 'Sales could access Direction event feed';
 exception when insufficient_privilege then null;
 end;
end $sales$;

reset role;
update public.os_staff set role='production'
 where active and bound_user_id=current_setting('request.jwt.claim.sub')::uuid;
set local role authenticated;
do $production$
declare v_events bigint;
begin
 select count(*) into v_events from public.os_event_outbox;
 if v_events<>0 then raise exception 'Production can read owner event history';end if;
 begin
  perform public.os11_event_summary_v1(30);
  raise exception 'Production could access Direction event summary';
 exception when insufficient_privilege then null;
 end;
end $production$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $unbound$
begin
 begin
  perform public.os11_event_summary_v1(30);
  raise exception 'Unbound identity read event summary';
 exception when insufficient_privilege then null;
 end;
end $unbound$;
rollback;
