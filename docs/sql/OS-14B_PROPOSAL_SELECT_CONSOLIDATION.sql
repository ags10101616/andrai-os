-- ANDRAI OS OS-14B. Consolidate the two permissible SELECT branches
-- with precisely the same predicate: Direction owner OR active verified agent
-- author within its own tenant. No INSERT/UPDATE/DELETE grants or new privilege.
create policy os14_proposal_owner_or_agent_read on public.os_agent_proposals
 as permissive for select to authenticated
 using (
   os_private.member_role(organization_id)='owner'
   or (
     created_by_uid=(select auth.uid())
     and exists (
       select 1 from public.os_agent_identities a
       where a.id=os_agent_proposals.agent_identity_id
        and a.organization_id=os_agent_proposals.organization_id
        and a.bound_user_id=(select auth.uid())
        and a.status='active'
     )
   )
 );
drop policy os13_proposals_owner_read on public.os_agent_proposals;
drop policy os13_proposals_agent_own_read on public.os_agent_proposals;
