-- OS-03 hotfix: COALESCE and NULLIF are special SQL expressions, not pg_catalog functions.
-- Supersedes the function body in OS-03_ATOMIC_LEAD.sql; the earlier migration is historical.
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
  v_contact text := coalesce(pg_catalog.btrim(p_contact_name), '');
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(p_email)), '');
  v_phone text := nullif(pg_catalog.btrim(p_phone), '');
  v_source text := coalesce(nullif(pg_catalog.btrim(p_source), ''), 'Otro');
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


notify pgrst, 'reload schema';
