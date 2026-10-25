-- OS13 expiry safety: owner may discard an expired suggestion, not approve it.
-- This is a reversible synthetic fixture; real agent capabilities stay unchanged.
begin;
select set_config('os13.qa_owner',bound_user_id::text,true)
 from public.os_staff where active and role='owner' and bound_user_id is not null limit 1;
with inserted as (
 insert into public.os_agent_proposals(
  organization_id,agent_identity_id,created_by_uid,
  kind,summary,rationale,suggested_next_step,brief_snapshot,expires_at
 )
 select a.organization_id,a.id,a.bound_user_id,
  'task','Synthetic expired recommendation',
  'This synthetic recommendation is intentionally expired and must not be approved by Direction.',
  'Discard this recommendation, and request a fresh review.',
  '{}'::jsonb,now()-interval '1 day'
 from public.os_agent_identities a
 join public.os_organizations o on o.id=a.organization_id
 where o.slug='andrai' and a.agent_slug='jose-luis'
 returning id
)
select set_config('os13.qa_expired',id::text,true) from inserted;

update public.os13_proposal_controls
 set review_enabled=true where organization_id=(
  select id from public.os_organizations where slug='andrai'
 );
select set_config('request.jwt.claim.sub',current_setting('os13.qa_owner'),true);
set local role authenticated;
do $qa$
declare status_result text; r record;
begin
 begin
  perform * from public.os13_review_proposal_v1(
   current_setting('os13.qa_expired')::uuid,1,'approved',
   'A proposal older than fourteen days must not be approved.');
  raise exception 'Expired proposal erroneously approved';
 exception when insufficient_privilege then null;end;

 select new_status into status_result from public.os13_review_proposal_v1(
  current_setting('os13.qa_expired')::uuid,1,'rejected',
  'Proposal expired and no longer qualifies for action; discard it.');
 if status_result<>'rejected' then
  raise exception 'Expired proposal was not rejectable';end if;
 select * into r from public.os13_review_summary_v1();
 if r.rejected<>1 or r.total<>1
 then raise exception 'Expired proposal summary wrong: %',row_to_json(r);end if;
end $qa$;
rollback;
