-- ANDRAI OS / OS-14: isolated-workspace RLS equivalence + FK indexing.
-- NON-DESTRUCTIVE. No tenant rows, capabilities, access flags, grants,
-- customer records, payment states, or dispatch settings are changed.
-- Preserve RLS access semantics: owner OR active exact-UID agent.
--
-- The initial and final operations are run atomically as one migration.

create policy os14_agent_identity_read on public.os_agent_identities
 as permissive for select to authenticated
 using (
   (status='active' and bound_user_id=(select auth.uid()))
   or os_private.member_role(organization_id)='owner'
 );
drop policy os12_agent_self_read on public.os_agent_identities;
drop policy os12_owner_agent_registry_read on public.os_agent_identities;

-- OS-13 owner read policy has the exact predicate of this legacy policy.
-- Removing the redundant copy cannot expand visibility.
drop policy os_agent_owner_read on public.os_agent_proposals;

-- Optimize only the JWT accessor, not the role or tenant predicate.
alter policy os_ledger_owner_add on public.os_ledger
 with check (
   os_private.member_role(organization_id)='owner'
   and entered_by=(select auth.uid())
 );

-- Cover exactly the foreign-key prefixes flagged by Supabase advisers.
-- Existing leading-prefix indexes were inspected before this migration.
create index if not exists os14_fk_proposal_agent on public.os_agent_proposals (organization_id,agent_identity_id);
create index if not exists os14_fk_proposal_creator on public.os_agent_proposals (created_by_uid);
create index if not exists os14_fk_proposal_reviewer on public.os_agent_proposals (reviewed_by_uid);
create index if not exists os14_fk_audit_actor on public.os_audit_events (actor_user_id);
create index if not exists os14_fk_ledger_entered_by on public.os_ledger (entered_by);
create index if not exists os14_fk_ledger_project on public.os_ledger (organization_id,project_id);
create index if not exists os14_fk_opportunity_assignee on public.os_opportunities (organization_id,assigned_staff_id);
create index if not exists os14_fk_project_assignee on public.os_projects (organization_id,assigned_staff_id);
create index if not exists os14_fk_project_client on public.os_projects (organization_id,client_id);
create index if not exists os14_fk_snapshot_submitter on public.os_quote_snapshots (submitted_by);
create index if not exists os14_fk_quote_project on public.os_quotes (organization_id,project_id);
create index if not exists os14_fk_quote_approver on public.os_quotes (approved_by);
create index if not exists os14_fk_quote_creator on public.os_quotes (created_by);
create index if not exists os14_fk_quote_client on public.os_quotes (organization_id,client_id);
create index if not exists os14_fk_task_opportunity on public.os_tasks (organization_id,opportunity_id);

-- Nothing alters OS10/OS13 feature gates. No automatic dispatch is created.
