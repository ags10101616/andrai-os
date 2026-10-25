-- ANDRAI OS · OS-13 · Proposal review lane (no execution or delivery)
-- This migration intentionally creates NO enabled proposal permissions.
-- All proposal text is UNTRUSTED CONTENT; never run it as a command.

-- Existing agent principal remains brief_read ONLY. Extend the allowlist,
-- but NEVER grant the new capability to any existing account in this migration.
alter table public.os_agent_identities
 drop constraint os_agent_identities_capabilities_check;
alter table public.os_agent_identities
 add constraint os_agent_identities_capabilities_check
 check(capabilities <@ array['brief_read','proposal_draft']::text[]
   and 'brief_read'=any(capabilities));
alter table public.os_agent_identities
 add constraint os13_agent_org_id_unique unique(organization_id,id);

-- Independent DB emergency gates; REST clients cannot change them.
create table public.os13_proposal_controls (
 organization_id uuid primary key references public.os_organizations(id),
 intake_enabled boolean not null default false,
 review_enabled boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
insert into public.os13_proposal_controls(organization_id)
 select id from public.os_organizations where slug='andrai'
 on conflict (organization_id) do nothing;
alter table public.os13_proposal_controls enable row level security;
revoke all on public.os13_proposal_controls from public,anon,authenticated;
grant select on public.os13_proposal_controls to authenticated;
create policy os13_owner_controls_read on public.os13_proposal_controls
 for select to authenticated using (
  os_private.member_role(organization_id)='owner'
 );

-- Harden the legacy proposal table rather than maintaining a parallel source.
-- It has zero rows at migration time. No execution status is supported.
alter table public.os_agent_proposals
 add column agent_identity_id uuid not null,
 add column created_by_uid uuid not null references auth.users(id),
 add column rationale text not null,
 add column suggested_next_step text not null,
 add column brief_snapshot jsonb not null default '{}'::jsonb,
 add column revision integer not null default 1,
 add column review_note text,
 add column reviewed_by_uid uuid references auth.users(id),
 add column expires_at timestamptz not null default (now()+interval '14 days'),
 add constraint os13_proposal_agent_tenant_fk
  foreign key(organization_id,agent_identity_id)
  references public.os_agent_identities(organization_id,id),
 add constraint os13_proposal_summary_check
  check(char_length(btrim(summary)) between 8 and 180),
 add constraint os13_proposal_rationale_check
  check(char_length(btrim(rationale)) between 20 and 1000),
 add constraint os13_proposal_next_step_check
  check(char_length(btrim(suggested_next_step)) between 8 and 600),
 add constraint os13_proposal_review_note_check
  check(review_note is null or char_length(btrim(review_note)) between 10 and 600),
 add constraint os13_proposal_brief_object_check
  check(jsonb_typeof(brief_snapshot)='object'),
 add constraint os13_proposal_revision_check check(revision>=1),
 add constraint os13_proposal_resolution_check check(
  (status='proposed' and reviewed_by_uid is null and resolved_at is null
     and review_note is null)
  or (status in ('approved','rejected') and reviewed_by_uid is not null
     and resolved_at is not null and review_note is not null)
  or (status='expired' and reviewed_by_uid is null and review_note is null)
 );
comment on table public.os_agent_proposals is
 'Nonexecuting suggestions from a verified dot; approved is editorial only.';
create index os13_proposal_org_status_time on public.os_agent_proposals
 (organization_id,status,created_at desc);
create index os13_proposal_agent_time on public.os_agent_proposals
 (agent_identity_id,created_at desc);

-- No direct client writes, including users with authenticated PostgREST access.
revoke all on public.os_agent_proposals from public,anon,authenticated;
grant select on public.os_agent_proposals to authenticated;

create policy os13_proposals_owner_read on public.os_agent_proposals
 for select to authenticated using (
  os_private.member_role(organization_id)='owner'
 );
create policy os13_proposals_agent_own_read on public.os_agent_proposals
 for select to authenticated using (
  created_by_uid=(select auth.uid()) and exists(
   select 1 from public.os_agent_identities a
   where a.id=agent_identity_id
    and a.organization_id=os_agent_proposals.organization_id
    and a.bound_user_id=(select auth.uid())
    and a.status='active'
  )
 );

-- The audit is metadata only. OS-11 ingests it into its HELD outbox.
create trigger os13_proposal_audit
 after insert or update on public.os_agent_proposals
 for each row execute function os_private.log_change();

-- Extend OS-11 outbox classification without adding any delivery mechanism.
alter table public.os_event_outbox
 drop constraint os_event_outbox_entity_type_check;
alter table public.os_event_outbox
 add constraint os_event_outbox_entity_type_check check(entity_type in (
  'os_clients','os_opportunities','os_projects','os_tasks',
  'os_quotes','os_quote_snapshots','os_ledger','os_agent_proposals'
 ));

create or replace function os_private.os11_capture_audit()
returns trigger language plpgsql security definer set search_path=''
as $capture$
declare v_class text;
begin
 v_class:=case
  when new.entity in ('os_clients','os_opportunities') then 'sales'
  when new.entity in ('os_projects','os_tasks','os_agent_proposals') then 'operations'
  when new.entity in ('os_quotes','os_quote_snapshots') then 'commerce'
  when new.entity='os_ledger' then 'finance'
  else null
 end;
 if v_class is null then return new;end if;
 insert into public.os_event_outbox(
  organization_id,audit_event_id,event_class,entity_type,entity_id,
  source_action,occurred_at,dispatch_state
 ) values(
  new.organization_id,new.id,v_class,new.entity,new.entity_id,
  new.action,new.occurred_at,'held'
 ) on conflict(audit_event_id) do nothing;
 return new;
end
$capture$;
revoke all on function os_private.os11_capture_audit()
 from public,anon,authenticated;

-- A security-definer core is justified ONLY because direct client writes to
-- the proposal table are entirely blocked. Every operation checks Auth UID,
-- confirmed email, exact tenant and capability, flags, and limits.
create function os_private.os13_submit_core(
 p_id uuid,p_kind text,p_summary text,p_rationale text,p_next_step text
)
returns table(proposal_id uuid,created boolean)
language plpgsql volatile security definer set search_path=''
as $submit$
declare
 v_actor uuid:=(select auth.uid());
 v_agent public.os_agent_identities%rowtype;
 v_existing public.os_agent_proposals%rowtype;
 v_summary text:=btrim(p_summary);
 v_rationale text:=btrim(p_rationale);
 v_next text:=btrim(p_next_step);
 v_today timestamptz;
 v_recent integer;
 v_created integer:=0;
begin
 if v_actor is null then
  raise exception 'Agent authentication required' using errcode='42501';end if;
 select a.* into v_agent from public.os_agent_identities a
 join auth.users u on u.id=v_actor
 where a.bound_user_id=v_actor
  and a.agent_slug='jose-luis' and a.status='active'
  and a.login_email=lower(u.email)
  and u.email_confirmed_at is not null
  and a.capabilities @> array['proposal_draft']::text[]
  and not exists(select 1 from public.os_staff s where s.bound_user_id=v_actor and s.active)
 limit 1;
 if not found then
  raise exception 'Proposal capability not granted' using errcode='42501';end if;
 if not exists(select 1 from public.os13_proposal_controls c
   where c.organization_id=v_agent.organization_id and c.intake_enabled)
 then raise exception 'Proposal intake is closed' using errcode='42501';end if;

 if p_id is null or p_kind is null
    or p_kind not in ('followup','task','quote_draft','alert')
    or v_summary is null or length(v_summary) not between 8 and 180
    or v_rationale is null or length(v_rationale) not between 20 and 1000
    or v_next is null or length(v_next) not between 8 and 600
    or v_summary ~ '[[:cntrl:]]'
    or v_rationale ~ '[[:cntrl:]]'
    or v_next ~ '[[:cntrl:]]'
 then raise exception 'Invalid proposal content' using errcode='22023';end if;

 -- One lock per principal serializes duplicate requests and daily quotas.
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('os13:'||v_agent.id::text,0)
 );

 select p.* into v_existing from public.os_agent_proposals p
  where p.id=p_id;
 if found then
  if v_existing.organization_id is distinct from v_agent.organization_id
     or v_existing.agent_identity_id is distinct from v_agent.id
     or v_existing.created_by_uid is distinct from v_actor
     or v_existing.kind is distinct from p_kind
     or v_existing.summary is distinct from v_summary
     or v_existing.rationale is distinct from v_rationale
     or v_existing.suggested_next_step is distinct from v_next
   then raise exception 'Proposal ID reused with different content'
    using errcode='23505';end if;
  return query select v_existing.id,false;
  return;
 end if;

 v_today:=((
  pg_catalog.now() at time zone 'America/Monterrey'
 )::date::timestamp at time zone 'America/Monterrey');
 select count(*)::integer into v_recent from public.os_agent_proposals p
 where p.agent_identity_id=v_agent.id and p.created_at>=v_today;
 if v_recent>=8 then raise exception 'Daily proposal limit reached'
  using errcode='54000';end if;

 insert into public.os_agent_proposals(
  id,organization_id,agent_identity_id,created_by_uid,kind,
  summary,rationale,suggested_next_step,brief_snapshot,status
 ) values(
  p_id,v_agent.organization_id,v_agent.id,v_actor,p_kind,
  v_summary,v_rationale,v_next,
  os_private.os12_agent_brief_core(),'proposed'
 ) on conflict(id) do nothing;
 get diagnostics v_created=row_count;

 select p.* into v_existing from public.os_agent_proposals p
 where p.id=p_id and p.organization_id=v_agent.organization_id;
 if not found or v_existing.agent_identity_id is distinct from v_agent.id
  or v_existing.created_by_uid is distinct from v_actor
  or v_existing.kind is distinct from p_kind
  or v_existing.summary is distinct from v_summary
  or v_existing.rationale is distinct from v_rationale
  or v_existing.suggested_next_step is distinct from v_next
 then raise exception 'Proposal request ID conflict' using errcode='23505';end if;
 return query select v_existing.id,v_created=1;
end
$submit$;
revoke all on function os_private.os13_submit_core(uuid,text,text,text,text)
 from public,anon,authenticated;
grant execute on function os_private.os13_submit_core(uuid,text,text,text,text)
 to authenticated;

create function public.os13_submit_proposal_v1(
 p_id uuid,p_kind text,p_summary text,p_rationale text,p_next_step text
)
returns table(proposal_id uuid,created boolean)
language sql volatile security invoker set search_path=''
as $rpc$ select * from os_private.os13_submit_core(p_id,p_kind,p_summary,p_rationale,p_next_step) $rpc$;
revoke all on function public.os13_submit_proposal_v1(uuid,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.os13_submit_proposal_v1(uuid,text,text,text,text)
 to authenticated;

create function os_private.os13_review_core(
 p_id uuid,p_revision integer,p_decision text,p_review_note text
)
returns table(proposal_id uuid,new_status text,new_revision integer)
language plpgsql volatile security definer set search_path=''
as $review$
declare
 v_actor uuid:=(select auth.uid());
 v_org uuid;
 v_proposal public.os_agent_proposals%rowtype;
 v_note text:=btrim(p_review_note);
begin
 if v_actor is null then raise exception 'Owner login required' using errcode='42501';end if;
 select s.organization_id into v_org from public.os_staff s
 join auth.users u on u.id=v_actor
 where s.active and s.bound_user_id=v_actor
  and lower(u.email)=s.email and u.email_confirmed_at is not null
  and s.role='owner'
 limit 1;
 if v_org is null then raise exception 'Direction approval required'
  using errcode='42501';end if;
 if not exists(select 1 from public.os13_proposal_controls c
  where c.organization_id=v_org and c.review_enabled)
 then raise exception 'Review intake is closed' using errcode='42501';end if;
 if p_id is null or p_revision is null or p_revision<1
   or p_decision not in ('approved','rejected')
   or v_note is null or length(v_note) not between 10 and 600
   or v_note ~ '[[:cntrl:]]'
 then raise exception 'Invalid decision' using errcode='22023';end if;

 select p.* into v_proposal from public.os_agent_proposals p
  where p.id=p_id and p.organization_id=v_org for update;
 if not found then raise exception 'Proposal not found in Direction workspace'
  using errcode='42501';end if;
 if v_proposal.status<>'proposed' or v_proposal.revision<>p_revision
 then raise exception 'Proposal has changed or was already reviewed'
  using errcode='40001';end if;
 if p_decision='approved' and v_proposal.expires_at<pg_catalog.now()
 then raise exception 'Expired proposals cannot be approved'
  using errcode='42501';end if;

 -- Approved is purely editorial: no outgoing messages, no domain writes.
 update public.os_agent_proposals p set
  status=p_decision,review_note=v_note,reviewed_by_uid=v_actor,
  resolved_at=now(),revision=p.revision+1
 where p.id=v_proposal.id
 returning p.id,p.status,p.revision
 into proposal_id,new_status,new_revision;
 return next;
end
$review$;
revoke all on function os_private.os13_review_core(uuid,integer,text,text)
 from public,anon,authenticated;
grant execute on function os_private.os13_review_core(uuid,integer,text,text)
 to authenticated;

create function public.os13_review_proposal_v1(
 p_id uuid,p_revision integer,p_decision text,p_review_note text
)
returns table(proposal_id uuid,new_status text,new_revision integer)
language sql volatile security invoker set search_path=''
as $rpc$ select * from os_private.os13_review_core(p_id,p_revision,p_decision,p_review_note) $rpc$;
revoke all on function public.os13_review_proposal_v1(uuid,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.os13_review_proposal_v1(uuid,integer,text,text)
 to authenticated;

-- Read-only authorized summary always aggregates ALL proposal rows.
create function public.os13_review_summary_v1()
returns table(
 proposed bigint,approved bigint,rejected bigint,
 expired_pending bigint,total bigint
)
language plpgsql stable security invoker set search_path=''
as $sum$
declare v_org uuid;
begin
 select s.organization_id into v_org from public.os_staff s
 where s.active and s.bound_user_id=(select auth.uid())
  and os_private.member_role(s.organization_id)='owner' limit 1;
 if v_org is null then raise exception 'Direction read required'
  using errcode='42501';end if;
 return query select
  count(*) filter(where p.status='proposed' and p.expires_at>=now()),
  count(*) filter(where p.status='approved'),
  count(*) filter(where p.status='rejected'),
  count(*) filter(where p.status='proposed' and p.expires_at<now()),
  count(*)
 from public.os_agent_proposals p where p.organization_id=v_org;
end
$sum$;
revoke all on function public.os13_review_summary_v1()
 from public,anon,authenticated;
grant execute on function public.os13_review_summary_v1()
 to authenticated;

notify pgrst,'reload schema';
