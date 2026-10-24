-- OS-08 · Security / cross-tenant checks, all ROLLBACK.
-- Execute only in the ANDRAI OS SQL tool with administrative QA access.
begin;
with org as (
 insert into public.os_organizations(id,slug,name)
 values(gen_random_uuid(),'os08-qa-'||substr(replace(gen_random_uuid()::text,'-',''),1,12),'Synthetic tenant')
 returning id
) select set_config('os08.other_org',id::text,true) from org;
with cust as (
 insert into public.os_clients(id,organization_id,name,source)
 values(gen_random_uuid(),current_setting('os08.other_org')::uuid,'Synthetic other-company','QA')
 returning id
) select set_config('os08.other_client',id::text,true) from cust;
with project as (
 insert into public.os_projects(id,organization_id,client_id,name,stage,progress)
 values(gen_random_uuid(),current_setting('os08.other_org')::uuid,
 current_setting('os08.other_client')::uuid,'Other-tenant project','brief',0)
 returning id
) select set_config('os08.other_project',id::text,true) from project;
select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $cross$
declare v_project_id uuid:=current_setting('os08.other_project')::uuid;
 v_entry_id uuid:=gen_random_uuid(); n int;
begin
 begin
  perform * from public.os08_record_manual_entry_v1(
   v_entry_id,'expense',12300,'Synthetic foreign project','transfer',current_date,'QA',null,v_project_id);
  raise exception 'Cross-tenant record was created';
 exception when insufficient_privilege then null;
 end;
 select count(*) into n from public.os_ledger l where l.id=v_entry_id;
 if n<>0 then raise exception 'Unexpected cross-tenant financial record';end if;
 select count(*) into n from public.os_projects where public.os_projects.id=v_project_id;
 if n<>0 then raise exception 'Foreign project visible through RLS';end if;
end $cross$;
rollback;

-- Role denial tests are separate transactions so all role changes are reverted.
begin;
update public.os_staff set role='sales' where role='owner' and active and bound_user_id is not null;
select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='sales' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $sales$
begin
 begin perform * from public.os08_finance_summary_v1();
  raise exception 'Sales viewed Direction finance';
 exception when insufficient_privilege then null;end;
 begin perform * from public.os08_record_manual_entry_v1(
  gen_random_uuid(),'expense',100,'Sales blocked','other',current_date,'QA',null,null);
  raise exception 'Sales created financial entry';
 exception when insufficient_privilege then null;end;
end $sales$;
rollback;

begin;
update public.os_staff set role='production' where role='owner' and active and bound_user_id is not null;
select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='production' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $production$
begin
 begin perform * from public.os08_quote_balances_v1();
  raise exception 'Production viewed Direction finance';
 exception when insufficient_privilege then null;end;
 begin perform * from public.os08_record_manual_entry_v1(
  gen_random_uuid(),'expense',100,'Production blocked','other',current_date,'QA',null,null);
  raise exception 'Production created financial entry';
 exception when insufficient_privilege then null;end;
end $production$;
rollback;
