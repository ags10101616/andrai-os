import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { requireMembership } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';
import { isTeamRole, roleLabels } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = { title: 'Equipo y permisos' };

export default async function TeamPage() {
  const member = await requireMembership('equipo');
  const db = await createServerSupabase();
  const { data, error } = await db
    .from('os_staff')
    .select('display_name, email, role, active, bound_user_id')
    .eq('organization_id', member.organizationId)
    .order('display_name');

  if (error) throw new Error('Unable to load workspace staff.');
  return <AppShell active="equipo" role={member.role} displayName={member.displayName}>
    <section className="page-intro"><div><div className="eyebrow">DIRECCIÓN / CONTROL DE ACCESO</div><h1>Equipo y permisos<span className="accent">.</span></h1><p>Solo Dirección puede consultar la membresía del workspace. Las altas requieren revisión administrativa.</p></div></section>
    <section className="panel">
      <div className="panel-head"><div><h2>Accesos autorizados</h2><p>Consulta segura desde Supabase · Sin creación pública de usuarios.</p></div></div>
      <div className="roster" role="list">
        {(data ?? []).map((row,index) => <div className="roster-entry" role="listitem" key={index}>
          <div><strong>{row.display_name}</strong><small>{row.email}</small></div>
          <span>{isTeamRole(row.role) ? roleLabels[row.role] : 'Sin rol'}</span>
          <span className={row.active && row.bound_user_id ? 'roster-ready' : 'roster-pending'}>{row.active && row.bound_user_id ? 'Vinculado' : 'Sin activar'}</span>
        </div>)}
      </div>
      <p className="note">José Luis no aparece como usuario porque todavía no dispone de identidad ni permisos automatizados. Las invitaciones se activarán tras las pruebas de seguridad.</p>
    </section>
  </AppShell>;
}
