-- OS-09 · Cross-tenant aggregation isolation, using synthetic rows only.
-- Everything is rolled back after assertions. No commercial data will persist.
begin;
with other_tenant as (
 insert into public.os_organizations(id,slug,name)
 values(gen_random_uuid(),'os09-qa-'||substr(replace(gen_random_uuid()::text,'-',''),1,10),'Synthetic Other Agency')
 returning id
) select set_config('os09.other_tenant',id::text,true) from other_tenant;
with client as (
 insert into public.os_clients(id,organization_id,name,source)
 values(gen_random_uuid(),current_setting('os09.other_tenant')::uuid,'Other Agency Synthetic Client','QA')
 returning id
) select set_config('os09.other_client',id::text,true) from client;
with opportunity as (
 insert into public.os_opportunities(
  id,organization_id,client_id,title,stage,amount_minor,next_action,next_action_on
 ) values (
  gen_random_uuid(),current_setting('os09.other_tenant')::uuid,
  current_setting('os09.other_client')::uuid,
  'Foreign opportunity','new',90000,'Foreign followup',
  (now() at time zone 'America/Monterrey')::date
 ) returning id
) select set_config('os09.other_opportunity',id::text,true) from opportunity;
with project as (
 insert into public.os_projects(
  id,organization_id,client_id,name,stage,progress,due_on
 ) values (
  gen_random_uuid(),current_setting('os09.other_tenant')::uuid,
  current_setting('os09.other_client')::uuid,'Foreign project',
  'brief',0,(now() at time zone 'America/Monterrey')::date-1
 ) returning id
) select set_config('os09.other_project',id::text,true) from project;
insert into public.os_tasks(
 id,organization_id,title,due_on,kind,priority,project_id
) values (
 gen_random_uuid(),current_setting('os09.other_tenant')::uuid,'Foreign task',
 (now() at time zone 'America/Monterrey')::date-1,
 'task','urgent',current_setting('os09.other_project')::uuid
);

select set_config('request.jwt.claim.sub',bound_user_id::text,true)
from public.os_staff where role='owner' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $isolation$
declare report jsonb:=public.os09_dashboard_v1(30);
  cross_visible int;
begin
 if (report->'sales'->>'active_opportunities')::int<>0
  or (report->'operations'->>'active')::int<>0
  or (report->'tasks'->>'open')::int<>0
 then raise exception 'Cross-tenant data leaked into dashboard %',report;end if;
 select count(*) into cross_visible from public.os_opportunities
 where organization_id=current_setting('os09.other_tenant')::uuid;
 if cross_visible<>0 then raise exception 'Cross-tenant opportunity row visible';end if;
end $isolation$;
rollback;
