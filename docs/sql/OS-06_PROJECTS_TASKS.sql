-- OS-06: safe projects, tasks and deliverables. No seed data.
alter table public.os_projects
 add column revision int not null default 1 check (revision>=1),
 add constraint os06_delivered_progress check (
   (stage='delivered' and progress=100) or (stage<>'delivered' and progress<100)
 );

alter table public.os_tasks
 add column kind text not null default 'task' check (kind in ('task','deliverable','milestone')),
 add column priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
 add column completed_at timestamptz,
 add column revision int not null default 1 check (revision>=1),
 add constraint os06_completion_consistency check (done=(completed_at is not null));

create index os06_task_project_due on public.os_tasks(organization_id,project_id,due_on) where project_id is not null;
create index os06_task_assignee_open on public.os_tasks(organization_id,assigned_staff_id,due_on) where not done;

create function os_private.os06_revision_check() returns trigger
language plpgsql security invoker set search_path=''
as $body$
begin
 if new.revision is distinct from old.revision+1 then
   raise exception 'Stale or missing record revision' using errcode='40001';
 end if;
 return new;
end $body$;
revoke all on function os_private.os06_revision_check() from public,anon,authenticated;
create trigger os06_projects_revision before update on public.os_projects
 for each row execute function os_private.os06_revision_check();
create trigger os06_tasks_revision before update on public.os_tasks
 for each row execute function os_private.os06_revision_check();

-- RLS helper: resolved only from the Auth-bound staff row.
create function os_private.os06_current_staff(p_organization_id uuid) returns uuid
language sql stable security definer set search_path=''
as $body$
 select s.id from public.os_staff s join auth.users u on u.id=(select auth.uid())
 where s.organization_id=p_organization_id and s.active and s.bound_user_id=u.id
 and s.email=lower(u.email) and u.email_confirmed_at is not null limit 1
$body$;
revoke all on function os_private.os06_current_staff(uuid) from public,anon,authenticated;
grant execute on function os_private.os06_current_staff(uuid) to authenticated;

-- Direct clients cannot edit title, assignee, tenant, price or client links.
revoke update on public.os_projects,public.os_tasks from authenticated;
grant update(stage,progress,revision) on public.os_projects to authenticated;
grant update(done,completed_at,revision) on public.os_tasks to authenticated;

drop policy if exists os_projects_add on public.os_projects;
create policy os_projects_add on public.os_projects for insert to authenticated
 with check (os_private.member_role(organization_id)='owner');
drop policy if exists os_projects_edit on public.os_projects;
create policy os_projects_edit on public.os_projects for update to authenticated
 using (os_private.member_role(organization_id)='owner'
  or (os_private.member_role(organization_id)='production'
      and assigned_staff_id=os_private.os06_current_staff(organization_id)))
 with check (os_private.member_role(organization_id)='owner'
  or (os_private.member_role(organization_id)='production'
      and assigned_staff_id=os_private.os06_current_staff(organization_id)));

drop policy if exists os_tasks_add on public.os_tasks;
create policy os_tasks_add on public.os_tasks for insert to authenticated
 with check (os_private.member_role(organization_id)='owner'
  or (os_private.member_role(organization_id)='production' and opportunity_id is null
      and assigned_staff_id=os_private.os06_current_staff(organization_id))
  or (os_private.member_role(organization_id)='sales' and project_id is null
      and assigned_staff_id=os_private.os06_current_staff(organization_id)));
drop policy if exists os_tasks_edit on public.os_tasks;
create policy os_tasks_edit on public.os_tasks for update to authenticated
 using (os_private.member_role(organization_id)='owner'
  or (os_private.member_role(organization_id) in ('sales','production')
      and assigned_staff_id=os_private.os06_current_staff(organization_id)))
 with check (os_private.member_role(organization_id)='owner'
  or (os_private.member_role(organization_id) in ('sales','production')
      and assigned_staff_id=os_private.os06_current_staff(organization_id)));

-- Only Direction can create projects. The tenant comes from auth.uid().
create function public.os06_create_project_v1(
 p_id uuid,p_client_id uuid,p_name text,p_due_on date,p_assignee_id uuid,p_amount_minor bigint
) returns table(project_id uuid,created boolean)
language plpgsql volatile security invoker set search_path=''
as $body$
declare org uuid; actor uuid; assignee uuid; inserted int; record public.os_projects%rowtype;
begin
 select s.organization_id,s.id into org,actor from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
   and os_private.member_role(s.organization_id)='owner' limit 1;
 if org is null then raise exception 'Not authorized for project creation' using errcode='42501'; end if;
 assignee:=coalesce(p_assignee_id,actor);
 if p_id is null or p_client_id is null or p_name is null
  or length(btrim(p_name)) not between 2 and 160
  or p_amount_minor is null or p_amount_minor not between 0 and 999999999999
 then raise exception 'Invalid project request' using errcode='22023'; end if;
 if not exists(select 1 from public.os_clients c where c.id=p_client_id and c.organization_id=org)
  or not exists(select 1 from public.os_staff s where s.id=assignee and s.organization_id=org and s.active)
 then raise exception 'Client or assignee not available' using errcode='42501'; end if;
 insert into public.os_projects(id,organization_id,client_id,name,due_on,assigned_staff_id,amount_minor,stage,progress)
 values(p_id,org,p_client_id,btrim(p_name),p_due_on,assignee,p_amount_minor,'brief',0)
 on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 select x.* into record from public.os_projects x where x.id=p_id and x.organization_id=org;
 if not found or record.client_id is distinct from p_client_id or record.name is distinct from btrim(p_name)
  or record.due_on is distinct from p_due_on or record.assigned_staff_id is distinct from assignee
  or record.amount_minor is distinct from p_amount_minor
 then raise exception 'Project replay conflict' using errcode='23505'; end if;
 return query select record.id,(inserted=1);
end $body$;

-- Stage changes require expected revision and one-step transitions.
create function public.os06_set_project_stage_v1(
 p_id uuid,p_revision int,p_stage text,p_progress int
) returns table(project_id uuid,revision int,stage text,progress smallint)
language plpgsql volatile security invoker set search_path=''
as $body$
declare org uuid; actor uuid; role_name text; old_row public.os_projects%rowtype;
 new_row public.os_projects%rowtype;
 stages text[]:=array['brief','design','development','review','delivered'];
begin
 select s.organization_id,s.id,os_private.member_role(s.organization_id)
 into org,actor,role_name from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
 and os_private.member_role(s.organization_id) in ('owner','production') limit 1;
 if org is null then raise exception 'Not authorized for project update' using errcode='42501'; end if;
 select x.* into old_row from public.os_projects x where x.id=p_id and x.organization_id=org;
 if not found or (role_name='production' and old_row.assigned_staff_id is distinct from actor)
 then raise exception 'Project unavailable for update' using errcode='42501'; end if;
 if p_revision is null or p_revision<1 or p_stage is null or not(p_stage=any(stages))
  or p_progress is null or p_progress not between 0 and 100
  or (p_stage='delivered' and p_progress<>100)
  or (p_stage<>'delivered' and p_progress=100)
 then raise exception 'Invalid project status' using errcode='22023'; end if;
 if old_row.revision<>p_revision then
  raise exception 'Concurrent project edit' using errcode='40001'; end if;
 if old_row.stage=p_stage and old_row.progress=p_progress then
  return query select old_row.id,old_row.revision,old_row.stage,old_row.progress; return;
 end if;
 if abs(array_position(stages,p_stage)-array_position(stages,old_row.stage))>1
  or (old_row.stage='delivered' and role_name<>'owner')
 then raise exception 'Invalid workflow transition' using errcode='22023'; end if;
 update public.os_projects x set stage=p_stage,progress=p_progress,revision=x.revision+1
 where x.id=p_id and x.organization_id=org and x.revision=p_revision
 returning x.* into new_row;
 if not found then raise exception 'Concurrent project edit' using errcode='40001'; end if;
 return query select new_row.id,new_row.revision,new_row.stage,new_row.progress;
end $body$;

-- A task can be personal, linked to a project OR to an opportunity.
create function public.os06_create_task_v1(
 p_id uuid,p_title text,p_description text,p_due_on date,p_project_id uuid,
 p_opportunity_id uuid,p_assignee_id uuid,p_kind text,p_priority text
) returns table(task_id uuid,created boolean)
language plpgsql volatile security invoker set search_path=''
as $body$
declare org uuid; actor uuid; role_name text; assignee uuid; inserted int;
 kind_value text:=coalesce(p_kind,'task'); priority_value text:=coalesce(p_priority,'normal');
 record public.os_tasks%rowtype; description_value text:=coalesce(p_description,'');
begin
 select s.organization_id,s.id,os_private.member_role(s.organization_id)
 into org,actor,role_name from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
 and os_private.member_role(s.organization_id) in ('owner','sales','production') limit 1;
 if org is null then raise exception 'Not authorized for task creation' using errcode='42501'; end if;
 assignee:=coalesce(p_assignee_id,actor);
 if p_id is null or p_title is null or length(btrim(p_title)) not between 2 and 180
  or length(description_value)>3000 or p_due_on is null
  or kind_value not in ('task','deliverable','milestone')
  or priority_value not in ('low','normal','high','urgent')
  or (p_project_id is not null and p_opportunity_id is not null)
 then raise exception 'Invalid task request' using errcode='22023'; end if;
 if (role_name<>'owner' and assignee<>actor)
  or not exists(select 1 from public.os_staff s where s.id=assignee and s.organization_id=org and s.active)
 then raise exception 'Task assignment not allowed' using errcode='42501'; end if;
 if (p_project_id is not null and
   (role_name='sales' or not exists(select 1 from public.os_projects x where x.id=p_project_id and x.organization_id=org)))
  or (p_opportunity_id is not null and
   (role_name='production' or not exists(select 1 from public.os_opportunities x where x.id=p_opportunity_id and x.organization_id=org)))
 then raise exception 'Linked record not permitted' using errcode='42501'; end if;
 insert into public.os_tasks(id,organization_id,title,description,due_on,assigned_staff_id,project_id,opportunity_id,kind,priority)
 values(p_id,org,btrim(p_title),description_value,p_due_on,assignee,p_project_id,p_opportunity_id,kind_value,priority_value)
 on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 select x.* into record from public.os_tasks x where x.id=p_id and x.organization_id=org;
 if not found or record.title is distinct from btrim(p_title)
  or record.description is distinct from description_value or record.due_on is distinct from p_due_on
  or record.assigned_staff_id is distinct from assignee
  or record.project_id is distinct from p_project_id or record.opportunity_id is distinct from p_opportunity_id
  or record.kind is distinct from kind_value or record.priority is distinct from priority_value
 then raise exception 'Task replay conflict' using errcode='23505'; end if;
 return query select record.id,(inserted=1);
end $body$;

create function public.os06_set_task_done_v1(
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
 update public.os_tasks x set done=p_done,
  completed_at=case when p_done then now() else null end,revision=x.revision+1
 where x.id=p_id and x.organization_id=org and x.revision=p_revision
 returning x.* into new_row;
 if not found then raise exception 'Concurrent task edit' using errcode='40001'; end if;
 return query select new_row.id,new_row.revision,new_row.done;
end $body$;

revoke all on function public.os06_create_project_v1(uuid,uuid,text,date,uuid,bigint) from public,anon,authenticated;
revoke all on function public.os06_set_project_stage_v1(uuid,integer,text,integer) from public,anon,authenticated;
revoke all on function public.os06_create_task_v1(uuid,text,text,date,uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.os06_set_task_done_v1(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.os06_create_project_v1(uuid,uuid,text,date,uuid,bigint) to authenticated;
grant execute on function public.os06_set_project_stage_v1(uuid,integer,text,integer) to authenticated;
grant execute on function public.os06_create_task_v1(uuid,text,text,date,uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.os06_set_task_done_v1(uuid,integer,boolean) to authenticated;
notify pgrst,'reload schema';
