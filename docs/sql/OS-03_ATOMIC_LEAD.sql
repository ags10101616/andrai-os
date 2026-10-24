-- ANDRAI OS / OS-03 · Atomic lead onboarding and immutable tenant identity
-- All caller permissions remain subject to normal table RLS.
-- No service role / SECURITY DEFINER mutation endpoint is introduced.

create or replace function os_private.guard_record_identity_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $guard$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Record identity and organization are immutable'
      using errcode = '42501';
  end if;
  return new;
end
$guard$;

revoke all on function os_private.guard_record_identity_v1() from public, anon, authenticated;

create trigger os_clients_immutability
  before update on public.os_clients
  for each row execute function os_private.guard_record_identity_v1();
create trigger os_opportunities_immutability
  before update on public.os_opportunities
  for each row execute function os_private.guard_record_identity_v1();
create trigger os_projects_immutability
  before update on public.os_projects
  for each row execute function os_private.guard_record_identity_v1();
create trigger os_tasks_immutability
  before update on public.os_tasks
  for each row execute function os_private.guard_record_identity_v1();
create trigger os_quotes_immutability
  before update on public.os_quotes
  for each row execute function os_private.guard_record_identity_v1();

create or replace function public.os_create_lead_v1(
  p_client_id uuid,
  p_opportunity_id uuid,
  p_client_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_source text,
  p_title text,
  p_amount_minor bigint,
  p_next_action text,
  p_next_action_on date
)
returns table (client_id uuid, opportunity_id uuid, created boolean)
language plpgsql
volatile
security invoker
set search_path = ''
as $lead$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_staff_id uuid;
  v_name text := pg_catalog.btrim(p_client_name);
  v_contact text := pg_catalog.coalesce(pg_catalog.btrim(p_contact_name), '');
  v_email text := pg_catalog.nullif(pg_catalog.lower(pg_catalog.btrim(p_email)), '');
  v_phone text := pg_catalog.nullif(pg_catalog.btrim(p_phone), '');
  v_source text := pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_source), ''), 'Otro');
  v_title text := pg_catalog.btrim(p_title);
  v_next text := pg_catalog.btrim(p_next_action);
  v_client public.os_clients%rowtype;
  v_opportunity public.os_opportunities%rowtype;
  v_new_opportunity integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Do not accept an organization ID or a role from an API caller.
  select s.organization_id, s.id
    into v_org_id, v_staff_id
  from public.os_staff s
  where s.bound_user_id = v_user_id
    and s.active
    and s.role in ('owner', 'sales')
    and os_private.member_role(s.organization_id) in ('owner', 'sales')
  limit 1;

  if v_org_id is null then
    raise exception 'Workspace write access denied' using errcode = '42501';
  end if;

  if p_client_id is null or p_opportunity_id is null or p_client_id = p_opportunity_id then
    raise exception 'Invalid request identifiers' using errcode = '22023';
  end if;
  if v_name is null or pg_catalog.char_length(v_name) not between 2 and 160 then
    raise exception 'Invalid client name' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_contact) > 160 or pg_catalog.char_length(v_source) > 80
    or (v_phone is not null and pg_catalog.char_length(v_phone) > 64)
    or (v_email is not null and (pg_catalog.char_length(v_email) > 254 or pg_catalog.strpos(v_email, '@') < 2))
  then
    raise exception 'Invalid client contact' using errcode = '22023';
  end if;
  if v_title is null or pg_catalog.char_length(v_title) not between 2 and 160
    or v_next is null or pg_catalog.char_length(v_next) not between 3 and 240
    or p_next_action_on is null
    or p_amount_minor is null or p_amount_minor not between 0 and 999999999999
  then
    raise exception 'Invalid opportunity details' using errcode = '22023';
  end if;

  -- These two writes are in a single PostgreSQL statement transaction.
  -- Caller supplies stable UUIDs and retries with the SAME IDs on a timeout.
  insert into public.os_clients (
    id, organization_id, name, contact_name, email, phone, source
  ) values (
    p_client_id, v_org_id, v_name, v_contact, v_email, v_phone, v_source
  ) on conflict (id) do nothing;

  select c.* into v_client
  from public.os_clients c
  where c.id = p_client_id and c.organization_id = v_org_id;
  if not found
    or v_client.name is distinct from v_name
    or v_client.contact_name is distinct from v_contact
    or v_client.email is distinct from v_email
    or v_client.phone is distinct from v_phone
    or v_client.source is distinct from v_source
  then
    raise exception 'Client idempotency conflict' using errcode = '23505';
  end if;

  insert into public.os_opportunities (
    id, organization_id, client_id, title, stage, amount_minor,
    assigned_staff_id, next_action, next_action_on
  ) values (
    p_opportunity_id, v_org_id, p_client_id, v_title, 'new', p_amount_minor,
    v_staff_id, v_next, p_next_action_on
  ) on conflict (id) do nothing;
  get diagnostics v_new_opportunity = row_count;

  select o.* into v_opportunity
  from public.os_opportunities o
  where o.id = p_opportunity_id and o.organization_id = v_org_id;

  if not found
    or v_opportunity.client_id is distinct from p_client_id
    or v_opportunity.title is distinct from v_title
    or v_opportunity.amount_minor is distinct from p_amount_minor
    or v_opportunity.assigned_staff_id is distinct from v_staff_id
    or v_opportunity.next_action is distinct from v_next
    or v_opportunity.next_action_on is distinct from p_next_action_on
  then
    raise exception 'Opportunity idempotency conflict' using errcode = '23505';
  end if;

  return query select v_client.id, v_opportunity.id, (v_new_opportunity = 1);
end
$lead$;

-- Function execution does not imply row access: SECURITY INVOKER + RLS
-- and a server-verified membership are required.
revoke execute on function public.os_create_lead_v1(
  uuid, uuid, text, text, text, text, text, text, bigint, text, date
) from public, anon, authenticated;
grant execute on function public.os_create_lead_v1(
  uuid, uuid, text, text, text, text, text, text, bigint, text, date
) to authenticated;

-- Target the initial commercial lookup pattern, not a speculative
-- index for every empty table.
create index os_opportunities_by_client_v1
  on public.os_opportunities (organization_id, client_id);

notify pgrst, 'reload schema';
