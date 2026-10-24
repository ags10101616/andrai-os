-- OS-12 · Verified active agent identity and revocation QA.
-- Read-only checks and a reversible status change. Never creates passwords,
-- clients, or an owner staff membership. Must end with ROLLBACK.
begin;
select set_config('request.jwt.claim.sub',a.bound_user_id::text,true)
from public.os_agent_identities a join public.os_organizations o
  on o.id=a.organization_id
where o.slug='andrai' and a.agent_slug='jose-luis' and a.status='active';
set local role authenticated;
do $valid$
declare b jsonb; v int;
begin
 b:=public.os12_agent_brief_v1();
 if b->>'role'<>'agent' or b->>'mode'<>'read_only'
 or b->>'access'<>'brief_read' then raise exception 'Agent brief denied';end if;
 if b ? 'finance' or b ? 'client_email' then raise exception 'Private brief payload';end if;
 select count(*) into v from public.os_staff;
 if v<>0 then raise exception 'Agent inherited a human staff row';end if;
 select count(*) into v from public.os_clients;
 if v<>0 then raise exception 'Agent could read private client data';end if;
 select count(*) into v from public.os_ledger;
 if v<>0 then raise exception 'Agent could read owner ledger';end if;
 begin
  perform * from public.os08_finance_summary_v1();
  raise exception 'Agent accessed Direction finance';
 exception when insufficient_privilege then null;end;
end $valid$;
reset role;
update public.os_agent_identities a set status='suspended'
from public.os_organizations o
where o.id=a.organization_id and o.slug='andrai'
 and a.agent_slug='jose-luis' and a.status='active';
set local role authenticated;
do $revoked$
begin
 begin
  perform public.os12_agent_brief_v1();
  raise exception 'Suspended agent remains authorized';
 exception when insufficient_privilege then null;end;
end $revoked$;
rollback;
