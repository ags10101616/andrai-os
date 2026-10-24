-- ANDRAI OS / OS-09 — Role-scoped executive snapshot and time-window reporting
-- Read-only, no customer records generated, no service role, no view bypassing RLS.
-- Period boundaries: America/Monterrey; accepted time windows 7, 30, 90 days.
-- Current workload metrics are all-time snapshots; period metrics are explicitly named.
create function public.os09_dashboard_v1(p_days integer default 30)
returns jsonb
language plpgsql stable security invoker set search_path=''
as $report$
declare
 v_org uuid;
 v_staff uuid;
 v_role text;
 v_today date:=(pg_catalog.now() at time zone 'America/Monterrey')::date;
 v_since date;
 v_start_ts timestamptz;
 v_end_ts timestamptz;
 v_tasks jsonb:='{}'::jsonb;
 v_sales jsonb;
 v_projects jsonb;
 v_finance jsonb;
 v_pipeline jsonb:='[]'::jsonb;
 v_quote_states jsonb:='[]'::jsonb;
 v_project_stages jsonb:='[]'::jsonb;
 v_total bigint;
 v_active bigint;
 v_period bigint;
 v_overdue bigint;
 v_amount numeric;
 v_q_review bigint;
 v_q_total bigint;
 v_project_due bigint;
 v_project_progress numeric;
 v_revenue bigint;
 v_expenses bigint;
 v_refunds bigint;
 v_accept_open bigint;
 v_done bigint;
 v_task_open bigint;
 v_task_overdue bigint;
 v_task_soon bigint;
 v_task_completed bigint;
 v_deliverables bigint;
 v_result jsonb;
begin
 if p_days is null or p_days not in (7,30,90) then
  raise exception 'Unsupported report window' using errcode='22023';
 end if;
 select s.organization_id,s.id,os_private.member_role(s.organization_id)
   into v_org,v_staff,v_role
 from public.os_staff s
 where s.active and s.bound_user_id=(select auth.uid())
   and os_private.member_role(s.organization_id) in ('owner','sales','production')
 limit 1;
 if v_org is null or v_role not in ('owner','sales','production') then
  raise exception 'Workspace report access denied' using errcode='42501';
 end if;

 v_since:=v_today-(p_days-1);
 v_start_ts:=(v_since::timestamp at time zone 'America/Monterrey');
 v_end_ts:=((v_today+1)::timestamp at time zone 'America/Monterrey');

 select count(*) filter(where not t.done),
   count(*) filter(where not t.done and t.due_on<v_today),
   count(*) filter(where not t.done and t.due_on>=v_today and t.due_on<v_today+7),
   count(*) filter(where t.done and t.completed_at>=v_start_ts and t.completed_at<v_end_ts),
   count(*) filter(where not t.done and t.kind='deliverable')
 into v_task_open,v_task_overdue,v_task_soon,v_task_completed,v_deliverables
 from public.os_tasks t
 where t.organization_id=v_org
   and (v_role='owner' or t.assigned_staff_id=v_staff);
 v_tasks:=jsonb_build_object(
  'open',v_task_open,'overdue',v_task_overdue,'due_soon_7',v_task_soon,
  'completed_in_period',v_task_completed,'open_deliverables',v_deliverables,
  'scope',case when v_role='owner' then 'team' else 'assigned' end
 );
 v_result:=jsonb_build_object(
  'role',v_role,
  'as_of',v_today,
  'period_start',v_since,
  'period_end',v_today,
  'days',p_days,
  'timezone','America/Monterrey',
  'tasks',v_tasks
 );

 if v_role in ('owner','sales') then
  select count(*) filter(where o.stage in ('new','contacted','meeting','proposal')),
   count(*) filter(where o.created_at>=v_start_ts and o.created_at<v_end_ts),
   count(*) filter(where o.stage='won'),
   count(*) filter(where o.stage in ('new','contacted','meeting','proposal')
     and o.next_action_on<v_today),
   coalesce(sum(o.amount_minor) filter(where o.stage in ('new','contacted','meeting','proposal')),0)
  into v_active,v_period,v_total,v_overdue,v_amount
  from public.os_opportunities o where o.organization_id=v_org;

  select coalesce(jsonb_agg(jsonb_build_object(
   'stage',st.stage,'count',coalesce(a.n,0)
  ) order by st.position),'[]'::jsonb) into v_pipeline
  from (values (1,'new'),(2,'contacted'),(3,'meeting'),(4,'proposal'),
   (5,'won'),(6,'lost')) as st(position,stage)
  left join (
   select o.stage,count(*)::bigint n from public.os_opportunities o
   where o.organization_id=v_org group by o.stage
  ) a on a.stage=st.stage;

  select count(*),count(*) filter(where q.status='review')
  into v_q_total,v_q_review
  from public.os_quotes q where q.organization_id=v_org;
  select coalesce(jsonb_agg(jsonb_build_object(
    'status',st.status,'count',coalesce(a.n,0)
   ) order by st.position),'[]'::jsonb)
  into v_quote_states
  from (values (1,'draft'),(2,'review'),(3,'approved'),(4,'sent'),
   (5,'accepted'),(6,'rejected')) as st(position,status)
  left join (
   select q.status,count(*)::bigint n from public.os_quotes q
   where q.organization_id=v_org group by q.status
  ) a on a.status=st.status;

  v_sales:=jsonb_build_object(
   'active_opportunities',v_active,
   'new_in_period',v_period,
   'won_total',v_total,
   'overdue_followups',v_overdue,
   'open_pipeline_minor',v_amount,
   'pipeline',v_pipeline,
   'quotes_total',v_q_total,
   'quotes_in_review',v_q_review,
   'quote_statuses',v_quote_states
  );
  v_result:=v_result||jsonb_build_object('sales',v_sales);
 end if;

 if v_role in ('owner','production') then
  select count(*) filter(where p.stage<>'delivered'),
   count(*) filter(where p.stage='delivered'),
   count(*) filter(where p.created_at>=v_start_ts and p.created_at<v_end_ts),
   count(*) filter(where p.stage<>'delivered' and p.due_on<v_today),
   coalesce(avg(p.progress) filter(where p.stage<>'delivered'),0)
  into v_active,v_done,v_period,v_project_due,v_project_progress
  from public.os_projects p
  where p.organization_id=v_org
    and (v_role='owner' or p.assigned_staff_id=v_staff);

  select coalesce(jsonb_agg(jsonb_build_object(
    'stage',st.stage,'count',coalesce(a.n,0)
   ) order by st.position),'[]'::jsonb)
  into v_project_stages
  from (values (1,'brief'),(2,'design'),(3,'development'),(4,'review'),(5,'delivered'))
    as st(position,stage)
  left join (
   select p.stage,count(*)::bigint n from public.os_projects p
   where p.organization_id=v_org and
    (v_role='owner' or p.assigned_staff_id=v_staff)
   group by p.stage
  ) a on a.stage=st.stage;
  v_projects:=jsonb_build_object(
    'active',v_active,
    'delivered_total',v_done,
    'created_in_period',v_period,
    'overdue',v_project_due,
    'avg_active_progress_percent',round(v_project_progress,1),
    'stages',v_project_stages,
    'scope',case when v_role='owner' then 'team' else 'assigned' end
  );
  v_result:=v_result||jsonb_build_object('operations',v_projects);
 end if;

 if v_role='owner' then
  select
   coalesce(sum(l.amount_minor) filter(where l.entry_type='receipt'),0),
   coalesce(sum(l.amount_minor) filter(where l.entry_type='expense'),0),
   coalesce(sum(l.amount_minor) filter(where l.entry_type='refund'),0)
  into v_revenue,v_expenses,v_refunds
  from public.os_ledger l
  where l.organization_id=v_org and l.happened_on between v_since and v_today;

  -- Outstanding = accepted quote value - net receipts, across all dates,
  -- using the existing secured OS-08 source of truth.
  select f.accepted_quote_open_minor into v_accept_open
  from public.os08_finance_summary_v1() f;
  v_finance:=jsonb_build_object(
   'receipts_in_period_minor',v_revenue,
   'expenses_in_period_minor',v_expenses,
   'refunds_in_period_minor',v_refunds,
   'net_in_period_minor',v_revenue-v_expenses-v_refunds,
   'accepted_open_minor_all',v_accept_open,
   'source','manually_registered'
  );
  v_result:=v_result||jsonb_build_object('finance',v_finance);
 end if;

 return v_result;
end
$report$;
revoke all on function public.os09_dashboard_v1(integer) from public,anon,authenticated;
grant execute on function public.os09_dashboard_v1(integer) to authenticated;
notify pgrst,'reload schema';
