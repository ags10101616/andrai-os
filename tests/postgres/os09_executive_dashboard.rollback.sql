-- OS-09 / Role-sensitive executive reports, exact totals, dates and cross-tenant isolation.
-- SYNTHETIC QA ONLY. All changes are rolled back and do not enter the agency CRM.
begin;
select set_config('request.jwt.claim.sub',s.bound_user_id::text,true)
from public.os_staff s where s.role='owner' and s.active and s.bound_user_id is not null limit 1;
set local role authenticated;
do $owner$
declare
 c uuid:=gen_random_uuid(); opp uuid:=gen_random_uuid();
 proj uuid:=gen_random_uuid(); task_due uuid:=gen_random_uuid();
 task_done uuid:=gen_random_uuid(); quote_id uuid:=gen_random_uuid();
 receipt_id uuid:=gen_random_uuid(); summary jsonb; money jsonb;
 today_local date:=(now() at time zone 'America/Monterrey')::date;
begin
 perform * from public.os_create_lead_v1(
  c,opp,'OS09 Test Client','',null,null,'QA','New proposal',350000,
  'Follow up on quote',today_local-1
 );
 perform * from public.os06_create_project_v1(proj,c,'OS09 Test Project',today_local-1,null,350000);
 perform * from public.os06_create_task_v1(task_due,'Send review update','',
  today_local-1,proj,null,null,'deliverable','high');
 perform * from public.os06_create_task_v1(task_done,'Complete onboarding','',
  today_local,proj,null,null,'task','normal');
 perform * from public.os06_set_task_done_v1(task_done,1,true);
 perform * from public.os07_create_quote_v1(
  quote_id,c,null,'OS09 Accepted Quote',
  '[{"description":"Design system","quantity":1,"unit_minor":1000000}]'::jsonb,
  1600,today_local+10,'Testing only'
 );
 perform * from public.os07_transition_v1(quote_id,1,'submit');
 perform * from public.os07_transition_v1(quote_id,2,'approve');
 perform * from public.os07_transition_v1(quote_id,3,'sent');
 perform * from public.os07_transition_v1(quote_id,4,'accept');
 perform * from public.os08_record_manual_entry_v1(
  receipt_id,'receipt',250000,'OS09 receipt QA','transfer',today_local,'synthetic',
  quote_id,null
 );
 -- Test three accepted reporting windows
 foreach summary in array array[
   public.os09_dashboard_v1(7),
   public.os09_dashboard_v1(30),
   public.os09_dashboard_v1(90)
 ] loop
  if summary->>'role'<>'owner' or not(summary?'finance') then
    raise exception 'Owner financial section omitted';end if;
  if (summary->'sales'->>'active_opportunities')::int<>1
    or (summary->'sales'->>'new_in_period')::int<>1
    or (summary->'sales'->>'overdue_followups')::int<>1
    or (summary->'sales'->>'quotes_total')::int<>1
    or (summary->'operations'->>'active')::int<>1
    or (summary->'operations'->>'overdue')::int<>1
    or (summary->'tasks'->>'open')::int<>1
    or (summary->'tasks'->>'completed_in_period')::int<>1
    or (summary->'tasks'->>'open_deliverables')::int<>1 then
    raise exception 'Role summary mismatch: %',summary;end if;
  money:=summary->'finance';
  if (money->>'receipts_in_period_minor')::bigint<>250000
    or (money->>'net_in_period_minor')::bigint<>250000
    or (money->>'accepted_open_minor_all')::bigint<>910000
    or (money->>'expenses_in_period_minor')::bigint<>0 then
    raise exception 'Owner finance numbers mismatch: %',money;end if;
 end loop;

 begin
  perform public.os09_dashboard_v1(14);
  raise exception 'Unsupported report period accepted';
 exception when invalid_parameter_value then null;
 end;
end $owner$;

-- The report is role-sensitive even if the underlying RLS allows broader
-- workspace SELECT on projects/opportunities.
reset role;
update public.os_staff set role='sales'
where active and bound_user_id=current_setting('request.jwt.claim.sub')::uuid;
set local role authenticated;
do $sales$
declare report jsonb:=public.os09_dashboard_v1(30);
begin
 if report->>'role'<>'sales' or not(report?'sales')
  or report?'finance' or report?'operations'
  or (report->'sales'->>'active_opportunities')::int<>1 then
  raise exception 'Sales report leaked owner/production sections: %',report;end if;
end $sales$;

reset role;
update public.os_staff set role='production'
where active and bound_user_id=current_setting('request.jwt.claim.sub')::uuid;
set local role authenticated;
do $production$
declare report jsonb:=public.os09_dashboard_v1(30);
begin
 if report->>'role'<>'production' or not(report?'operations')
  or report?'finance' or report?'sales'
  or (report->'operations'->>'active')::int<>1 then
  raise exception 'Production report leaked sales/finance: %',report;end if;
end $production$;

-- Unknown or inactive membership: no report data at all.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $unbound$
begin
 begin
  perform public.os09_dashboard_v1(30);
  raise exception 'Unbound user was allowed to retrieve dashboard';
 exception when insufficient_privilege then null;
 end;
end $unbound$;
rollback;

-- All user, quote, project and ledger records remain as before the test.
