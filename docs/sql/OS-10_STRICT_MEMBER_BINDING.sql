-- ANDRAI OS OS-10: do not grant workspace access to unbound pending staff.
-- Existing active bound owner remains unaffected. No rows or customer data changed.
-- Private schema SECURITY DEFINER is needed exclusively for an auth.users lookup
-- inside RLS; neither the function nor arbitrary SQL is exposed as a public RPC.

create or replace function os_private.member_role(p_organization_id uuid)
returns text
language sql stable security definer set search_path=''
as $guard$
 select s.role
 from public.os_staff s
 join auth.users u on u.id=(select auth.uid())
 where s.organization_id=p_organization_id
   and s.active
   and s.bound_user_id=u.id
   and lower(u.email)=s.email
   and u.email_confirmed_at is not null
 limit 1
$guard$;

revoke all on function os_private.member_role(uuid) from public,anon,authenticated;
grant execute on function os_private.member_role(uuid) to authenticated;

-- Avoid exposing the membership lookup in the public Data API.
-- The server continues to verify Supabase Auth and membership independently.
notify pgrst,'reload schema';
