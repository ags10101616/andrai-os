-- OS-13 cross-organization proposal isolation: synthetic, rollback-only.
begin;
select set_config('os13.qa_owner_uid',bound_user_id::text,true)
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1;

with tenant as (
 insert into public.os_organizations(id,slug,name)
 values(gen_random_uuid(),'os13-qa-'||substr(md5(gen_random_uuid()::text),1,8),
  'Synthetic Other Agency')
 returning id
) select set_config('os13.qa_other_org',id::text,true) from tenant;

with a as (
 insert into public.os_agent_identities(
 organization_id,agent_slug,display_name,status
 ) values (
 current_setting('os13.qa_other_org')::uuid,
 'qa-dot','Synthetic QA Agent','pending'
 ) returning id
) select set_config('os13.qa_other_agent',id::text,true) from a;

with foreign_suggestion as (
 insert into public.os_agent_proposals(
 organization_id,agent_identity_id,created_by_uid,
 kind,summary,rationale,suggested_next_step,brief_snapshot
 ) values(
 current_setting('os13.qa_other_org')::uuid,
 current_setting('os13.qa_other_agent')::uuid,
 current_setting('os13.qa_owner_uid')::uuid,
 'alert','Review synthetic foreign operation',
 'This sample belongs to another organization and must never be shown in the Andrai dashboard.',
 'Assign a foreign review to the correct organization owner.',
 '{}'::jsonb
 ) returning id
) select set_config('os13.qa_other_proposal',id::text,true)
 from foreign_suggestion;

update public.os13_proposal_controls
 set review_enabled=true where organization_id=(
 select id from public.os_organizations where slug='andrai'
 );
select set_config('request.jwt.claim.sub',current_setting('os13.qa_owner_uid'),true);
set local role authenticated;
do $check$
declare
 n int;summary record;
begin
 select count(*) into n from public.os_agent_proposals
 where organization_id=current_setting('os13.qa_other_org')::uuid;
 if n<>0 then raise exception 'Foreign proposal leaked through RLS';end if;

 select * into summary from public.os13_review_summary_v1();
 if summary.total<>0 then raise exception 'Foreign proposal contaminated summary';end if;

 select count(*) into n from public.os_event_outbox
 where organization_id=current_setting('os13.qa_other_org')::uuid;
 if n<>0 then raise exception 'Foreign proposal event leaked through RLS';end if;

 begin
  perform * from public.os13_review_proposal_v1(
   current_setting('os13.qa_other_proposal')::uuid,1,'approved',
   'A user cannot authorize a suggestion from another organization.'
  );
  raise exception 'Foreign proposal review incorrectly authorized';
 exception when insufficient_privilege then null;end;
end $check$;
rollback;
