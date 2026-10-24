-- OS-03 reproducible, zero-persistence SQL test.
-- Execute through the ANDRAI OS project SQL editor / authorized management client.
-- All inserted clients, opportunities, and audit events are rolled back.
-- NO production IDs, credentials or email addresses are stored in this file.

begin;
do $setup$
begin
  perform set_config('request.jwt.claim.sub',
    (select s.bound_user_id::text from public.os_staff s
      join public.os_organizations o on o.id = s.organization_id
      where o.slug='andrai' and s.role='owner' and s.active
        and s.bound_user_id is not null limit 1),true);
end $setup$;
set local role authenticated;
do $checks$
declare
 c1 uuid := gen_random_uuid();
 o1 uuid := gen_random_uuid();
 c2 uuid := gen_random_uuid();
 o2 uuid := gen_random_uuid();
 v_created boolean;
 v_count integer;
begin
 select t.created into v_created from public.os_create_lead_v1(
   c1,o1,'QA temporal','','qa@example.invalid',null,'QA',
   'Oportunidad temporal',1000,'Agendar llamada',current_date
 ) t;
 if v_created is distinct from true then raise exception 'first create was not created'; end if;

 select t.created into v_created from public.os_create_lead_v1(
   c1,o1,'QA temporal','','qa@example.invalid',null,'QA',
   'Oportunidad temporal',1000,'Agendar llamada',current_date
 ) t;
 if v_created is distinct from false then raise exception 'idempotency replay failure'; end if;

 select count(*) into v_count from public.os_opportunities where id=o1;
 if v_count<>1 then raise exception 'duplicate opportunity'; end if;

 begin
   perform * from public.os_create_lead_v1(
     c1,o1,'QA temporal','','qa@example.invalid',null,'QA',
     'Different title',1000,'Agendar llamada',current_date
   );
   raise exception 'expected idempotency conflict';
 exception when unique_violation then null;
 end;

 -- A failed SECOND insert must roll back its attempted FIRST insert.
 begin
   perform * from public.os_create_lead_v1(
     c2,o1,'Client not saved','','qa2@example.invalid',null,'QA',
     'Oportunidad temporal',1000,'Agendar llamada',current_date
   );
   raise exception 'expected atomic conflict';
 exception when unique_violation then null;
 end;
 select count(*) into v_count from public.os_clients where id=c2;
 if v_count<>0 then raise exception 'partial client after failed second insert'; end if;

 begin
   update public.os_clients set organization_id=gen_random_uuid() where id=c1;
   raise exception 'expected immutable org';
 exception when insufficient_privilege then null;
 end;

 begin
   perform * from public.os_create_lead_v1(
     c2,o2,'X','','qa3@example.invalid',null,'QA',
     'Oportunidad temporal',1000,'Agendar llamada',current_date
   );
   raise exception 'expected invalid name';
 exception when invalid_parameter_value then null;
 end;

 select count(*) into v_count from public.os_audit_events
 where entity in ('os_clients','os_opportunities');
 if v_count<>2 then raise exception 'Expected two audited writes, got %', v_count; end if;

 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin
   perform * from public.os_create_lead_v1(
     gen_random_uuid(),gen_random_uuid(),'Unauthorized','','',null,'QA',
     'Should not save',1000,'Agendar llamada',current_date
   );
   raise exception 'expected role denial';
 exception when insufficient_privilege then null;
 end;
end $checks$;
rollback;

-- Once completed, separately verify:
-- SELECT count(*) FROM public.os_clients;        -- 0 on an initially empty project
-- SELECT count(*) FROM public.os_opportunities;  -- 0
-- SELECT count(*) FROM public.os_audit_events;   -- 0
