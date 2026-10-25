-- OS-14 emergency rollback template. REVIEW before applying.
-- If applied, run as a new versioned migration (never delete migration history).
-- Index removal is reversible; do not run automatically in production.
create policy os12_agent_self_read on public.os_agent_identities
 for select to authenticated using (
  status='active' and bound_user_id=(select auth.uid())
 );
create policy os12_owner_agent_registry_read on public.os_agent_identities
 for select to authenticated using(os_private.member_role(organization_id)='owner');
drop policy os14_agent_identity_read on public.os_agent_identities;
create policy os_agent_owner_read on public.os_agent_proposals
 for select to authenticated using(os_private.member_role(organization_id)='owner');
alter policy os_ledger_owner_add on public.os_ledger
 with check (
  os_private.member_role(organization_id)='owner' and entered_by=auth.uid()
 );
drop index if exists public.os14_fk_task_opportunity;
drop index if exists public.os14_fk_quote_client;
drop index if exists public.os14_fk_quote_creator;
drop index if exists public.os14_fk_quote_approver;
drop index if exists public.os14_fk_quote_project;
drop index if exists public.os14_fk_snapshot_submitter;
drop index if exists public.os14_fk_project_client;
drop index if exists public.os14_fk_project_assignee;
drop index if exists public.os14_fk_opportunity_assignee;
drop index if exists public.os14_fk_ledger_project;
drop index if exists public.os14_fk_ledger_entered_by;
drop index if exists public.os14_fk_audit_actor;
drop index if exists public.os14_fk_proposal_reviewer;
drop index if exists public.os14_fk_proposal_creator;
drop index if exists public.os14_fk_proposal_agent;
