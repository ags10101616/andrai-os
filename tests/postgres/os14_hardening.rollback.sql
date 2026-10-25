begin;
-- SQL smoke assertions only; no lasting changes.
do $verify$
declare v_count integer;
begin
 if (select count(*) from pg_policies where schemaname='public'
   and tablename='os_agent_identities' and cmd='SELECT') <> 1 then
  raise exception 'Agent identity read RLS not consolidated';
 end if;
 if not exists(select 1 from pg_policies
   where schemaname='public' and tablename='os_agent_identities'
   and policyname='os14_agent_identity_read'
   and qual like '%member_role%'
   and qual like '%bound_user_id%') then
  raise exception 'Agent self/owner RLS equivalence not present';
 end if;
 if exists(select 1 from pg_policies where schemaname='public'
   and tablename='os_agent_proposals' and policyname='os_agent_owner_read') then
  raise exception 'Duplicate owner proposal policy survived';
 end if;
 if (select count(*) from pg_policies where schemaname='public'
   and tablename='os_agent_proposals' and cmd='SELECT') <> 2 then
  raise exception 'Proposal SELECT policies not limited to owner and author';
 end if;
 select count(*) into v_count from pg_indexes
  where schemaname='public' and indexname=any(array[
  'os14_fk_proposal_agent',
  'os14_fk_proposal_creator',
  'os14_fk_proposal_reviewer',
  'os14_fk_audit_actor',
  'os14_fk_ledger_entered_by',
  'os14_fk_ledger_project',
  'os14_fk_opportunity_assignee',
  'os14_fk_project_assignee',
  'os14_fk_project_client',
  'os14_fk_snapshot_submitter',
  'os14_fk_quote_project',
  'os14_fk_quote_approver',
  'os14_fk_quote_creator',
  'os14_fk_quote_client',
  'os14_fk_task_opportunity'
  ]);
 if v_count <> 15 then
  raise exception 'FK coverage incomplete; found % / 15',v_count;
 end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname in
    ('os_agent_identities','os_agent_proposals','os_ledger') and not c.relrowsecurity) then
  raise exception 'Critical table lost RLS';
 end if;
 if has_table_privilege('anon','public.os_agent_proposals','SELECT')
  or has_table_privilege('authenticated','public.os_agent_proposals','INSERT')
  or has_table_privilege('authenticated','public.os_agent_proposals','UPDATE')
  or has_table_privilege('authenticated','public.os_agent_proposals','DELETE') then
  raise exception 'Proposal direct write access unexpectedly allowed';
 end if;
 if exists(select 1 from public.os13_proposal_controls
  where intake_enabled or review_enabled)
  or exists(select 1 from public.os_agent_identities
  where 'proposal_draft'=any(capabilities)) then
  raise exception 'A proposal feature gate or capability is unexpectedly ON';
 end if;
end
$verify$;
rollback;
