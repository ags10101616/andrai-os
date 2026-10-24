-- OS-06 · Prueba de operación real REVERTIDA COMPLETAMENTE
-- Solo ejecutar con acceso administrativo al proyecto ANDRAI OS.
-- No se guardan ni requieren credenciales/UID en el archivo.
begin;
with x as (
 insert into public.os_clients(id,organization_id,name,source)
 select gen_random_uuid(),organization_id,'OS06 SQL QA','QA'
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1
 returning id
) select set_config('os06.test_client',id::text,true) from x;
select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $check$
declare c uuid:=current_setting('os06.test_client')::uuid;
 p uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); v int; z boolean;
begin
 select created into z from public.os06_create_project_v1(p,c,'Proyecto QA OS06',current_date+5,null,0);
 if z is distinct from true then raise exception 'Expected creation'; end if;
 select created into z from public.os06_create_project_v1(p,c,'Proyecto QA OS06',current_date+5,null,0);
 if z is distinct from false then raise exception 'Expected idempotent replay'; end if;
 begin
  perform * from public.os06_set_project_stage_v1(p,1,'delivered',100);
  raise exception 'Skipped stage accepted';
 exception when invalid_parameter_value then null;
 end;
 select revision into v from public.os06_set_project_stage_v1(p,1,'design',30);
 if v<>2 then raise exception 'Wrong revision after stage update'; end if;
 select created into z from public.os06_create_task_v1(t,'Entregable QA','',current_date+2,p,null,null,'deliverable','high');
 if z is distinct from true then raise exception 'Expected new task'; end if;
 select revision into v from public.os06_set_task_done_v1(t,1,true);
 if v<>2 then raise exception 'Completion revision invalid'; end if;
 if not exists(select 1 from public.os_tasks where id=t and completed_at is not null) then
  raise exception 'Completed timestamp absent';
 end if;
 begin
  update public.os_tasks set completed_at='2000-01-01' where id=t;
  raise exception 'Timestamp spoof accepted';
 exception when insufficient_privilege then null;
 end;
 select revision into v from public.os06_set_task_done_v1(t,2,false);
 if v<>3 then raise exception 'Reopen revision invalid'; end if;
 if exists(select 1 from public.os_tasks where id=t and completed_at is not null) then
  raise exception 'Reopen retained timestamp';
 end if;
end $check$;
rollback;
-- Verify independently that customer/project/task counts match pre-test values.
