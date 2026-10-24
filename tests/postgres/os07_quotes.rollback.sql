-- OS-07 transactional integration suite. NEVER COMMIT PII OR CREDENTIALS.
-- All seed records are synthetic and every test is rolled back.
begin;
with tmp as (
 insert into public.os_clients(id,organization_id,name,source)
 select gen_random_uuid(),organization_id,'OS07 integration QA','QA'
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1
 returning id
) select set_config('os07.qa_client',id::text,true) from tmp;
select set_config('request.jwt.claim.sub',bound_user_id::text,true)
 from public.os_staff where role='owner' and active and bound_user_id is not null limit 1;
set local role authenticated;
do $checks$
declare
 cid uuid:=current_setting('os07.qa_client')::uuid;
 qid uuid:=gen_random_uuid();
 q2 uuid:=gen_random_uuid();
 lines jsonb:='[{"description":"Sitio web","detail":"Diseño y desarrollo","quantity":2,"unit_minor":650000}]'::jsonb;
 lines_v2 jsonb:='[{"description":"Sitio corporativo","quantity":1,"unit_minor":750000},{"description":"Integración","quantity":1,"unit_minor":250000}]'::jsonb;
 was_created boolean;
 ver integer;
 rev integer;
 status_value text;
 subtotal bigint;
 tax bigint;
 total bigint;
 checks integer;
 approver uuid;
begin
 select created into was_created from public.os07_create_quote_v1(
  qid,cid,null,'Cotización inicial QA',lines,1600,current_date+10,'Condición A'
 );
 if was_created is distinct from true then raise exception 'First insertion failed'; end if;
 select amount_minor,tax_minor,total_minor into subtotal,tax,total
 from public.os_quotes where id=qid;
 if subtotal<>1300000 or tax<>208000 or total<>1508000
 then raise exception 'Totals incorrect: % % %',subtotal,tax,total;end if;

 select created into was_created from public.os07_create_quote_v1(
  qid,cid,null,'Cotización inicial QA',lines,1600,current_date+10,'Condición A'
 );
 if was_created is distinct from false then raise exception 'Replay inserted quote'; end if;

 begin
  perform * from public.os07_create_quote_v1(
   qid,cid,null,'Different title',lines,1600,current_date+10,'Condición A');
  raise exception 'Changed replay must conflict';
 exception when unique_violation then null;
 end;

 select revision,version into rev,ver from public.os07_replace_draft_v1(
  qid,1,'Cotización inicial QA',lines_v2,1600,current_date+10,'Condición B'
 );
 if rev<>2 or ver<>1 then raise exception 'Draft edit failed';end if;
 select amount_minor,tax_minor,total_minor into subtotal,tax,total
 from public.os_quotes where id=qid;
 if subtotal<>1000000 or tax<>160000 or total<>1160000
 then raise exception 'Edited totals incorrect';end if;

 begin
  perform * from public.os07_replace_draft_v1(qid,1,'Unexpected change',lines,1600,current_date+10,'Condition X');
  raise exception 'Stale revision allowed';
 exception when serialization_failure then null;
 end;

 select revision,status into rev,status_value
 from public.os07_transition_v1(qid,2,'submit');
 if rev<>3 or status_value<>'review' then raise exception 'Review submission failed';end if;
 select count(*) into checks from public.os_quote_snapshots where quote_id=qid and version=1;
 if checks<>1 then raise exception 'v1 snapshot count wrong';end if;

 begin
  perform * from public.os07_transition_v1(qid,3,'sent');
  raise exception 'Sent before approval';
 exception when insufficient_privilege then null;
 end;

 select revision,version,status into rev,ver,status_value
 from public.os07_transition_v1(qid,3,'revise');
 if rev<>4 or ver<>2 or status_value<>'draft'
 then raise exception 'Revision request failed';end if;
 select revision into rev from public.os07_replace_draft_v1(
  qid,4,'Cotización versión 2',lines,0,current_date+12,'Sin IVA según decisión manual'
 );
 if rev<>5 then raise exception 'Version two draft edit failed';end if;
 select revision into rev from public.os07_transition_v1(qid,5,'submit');
 if rev<>6 then raise exception 'Review v2 failed';end if;
 select count(*) into checks from public.os_quote_snapshots where quote_id=qid;
 if checks<>2 then raise exception 'Expected two immutable snapshots';end if;

 select revision into rev from public.os07_transition_v1(qid,6,'approve');
 if rev<>7 then raise exception 'Approval failed';end if;
 select approved_by into approver from public.os_quotes where id=qid;
 if approver is null then raise exception 'Approved by not recorded';end if;

 begin
  update public.os_quotes set notes='Tampering after approval',revision=revision+1 where id=qid;
  raise exception 'Approved content was mutable';
 exception when insufficient_privilege then null;
 end;

 select revision into rev from public.os07_transition_v1(qid,7,'sent');
 if rev<>8 then raise exception 'Manual sent recording failed';end if;
 select revision into rev from public.os07_transition_v1(qid,8,'accept');
 if rev<>9 then raise exception 'Manual accepted recording failed';end if;
 select count(*) into checks from public.os_quote_snapshots
  where quote_id=qid and version=1 and notes='Condición B';
 if checks<>1 then raise exception 'Version 1 snapshot was overwritten';end if;
 begin
  delete from public.os_quote_snapshots where quote_id=qid;
  raise exception 'Authenticated caller could delete historic snapshots';
 exception when insufficient_privilege then null;
 end;

 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin
  perform * from public.os07_create_quote_v1(q2,cid,null,'Unauthorized quote',lines,1600,current_date+10,'');
  raise exception 'Unbound identity created a quote';
 exception when insufficient_privilege then null;
 end;
end $checks$;
rollback;
