-- OS-07 migration 2: derived subtotal uses DB default, not an actor-supplied INSERT field.
alter table public.os_quotes alter column amount_minor set default 0;
create or replace function public.os07_create_quote_v1(
 p_id uuid,p_client_id uuid,p_project_id uuid,p_title text,p_lines jsonb,
 p_tax_rate_bps integer,p_valid_until date,p_notes text
) returns table(quote_id uuid,created boolean)
language plpgsql volatile security invoker set search_path=''
as $create$
declare org uuid;actor uuid;inserted int;row_q public.os_quotes%rowtype;
begin
 select s.organization_id,s.bound_user_id into org,actor
 from public.os_staff s
 where s.bound_user_id=(select auth.uid()) and s.active
  and os_private.member_role(s.organization_id) in ('owner','sales') limit 1;
 if org is null or p_id is null or p_client_id is null then
  raise exception 'Not authorized to create quote' using errcode='42501';end if;
 insert into public.os_quotes(
  id,organization_id,client_id,project_id,title,line_items,
  notes,tax_rate_bps,valid_until,created_by
 ) values (
  p_id,org,p_client_id,p_project_id,p_title,p_lines,
  coalesce(p_notes,''),p_tax_rate_bps,p_valid_until,actor
 ) on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 select q.* into row_q from public.os_quotes q where q.id=p_id and q.organization_id=org;
 if not found or row_q.client_id is distinct from p_client_id
  or row_q.project_id is distinct from p_project_id
  or row_q.title is distinct from p_title
  or row_q.line_items is distinct from p_lines
  or row_q.notes is distinct from coalesce(p_notes,'')
  or row_q.tax_rate_bps is distinct from p_tax_rate_bps
  or row_q.valid_until is distinct from p_valid_until
 then raise exception 'Quote idempotency conflict' using errcode='23505';end if;
 return query select row_q.id,(inserted=1);
end
$create$;

notify pgrst,'reload schema';
