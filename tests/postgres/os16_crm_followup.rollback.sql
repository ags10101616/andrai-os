-- OS-16 / CRM follow-up edit: authenticated owner, CAS, audit, unbound denial.
-- Synthetic-only; all inserts and updates are ROLLED BACK.
begin;
select set_config('os16.owner_uid',s.bound_user_id::text,true)
 from public.os_staff s where s.active and s.role='owner'
 and s.bound_user_id is not null limit 1;
select set_config('os16.org_id',o.id::text,true)
 from public.os_organizations o where o.slug='andrai' limit 1;
with c as (
 insert into public.os_clients(id,organization_id,name,contact_name,source)
 values(gen_random_uuid(),current_setting('os16.org_id')::uuid,
 'OS16 Synthetic QA Client','Synthetic Contact','Otro')
 returning id
) select set_config('os16.client_id',id::text,true) from c;
with o as (
 insert into public.os_opportunities(
  id,organization_id,client_id,title,stage,amount_minor,next_action,
  next_action_on,updated_at
 ) values (
  gen_random_uuid(),current_setting('os16.org_id')::uuid,
  current_setting('os16.client_id')::uuid,'OS16 Synthetic QA Opportunity',
  'new',125000,'Initial contact','2026-10-30',now()-interval '1 minute'
 ) returning id,updated_at
) select set_config('os16.opportunity_id',id::text,true),
 set_config('os16.original_timestamp',updated_at::text,true) from o;

select set_config('request.jwt.claim.sub',current_setting('os16.owner_uid'),true);
set local role authenticated;
do $authorized$
declare v_changed integer;v_stage text;v_amount bigint;v_action text;v_date date;
begin
 update public.os_opportunities set
  stage='meeting',amount_minor=250050,next_action='Schedule design call',
  next_action_on='2026-11-02'
 where id=current_setting('os16.opportunity_id')::uuid
   and organization_id=current_setting('os16.org_id')::uuid
   and updated_at=current_setting('os16.original_timestamp')::timestamptz;
 get diagnostics v_changed=row_count;
 if v_changed<>1 then raise exception 'Owner failed to update exact optimistic revision';end if;
 select stage,amount_minor,next_action,next_action_on
 into v_stage,v_amount,v_action,v_date
 from public.os_opportunities where id=current_setting('os16.opportunity_id')::uuid;
 if v_stage<>'meeting' or v_amount<>250050 or v_action<>'Schedule design call'
  or v_date<>'2026-11-02'::date then raise exception 'Wrong CRM updated values';end if;
 update public.os_opportunities set stage='won'
 where id=current_setting('os16.opportunity_id')::uuid
 and updated_at=current_setting('os16.original_timestamp')::timestamptz;
 get diagnostics v_changed=row_count;
 if v_changed<>0 then raise exception 'Lost-update protection failed';end if;
 if not exists(select 1 from public.os_audit_events
  where entity='os_opportunities'
  and entity_id=current_setting('os16.opportunity_id')::uuid and action='UPDATE')
 then raise exception 'CRM followup edit not audited';end if;
end $authorized$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $unauthorized$
declare v_changed integer;
begin
 update public.os_opportunities set stage='won'
  where id=current_setting('os16.opportunity_id')::uuid;
 get diagnostics v_changed=row_count;
 if v_changed<>0 then raise exception 'Unbound identity wrote CRM';end if;
 if exists(select 1 from public.os_opportunities
  where id=current_setting('os16.opportunity_id')::uuid)
 then raise exception 'Unbound identity read CRM';end if;
end $unauthorized$;
rollback;
