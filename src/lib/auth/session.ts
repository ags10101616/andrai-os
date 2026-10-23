import { redirect } from 'next/navigation';
import { createServerSupabase } from './server';
import { canVisit, isTeamRole, type TeamRole } from './roles';

export interface Member {
  id: string;
  organizationId: string;
  displayName: string;
  role: TeamRole;
  verifiedEmail: string;
}
export type SessionAccess =
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'member'; member: Member };

/** Never trust a role claim from the browser, querystring, or user metadata. */
export async function resolveSession(): Promise<SessionAccess> {
  const db = await createServerSupabase();
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user?.id || !user.email || !user.email_confirmed_at) {
    return { kind: 'signed-out' };
  }
  const email = user.email.trim().toLowerCase();
  const { data: memberships, error: membershipError } = await db
    .from('os_staff')
    .select('id, organization_id, role, display_name, email, bound_user_id')
    .eq('email', email)
    .eq('active', true)
    .limit(2);

  if (membershipError) {
    // Fail closed rather than interpreting a database outage as no authorization.
    throw new Error('Unable to verify workspace authorization.');
  }
  if (!memberships || memberships.length !== 1) return { kind: 'restricted' };
  const row = memberships[0];
  if (!isTeamRole(row.role) || row.email !== email) return { kind: 'restricted' };
  if (row.bound_user_id !== user.id) return { kind: 'restricted' };

  return {
    kind: 'member',
    member: {
      id: row.id,
      organizationId: row.organization_id,
      displayName: row.display_name,
      role: row.role,
      verifiedEmail: email,
    },
  };
}

export async function requireMembership(section: string): Promise<Member> {
  const session = await resolveSession();
  if (session.kind === 'signed-out') redirect('/login');
  if (session.kind !== 'member' || !canVisit(session.member.role, section)) {
    redirect('/acceso-restringido');
  }
  return session.member;
}
