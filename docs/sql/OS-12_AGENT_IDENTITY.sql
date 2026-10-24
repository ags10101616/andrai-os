-- ANDRAI OS / OS-12: a separate, revocable identity for the José Luis dot.
-- No password is stored or created. The identity starts PENDING with no login email.
-- It is NOT a human staff/owner member and does not gain access to domain tables.

create table public.os_agent_identities (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.os_organizations(id),
 agent_slug text not null check(agent_slug ~ '^[a-z][a-z0-9-]{1,63}$'),
 display_name text not null check(length(btrim(display_name)) between 2 and 100),
 login_email text,
 bound_user_id uuid unique references auth.users(id),
 status text not null default 'pending' check(status in ('pending','active','suspended')),
 capabilities text[] not null default array['brief_read']::text[]
   check(capabilities <@ array['brief_read']::text[]),
 created_at timestamptz not null default now(),
 activated_at timestamptz,
 unique(organization_id,agent_slug),
 unique(organization_id,login_email),
 constraint os12_agent_valid_email check (
   login_email is null or (
     login_email=lower(btrim(login_email))
     and position('@' in login_email)>1
     and length(login_email)<=254
   )
 ),
 constraint os12_agent_active_bound check(
   status<>'active' or (login_email is not null and bound_user_id is not null)
 ),
 constraint os12_agent_pending_unbound check(
   status<>'pending' or bound_user_id is null
 )
);
comment on table public.os_agent_identities is
 'Non-human dot identities; provision only after external email confirmation, no owner role.';

alter table public.os_agent_identities enable row level security;
revoke all on table public.os_agent_identities from public,anon,authenticated;
grant select on table public.os_agent_identities to authenticated;
create policy os12_agent_self_read on public.os_agent_identities
 for select to authenticated
 using (
  status='active'
  and bound_user_id=(select auth.uid())
 );
create policy os12_owner_agent_registry_read on public.os_agent_identities
 for select to authenticated
 using(os_private.member_role(organization_id)='owner');

-- Only a pending placeholder, not a Supabase Auth account. No access is active.
insert into public.os_agent_identities (
 organization_id,agent_slug,display_name,status
)
select org.id,'jose-luis','José Luis','pending'
from public.os_organizations org where org.slug='andrai'
on conflict (organization_id,agent_slug) do nothing;

-- A SECURITY DEFINER internal helper is restricted to exact, confirmed,
-- pre-approved agent identity. It exposes only a fixed set of safe counts.
-- It never reveals names, email addresses, quotes, money or other row details.
create function os_private.os12_agent_brief_core()
returns jsonb
language plpgsql stable security definer set search_path=''
as $core$
declare
 v_uid uuid:=(select auth.uid());
 v_org uuid;
 v_projects bigint;
 v_tasks bigint;
 v_deliverables bigint;
 v_quotes_review bigint;
 v_opportunities bigint;
begin
 if v_uid is null then
  raise exception 'Agent authentication required' using errcode='42501';
 end if;

 select a.organization_id into v_org
 from public.os_agent_identities a
 join auth.users u on u.id=v_uid
 where a.agent_slug='jose-luis'
   and a.status='active'
   and a.bound_user_id=u.id
   and a.login_email=lower(u.email)
   and u.email_confirmed_at is not null
   and a.capabilities @> array['brief_read']::text[]
   and not exists (
     select 1 from public.os_staff s
     where s.bound_user_id=v_uid and s.active
   )
 limit 1;
 if v_org is null then
  raise exception 'Agent access is not activated' using errcode='42501';
 end if;

 select count(*) into v_projects
 from public.os_projects p where p.organization_id=v_org
  and p.stage<>'delivered';
 select count(*) into v_tasks
 from public.os_tasks t where t.organization_id=v_org and not t.done;
 select count(*) into v_deliverables
 from public.os_tasks t where t.organization_id=v_org
   and not t.done and t.kind='deliverable';
 select count(*) into v_quotes_review
 from public.os_quotes q where q.organization_id=v_org
   and q.status='review';
 select count(*) into v_opportunities
 from public.os_opportunities o where o.organization_id=v_org
   and o.stage in ('new','contacted','meeting','proposal');

 return jsonb_build_object(
  'agent','jose-luis',
  'role','agent',
  'access','brief_read',
  'mode','read_only',
  'projects_active',v_projects,
  'tasks_open',v_tasks,
  'deliverables_open',v_deliverables,
  'quotes_in_review',v_quotes_review,
  'opportunities_active',v_opportunities,
  'as_of',pg_catalog.now()
 );
end
$core$;
revoke all on function os_private.os12_agent_brief_core()
 from public,anon,authenticated;
grant execute on function os_private.os12_agent_brief_core()
 to authenticated;

-- Invoker RPC has no elevated permissions. It delegates to the narrow
-- private helper; all authorization checks remain inside that helper.
create function public.os12_agent_brief_v1()
returns jsonb
language sql stable security invoker set search_path=''
as $rpc$
 select os_private.os12_agent_brief_core()
$rpc$;
revoke all on function public.os12_agent_brief_v1()
 from public,anon,authenticated;
grant execute on function public.os12_agent_brief_v1()
 to authenticated;

-- No capabilities that send messages, create records, transfer money, or approve.
notify pgrst,'reload schema';
