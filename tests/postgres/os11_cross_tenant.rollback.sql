-- OS-11 · Synthetic cross-tenant isolation test (all changes ROLLBACK)
begin;
with o as (
 insert into public.os_organizations(id,slug,name)
 values(gen_random_uuid(),'qa11-'||substr(md5(gen_random_uuid()::text),1,8),'Synthetic tenant QA')
 returning id
) select set_config('os11.foreign_tenant',id::text,true) from o;

insert into public.os_clients(organization_id,name,source)
 values(current_setting('os11.foreign_tenant')::uuid,'Synthetic company','QA');

select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $verify$
declare n integer;
begin
 select count(*) into n from public.os_event_outbox
 where organization_id=current_setting('os11.foreign_tenant')::uuid;
 if n<>0 then raise exception 'Foreign event record visible';end if;
 if (public.os11_event_summary_v1(30)->>'total')::integer<>0
 then raise exception 'Foreign event included in owner report';end if;
end $verify$;
rollback;
