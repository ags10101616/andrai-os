-- ANDRAI OS OS-13: agent suggestion intake and human editorial review
-- Every modification is synthetic, checked and ROLLED BACK.
begin;
-- Auth-bound dot remains brief_read-only in the real system.
select set_config('os13.test_agent_uid',a.bound_user_id::text,true)
from public.os_agent_identities a join public.os_organizations o on o.id=a.organization_id
where o.slug='andrai' and a.agent_slug='jose-luis' and a.status='active';
select set_config('os13.test_owner_uid',s.bound_user_id::text,true)
from public.os_staff s where s.role='owner' and s.active and s.bound_user_id is not null limit 1;

select set_config('request.jwt.claim.sub',current_setting('os13.test_agent_uid'),true);
set local role authenticated;
do $closed$
declare trial uuid:=gen_random_uuid();
begin
 begin
  perform * from public.os13_submit_proposal_v1(
   trial,'alert','Revisión operativa de pendientes',
   'Hay acciones abiertas que conviene priorizar por fecha.',
   'Revisar el resumen de tareas y decidir prioridades');
  raise exception 'Agent created a proposal while intake and capability are OFF';
 exception when insufficient_privilege then null;
 end;
end $closed$;

reset role;
update public.os_agent_identities a
 set capabilities=array['brief_read','proposal_draft']::text[]
 from public.os_organizations o
 where o.id=a.organization_id and o.slug='andrai'
 and a.agent_slug='jose-luis' and a.status='active';
update public.os13_proposal_controls c
 set intake_enabled=true,review_enabled=false
 from public.os_organizations o where o.id=c.organization_id and o.slug='andrai';

set local role authenticated;
do $agent$
declare
 v_first uuid:=gen_random_uuid();
 v_second uuid:=gen_random_uuid();
 v_trial uuid:=gen_random_uuid();
 v_new boolean; v_n int; v_note jsonb;
begin
 perform set_config('os13.proposal1',v_first::text,true);
 perform set_config('os13.proposal2',v_second::text,true);
 select created into v_new from public.os13_submit_proposal_v1(
  v_first,'alert','Alertar de tareas vencidas',
  'El resumen indica tareas abiertas; Dirección debería revisar prioridades y fechas antes de comprometer nuevas entregas.',
  'Revisar las tareas abiertas y definir cuáles requieren atención prioritaria');
 if v_new is distinct from true then raise exception 'First proposal not created';end if;
 select created into v_new from public.os13_submit_proposal_v1(
  v_first,'alert','Alertar de tareas vencidas',
  'El resumen indica tareas abiertas; Dirección debería revisar prioridades y fechas antes de comprometer nuevas entregas.',
  'Revisar las tareas abiertas y definir cuáles requieren atención prioritaria');
 if v_new is distinct from false then raise exception 'Idempotency replay duplicated proposal';end if;
 begin
  perform * from public.os13_submit_proposal_v1(
  v_first,'alert','Cambió el contenido de la misma propuesta',
  'La propuesta cambió y no debe usar el mismo ID para el reintento de envío.',
  'Considerar de nuevo el seguimiento interno');
  raise exception 'Changed retry accepted';
 exception when unique_violation then null;end;

 select created into v_new from public.os13_submit_proposal_v1(
  v_second,'task','Revisar avance de entregables',
  'Conviene analizar si existen entregables abiertos y decidir quién debe supervisar la revisión interna.',
  'Establecer responsables internos y priorizar las tareas en función de su fecha');
 if v_new is distinct from true then raise exception 'Second proposal not created';end if;

 select count(*) into v_n from public.os_agent_proposals;
 if v_n<>2 then raise exception 'Agent can read unexpected proposals: %',v_n;end if;
 if exists(select 1 from public.os_agent_proposals p
  where p.brief_snapshot ? 'finance'
    or p.brief_snapshot ? 'client_email'
    or p.brief_snapshot ? 'client_name')
 then raise exception 'Proposal source brief leaked sensitive keys';end if;
 if exists(select 1 from public.os_agent_proposals where status<>'proposed')
 then raise exception 'Proposals not in proposed state';end if;
 select count(*) into v_n from public.os_event_outbox;
 if v_n<>0 then raise exception 'Agent can see owner-only audit outbox';end if;

 -- Eight total proposals allowed per local day; ninth denied.
 for i in 1..6 loop
   perform * from public.os13_submit_proposal_v1(
    gen_random_uuid(),'followup','Preparar evaluación de operaciones',
    'El tablero de indicadores requiere una revisión periódica para mantener claridad en el seguimiento.',
    'Solicitar a Dirección una revisión interna de prioridades y responsables');
 end loop;
 begin
  perform * from public.os13_submit_proposal_v1(
   gen_random_uuid(),'task','Intento de rebasar el límite',
   'El sistema debe impedir que un agente envíe más de ocho propuestas en un solo día.',
   'Verificar el presupuesto diario de propuestas');
  raise exception 'Daily maximum of 8 was not enforced';
 exception when program_limit_exceeded then null;end;
 select count(*) into v_n from public.os_agent_proposals;
 if v_n<>8 then raise exception 'Expected eight proposals, got %',v_n;end if;
 -- Direct database UPDATE/INSERT is not permitted to the authenticated role.
 if has_table_privilege('authenticated','public.os_agent_proposals','INSERT')
 or has_table_privilege('authenticated','public.os_agent_proposals','UPDATE')
 then raise exception 'Direct client proposal write privilege detected';end if;
end $agent$;

-- Distinguish a human decision from a real business execution.
select set_config('request.jwt.claim.sub',current_setting('os13.test_owner_uid'),true);
do $before_review$
begin
 begin
  perform * from public.os13_review_proposal_v1(
  current_setting('os13.proposal1')::uuid,1,'approved',
  'Revisado por Dirección; pendiente de programación y ejecución humana.');
  raise exception 'Review happened while the review gate was OFF';
 exception when insufficient_privilege then null;end;
end $before_review$;

reset role;
update public.os13_proposal_controls c
 set review_enabled=true
 from public.os_organizations o where o.id=c.organization_id and o.slug='andrai';
set local role authenticated;
do $owner$
declare v_status text;v_version int; rec record;
begin
 select new_status,new_revision into v_status,v_version
 from public.os13_review_proposal_v1(
  current_setting('os13.proposal1')::uuid,1,'approved',
  'Aprobada como idea; no se ejecutan cambios ni mensajes externos.');
 if v_status<>'approved' or v_version<>2 then
  raise exception 'Editorial approval failed';end if;

 begin
  perform * from public.os13_review_proposal_v1(
   current_setting('os13.proposal1')::uuid,1,'approved',
   'Este reintento no debe aprobar nuevamente la misma propuesta.');
  raise exception 'Repeat approval accepted';
 exception when serialization_failure then null;end;
 select new_status into v_status from public.os13_review_proposal_v1(
  current_setting('os13.proposal2')::uuid,1,'rejected',
  'No se autoriza esta recomendación; se mantiene sin ejecutar.');
 if v_status<>'rejected' then raise exception 'Rejection was not saved';end if;

 select * into rec from public.os13_review_summary_v1();
 if rec.proposed<>6 or rec.approved<>1 or rec.rejected<>1
 or rec.expired_pending<>0 or rec.total<>8 then
  raise exception 'Owner review summary incorrect: %',row_to_json(rec);end if;

 if not exists(select 1 from public.os_agent_proposals p
  where p.id=current_setting('os13.proposal1')::uuid
  and p.reviewed_by_uid=(select auth.uid())
  and p.resolved_at is not null)
 then raise exception 'Reviewer evidence was not stored';end if;
 if exists(select 1 from public.os_tasks)
  or exists(select 1 from public.os_ledger)
  or exists(select 1 from public.os_quotes)
 then raise exception 'Approving proposal changed a real business entity';end if;
 select count(*) into v_version from public.os_event_outbox
 where entity_type='os_agent_proposals' and source_action='UPDATE'
   and dispatch_state='held';
 if v_version<>2 then raise exception 'Review updates not audited';end if;
 select count(*) into v_version from public.os_event_outbox
 where entity_type='os_agent_proposals' and source_action='INSERT'
   and dispatch_state='held';
 if v_version<>8 then raise exception 'Eight agent submission events not captured';end if;
end $owner$;

-- Role-change negative tests. Both changes are reverted at ROLLBACK.
reset role;
update public.os_staff set role='sales' where bound_user_id=current_setting('os13.test_owner_uid')::uuid;
set local role authenticated;
do $sales$
declare n int;
begin
 select count(*) into n from public.os_agent_proposals;
 if n<>0 then raise exception 'Sales can read agent reviews';end if;
 begin
  perform * from public.os13_review_summary_v1();
  raise exception 'Sales obtained owner review summary';
 exception when insufficient_privilege then null;end;
 begin
  perform * from public.os13_review_proposal_v1(
   current_setting('os13.proposal1')::uuid,2,'approved',
   'Usuario de Comercial no puede aprobar estas propuestas');
  raise exception 'Sales could review';
 exception when insufficient_privilege then null;end;
end $sales$;
rollback;