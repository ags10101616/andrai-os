-- OS-06 hardening: enforce lifecycle and completion timestamp in Postgres.
-- Additive, keeps the initial migration immutable.

create function os_private.os06_stage_guard() returns trigger
language plpgsql security invoker set search_path=''
as $body$
declare states text[]:=array['brief','design','development','review','delivered'];
begin
 if new.stage is distinct from old.stage then
  if abs(array_position(states,new.stage)-array_position(states,old.stage))>1
    or (old.stage='delivered' and os_private.member_role(old.organization_id)<>'owner')
  then raise exception 'Workflow transition not permitted' using errcode='22023'; end if;
 end if;
 return new;
end $body$;
revoke all on function os_private.os06_stage_guard() from public,anon,authenticated;
create trigger os06_project_stage_guard before update on public.os_projects
 for each row execute function os_private.os06_stage_guard();

create function os_private.os06_task_completion_guard() returns trigger
language plpgsql security invoker set search_path=''
as $body$
begin
 if tg_op='INSERT' then
  if new.done or new.completed_at is not null
  then raise exception 'New tasks must start pending' using errcode='22023'; end if;
  return new;
 end if;
 if new.done is distinct from old.done then
  new.completed_at:=case when new.done then pg_catalog.now() else null end;
 else
  new.completed_at:=old.completed_at;
 end if;
 return new;
end $body$;
revoke all on function os_private.os06_task_completion_guard() from public,anon,authenticated;
create trigger os06_task_completion_guard before insert or update on public.os_tasks
 for each row execute function os_private.os06_task_completion_guard();

-- Timestamp is now controlled by the trigger, not by a role's direct write.
revoke update(completed_at) on public.os_tasks from authenticated;

-- Make completion mutations update only done and revision; trigger sets time.
create or replace function public.os06_set_task_done_v1(
 p_id uuid,p_revision int,p_done boolean
) returns table(task_id uuid,revision int,done boolean)
language plpgsql volatile security invoker set search_path=''
as $body$
declare org uuid; actor uuid; role_name text; old_row public.os_tasks%rowtype;
 new_row public.os_tasks%rowtype;
begin
 select s.organization_id,s.id,os_private.member_role(s.organization_id)
 into org,actor,role_name from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
 and os_private.member_role(s.organization_id) in ('owner','sales','production') limit 1;
 if org is null or p_id is null or p_done is null then
  raise exception 'Not authorized for task update' using errcode='42501'; end if;
 select x.* into old_row from public.os_tasks x where x.id=p_id and x.organization_id=org;
 if not found or (role_name<>'owner' and old_row.assigned_staff_id is distinct from actor)
 then raise exception 'Task unavailable for update' using errcode='42501'; end if;
 if old_row.done=p_done then
  return query select old_row.id,old_row.revision,old_row.done; return;
 end if;
 if p_revision is null or p_revision<1 or old_row.revision<>p_revision
 then raise exception 'Concurrent task edit' using errcode='40001'; end if;
 update public.os_tasks x set done=p_done,revision=x.revision+1
 where x.id=p_id and x.organization_id=org and x.revision=p_revision
 returning x.* into new_row;
 if not found then raise exception 'Concurrent task edit' using errcode='40001'; end if;
 return query select new_row.id,new_row.revision,new_row.done;
end $body$;


notify pgrst,'reload schema';
