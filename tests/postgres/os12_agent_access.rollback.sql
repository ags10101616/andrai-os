-- OS-12 · Reversible service-principal separation test.
-- Uses the pre-existing confirmed human account as a TEMPORARY TEST identity,
-- unbinding its human membership only within BEGIN/ROLLBACK.
-- Never create an Auth password or active dot identity persistently.

begin;
select set_config('os12.test_user',s.bound_user_id::text,true)
 from public.os_staff s where s.active and s.role='owner' and s.bound_user_id is not null limit 1;
select set_config('request.jwt.claim.sub',current_setting('os12.test_user'),true);
set local role authenticated;
do $pending$
begin
 begin
  perform public.os12_agent_brief_v1();
  raise exception 'Pending agent was authorized without binding';
 exception when insufficient_privilege then null;
 end;
end $pending$;
reset role;
with c as (
 insert into public.os_clients(id,organization_id,name,source)
 select gen_random_uuid(),o.id,'OS12 QA Synthetic Client','QA'
 from public.os_organizations o where o.slug='andrai' returning id,organization_id
)
insert into public.os_projects(id,organization_id,client_id,name,stage,progress)
select gen_random_uuid(),c.organization_id,c.id,'OS12 QA Project','brief',0 from c;

update public.os_staff set bound_user_id=null
where role='owner' and bound_user_id=current_setting('os12.test_user')::uuid;
update public.os_agent_identities set
 login_email=(select lower(email) from auth.users where id=current_setting('os12.test_user')::uuid),
 bound_user_id=current_setting('os12.test_user')::uuid,
 status='active',activated_at=now()
where agent_slug='jose-luis'
 and organization_id=(select id from public.os_organizations where slug='andrai');

set local role authenticated;
do $agent$
declare brief jsonb; n integer;
begin
 brief:=public.os12_agent_brief_v1();
 if brief->>'role'<>'agent' or brief->>'mode'<>'read_only'
   or (brief->>'projects_active')::int<>1 then
   raise exception 'Agent summary incorrectly scoped: %',brief;
 end if;
 if brief ? 'client_email' or brief ? 'finance' or brief ? 'total_minor'
 then raise exception 'Private data leaked into agent brief';end if;
 select count(*) into n from public.os_clients;
 if n<>0 then raise exception 'Agent could read customer rows';end if;
 select count(*) into n from public.os_projects;
 if n<>0 then raise exception 'Agent could read project rows';end if;
 begin
  perform * from public.os08_finance_summary_v1();
  raise exception 'Agent could read Direction finances';
 exception when insufficient_privilege then null;
 end;
end $agent$;
rollback;
