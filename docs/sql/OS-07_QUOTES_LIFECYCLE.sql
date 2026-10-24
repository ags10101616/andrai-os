-- ANDRAI OS | OS-07 · Quote drafting, review, approval and immutable snapshots
-- Deliberately additive; do not seed customer records.
-- Quote status "accepted" is a manual agency record, NOT an electronic signature.

alter table public.os_quotes
  add column project_id uuid,
  add column version integer not null default 1 check(version>=1),
  add column line_items jsonb not null default '[]'::jsonb,
  add column notes text not null default '',
  add column valid_until date,
  add column tax_rate_bps integer not null default 1600
    check(tax_rate_bps in (0,1600)),
  add column tax_minor bigint not null default 0 check(tax_minor>=0),
  add column total_minor bigint not null default 0 check(total_minor>=0),
  add column approved_at timestamptz,
  add column sent_at timestamptz,
  add column responded_at timestamptz;

alter table public.os_quotes
  add constraint os07_project_ref_fk foreign key (organization_id,project_id)
  references public.os_projects(organization_id,id);

-- Historical snapshots are append-only. No direct INSERT/UPDATE/DELETE
-- privilege is provided to authenticated Data API users.
create table public.os_quote_snapshots(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.os_organizations(id),
 quote_id uuid not null,
 version integer not null check(version>=1),
 title text not null,
 line_items jsonb not null,
 notes text not null,
 valid_until date,
 tax_rate_bps integer not null,
 amount_minor bigint not null,
 tax_minor bigint not null,
 total_minor bigint not null,
 submitted_by uuid not null references auth.users(id),
 submitted_at timestamptz not null default now(),
 unique(organization_id,quote_id,version),
 foreign key(organization_id,quote_id)
  references public.os_quotes(organization_id,id)
);
alter table public.os_quote_snapshots enable row level security;
revoke all on public.os_quote_snapshots from public,anon,authenticated;
grant select on public.os_quote_snapshots to authenticated;
create policy os07_snapshots_read on public.os_quote_snapshots
  for select to authenticated
  using (os_private.member_role(organization_id) in ('owner','sales'));

-- Finance/approver metadata is NOT writable via column privileges.
revoke insert,update on public.os_quotes from authenticated;
grant insert(id,organization_id,client_id,project_id,title,line_items,
             notes,valid_until,tax_rate_bps,created_by)
 on public.os_quotes to authenticated;
grant update(title,line_items,notes,valid_until,tax_rate_bps,status,version,revision)
 on public.os_quotes to authenticated;
drop policy if exists os_quotes_read on public.os_quotes;
create policy os_quotes_read on public.os_quotes
 for select to authenticated
 using(os_private.member_role(organization_id) in ('owner','sales'));
drop policy if exists os_quotes_add on public.os_quotes;
create policy os_quotes_add on public.os_quotes
 for insert to authenticated
 with check (
  os_private.member_role(organization_id) in ('owner','sales')
  and created_by=(select auth.uid()) and status='draft'
  and approved_by is null and revision=1 and version=1
 );
drop policy if exists os_quotes_edit on public.os_quotes;
create policy os_quotes_edit on public.os_quotes
 for update to authenticated
 using(os_private.member_role(organization_id) in ('owner','sales'))
 with check(os_private.member_role(organization_id) in ('owner','sales'));

create function os_private.os07_quote_integrity_guard()
returns trigger language plpgsql security invoker set search_path=''
as $q$
declare
 actor_role text;
 item jsonb;
 qty bigint;
 unit_minor bigint;
 subtotal bigint := 0;
 cnt int := 0;
 old_content_changed boolean;
 state_allowed boolean := false;
begin
 actor_role:=os_private.member_role(new.organization_id);
 if actor_role not in ('owner','sales') then
  raise exception 'Quote access denied' using errcode='42501';
 end if;
 if not exists(select 1 from public.os_clients c
               where c.id=new.client_id and c.organization_id=new.organization_id)
 then raise exception 'Client unavailable' using errcode='42501'; end if;
 if new.project_id is not null and not exists(
    select 1 from public.os_projects p
    where p.id=new.project_id and p.organization_id=new.organization_id
      and p.client_id=new.client_id
 ) then raise exception 'Project does not belong to the selected client'
   using errcode='42501'; end if;
 if char_length(btrim(new.title)) not between 2 and 180
    or char_length(new.notes)>3000 or new.tax_rate_bps not in (0,1600)
    or jsonb_typeof(new.line_items)<>'array'
 then raise exception 'Invalid quote details' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(new.line_items) loop
  cnt:=cnt+1;
  if cnt>24 or jsonb_typeof(item)<>'object'
    or jsonb_typeof(item->'quantity')<>'number'
    or jsonb_typeof(item->'unit_minor')<>'number'
    or coalesce(item->>'quantity','') !~ '^[0-9]{1,3}$'
    or coalesce(item->>'unit_minor','') !~ '^[0-9]{1,11}$'
    or char_length(btrim(coalesce(item->>'description',''))) not between 2 and 180
    or char_length(coalesce(item->>'detail',''))>450
  then raise exception 'Invalid quote line' using errcode='22023'; end if;
  qty:=(item->>'quantity')::bigint;
  unit_minor:=(item->>'unit_minor')::bigint;
  if qty not between 1 and 100 or unit_minor not between 0 and 9999999999
  then raise exception 'Invalid quote amount' using errcode='22023'; end if;
  subtotal:=subtotal+(qty*unit_minor);
  if subtotal>999999999999 then
    raise exception 'Quote amount exceeds limit' using errcode='22023';
  end if;
 end loop;
 if cnt<1 then raise exception 'At least one quote line is required'
   using errcode='22023'; end if;
 new.amount_minor:=subtotal;
 new.tax_minor:=(subtotal*new.tax_rate_bps+5000)/10000;
 new.total_minor:=subtotal+new.tax_minor;
 if tg_op='INSERT' then
  if new.created_by is distinct from (select auth.uid())
   or new.status<>'draft' or new.revision<>1 or new.version<>1
   or new.approved_by is not null then
    raise exception 'New quotes must be owned draft version 1'
      using errcode='42501';
  end if;
  return new;
 end if;
 if new.id is distinct from old.id
   or new.organization_id is distinct from old.organization_id
   or new.client_id is distinct from old.client_id
   or new.project_id is distinct from old.project_id
   or new.created_by is distinct from old.created_by
   or new.created_at is distinct from old.created_at
 then raise exception 'Quote identity is immutable' using errcode='42501'; end if;
 if new.revision is distinct from old.revision+1 then
  raise exception 'Stale quote revision' using errcode='40001'; end if;
 old_content_changed:=
    new.title is distinct from old.title
    or new.line_items is distinct from old.line_items
    or new.notes is distinct from old.notes
    or new.valid_until is distinct from old.valid_until
    or new.tax_rate_bps is distinct from old.tax_rate_bps;
 if old.status='draft' then
  state_allowed:=new.status in ('draft','review') and new.version=old.version;
  if new.status='review' and old_content_changed then state_allowed:=false; end if;
 elsif old.status='review' then
  state_allowed:=(
   (new.status='draft' and new.version=old.version+1)
   or (new.status='approved' and new.version=old.version and actor_role='owner')
  ) and not old_content_changed;
 elsif old.status='approved' then
  state_allowed:=new.status='sent' and actor_role='owner'
    and new.version=old.version and not old_content_changed;
 elsif old.status='sent' then
  state_allowed:=new.status in ('accepted','rejected') and actor_role='owner'
    and new.version=old.version and not old_content_changed;
 end if;
 if not state_allowed then raise exception 'Invalid quote lifecycle transition'
   using errcode='42501'; end if;
 if new.status='approved' and old.status='review' then
  new.approved_by:=(select auth.uid());
  new.approved_at:=now();
 elsif new.status='draft' and old.status='review' then
  new.approved_by:=null;new.approved_at:=null;
 end if;
 if new.status='sent' and old.status='approved' then new.sent_at:=now();end if;
 if new.status in ('accepted','rejected') and old.status='sent' then
  new.responded_at:=now();
 end if;
 return new;
end
$q$;
revoke all on function os_private.os07_quote_integrity_guard()
 from public,anon,authenticated;
create trigger os07_quote_guard
 before insert or update on public.os_quotes
 for each row execute function os_private.os07_quote_integrity_guard();

-- A privileged *internal trigger* writes snapshots, not the browser.
-- It checks the actor explicitly; the only privilege elevation is for
-- insertion of the immutable historical record.
create function os_private.os07_snapshot_on_review()
returns trigger language plpgsql security definer set search_path=''
as $snapshot$
begin
 if old.status='draft' and new.status='review' then
  if (select auth.uid()) is null or
     os_private.member_role(new.organization_id) not in ('owner','sales') then
    raise exception 'Not authorized to submit quote' using errcode='42501';
  end if;
  insert into public.os_quote_snapshots(
   organization_id,quote_id,version,title,line_items,notes,valid_until,
   tax_rate_bps,amount_minor,tax_minor,total_minor,submitted_by
  ) values (
   new.organization_id,new.id,new.version,new.title,new.line_items,new.notes,
   new.valid_until,new.tax_rate_bps,new.amount_minor,new.tax_minor,new.total_minor,
   (select auth.uid())
  );
 end if;
 return new;
end
$snapshot$;
revoke all on function os_private.os07_snapshot_on_review()
 from public,anon,authenticated;
create trigger os07_snapshot_review after update on public.os_quotes
 for each row execute function os_private.os07_snapshot_on_review();
create trigger os07_snapshot_audit after insert on public.os_quote_snapshots
 for each row execute function os_private.log_change();

-- RPCs derive tenant and role solely from the confirmed bound Auth user.
-- They are SECURITY INVOKER, preserving row and column access controls.
create function public.os07_create_quote_v1(
 p_id uuid,p_client_id uuid,p_project_id uuid,p_title text,p_lines jsonb,
 p_tax_rate_bps integer,p_valid_until date,p_notes text
) returns table(quote_id uuid,created boolean)
language plpgsql volatile security invoker set search_path=''
as $create$
declare org uuid;actor uuid;inserted int;row_q public.os_quotes%rowtype;
begin
 select s.organization_id,s.bound_user_id into org,actor
 from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
  and os_private.member_role(s.organization_id) in ('owner','sales') limit 1;
 if org is null or p_id is null or p_client_id is null then
  raise exception 'Not authorized to create quote' using errcode='42501';end if;
 insert into public.os_quotes(
  id,organization_id,client_id,project_id,title,line_items,
  notes,tax_rate_bps,valid_until,created_by,amount_minor
 ) values (
  p_id,org,p_client_id,p_project_id,p_title,p_lines,
  coalesce(p_notes,''),p_tax_rate_bps,p_valid_until,actor,0
 ) on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 select q.* into row_q from public.os_quotes q where q.id=p_id and q.organization_id=org;
 if not found or row_q.client_id is distinct from p_client_id
  or row_q.project_id is distinct from p_project_id
  or row_q.title is distinct from p_title
  or row_q.line_items is distinct from p_lines
  or row_q.notes is distinct from coalesce(p_notes,'')
  or row_q.tax_rate_bps is distinct from p_tax_rate_bps
  or row_q.valid_until is distinct from p_valid_until
 then raise exception 'Quote idempotency conflict' using errcode='23505';end if;
 return query select row_q.id,(inserted=1);
end
$create$;

create function public.os07_replace_draft_v1(
 p_id uuid,p_revision integer,p_title text,p_lines jsonb,
 p_tax_rate_bps integer,p_valid_until date,p_notes text
) returns table(quote_id uuid,revision integer,version integer)
language plpgsql volatile security invoker set search_path=''
as $edit$
declare org uuid;previous public.os_quotes%rowtype;new_row public.os_quotes%rowtype;
begin
 select s.organization_id into org from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
  and os_private.member_role(s.organization_id) in ('owner','sales') limit 1;
 if org is null then raise exception 'Quote edit denied' using errcode='42501';end if;
 select q.* into previous from public.os_quotes q
 where q.id=p_id and q.organization_id=org for update;
 if not found or previous.status<>'draft' then
  raise exception 'Quote is not an editable draft' using errcode='42501';end if;
 if previous.title is not distinct from p_title
   and previous.line_items is not distinct from p_lines
   and previous.tax_rate_bps is not distinct from p_tax_rate_bps
   and previous.notes is not distinct from coalesce(p_notes,'')
   and previous.valid_until is not distinct from p_valid_until then
  return query select previous.id,previous.revision,previous.version;return;
 end if;
 if p_revision is distinct from previous.revision then
  raise exception 'Stale quote revision' using errcode='40001';end if;
 update public.os_quotes q set title=p_title,line_items=p_lines,
  tax_rate_bps=p_tax_rate_bps,valid_until=p_valid_until,
  notes=coalesce(p_notes,''),revision=q.revision+1
 where q.id=p_id and q.organization_id=org returning q.* into new_row;
 return query select new_row.id,new_row.revision,new_row.version;
end
$edit$;

create function public.os07_transition_v1(
 p_id uuid,p_revision integer,p_action text
) returns table(quote_id uuid,revision integer,version integer,status text)
language plpgsql volatile security invoker set search_path=''
as $move$
declare org uuid;role_name text;old_row public.os_quotes%rowtype;
 new_row public.os_quotes%rowtype;next_status text;next_version integer;
begin
 select s.organization_id,os_private.member_role(s.organization_id)
  into org,role_name from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
   and os_private.member_role(s.organization_id) in ('owner','sales') limit 1;
 if org is null then raise exception 'Quote transition denied' using errcode='42501';end if;
 select q.* into old_row from public.os_quotes q
 where q.id=p_id and q.organization_id=org for update;
 if not found then raise exception 'Quote unavailable' using errcode='42501';end if;
 if p_action='submit' and old_row.status='draft' then next_status:='review';
 elsif p_action='revise' and old_row.status='review' then next_status:='draft';
 elsif p_action='approve' and old_row.status='review' and role_name='owner' then next_status:='approved';
 elsif p_action='sent' and old_row.status='approved' and role_name='owner' then next_status:='sent';
 elsif p_action='accept' and old_row.status='sent' and role_name='owner' then next_status:='accepted';
 elsif p_action='reject' and old_row.status='sent' and role_name='owner' then next_status:='rejected';
 else raise exception 'Action not allowed in current quote state' using errcode='42501';end if;
 if p_revision is distinct from old_row.revision then
  raise exception 'Stale quote revision' using errcode='40001';end if;
 next_version:=old_row.version+case when p_action='revise' then 1 else 0 end;
 update public.os_quotes q set status=next_status,version=next_version,
   revision=q.revision+1
 where q.id=p_id and q.organization_id=org returning q.* into new_row;
 return query select new_row.id,new_row.revision,new_row.version,new_row.status;
end
$move$;

-- Grants are intentionally specific and no service-role key is used.
revoke all on function public.os07_create_quote_v1(uuid,uuid,uuid,text,jsonb,integer,date,text)
 from public,anon,authenticated;
revoke all on function public.os07_replace_draft_v1(uuid,integer,text,jsonb,integer,date,text)
 from public,anon,authenticated;
revoke all on function public.os07_transition_v1(uuid,integer,text)
 from public,anon,authenticated;
grant execute on function public.os07_create_quote_v1(uuid,uuid,uuid,text,jsonb,integer,date,text)
 to authenticated;
grant execute on function public.os07_replace_draft_v1(uuid,integer,text,jsonb,integer,date,text)
 to authenticated;
grant execute on function public.os07_transition_v1(uuid,integer,text)
 to authenticated;

create index os07_quotes_org_recent on public.os_quotes(organization_id,updated_at desc);
create index os07_snapshots_quote_version on public.os_quote_snapshots(organization_id,quote_id,version desc);
notify pgrst,'reload schema';
