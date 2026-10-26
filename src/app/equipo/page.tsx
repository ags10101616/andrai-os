import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import {isPilotReadOnly} from '@/lib/release/gates';
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
  const {data:agentRows,error:agentError}=await db.from('os_agent_identities')
   .select('id,display_name,agent_slug,status,bound_user_id')
   .eq('organization_id',member.organizationId)
   .order('display_name');
  if(agentError)throw new Error('Unable to load agent account status.');
  return <AppShell active="equipo" role={member.role} displayName={member.displayName}>
    <section className="page-intro"><div><div className="eyebrow">DIRECCIÓN / CONTROL DE ACCESO</div><h1>Equipo y permisos<span className="accent">.</span></h1><p>Solo Dirección puede consultar la membresía del workspace. Las altas requieren revisión administrativa.</p></div></section>
    <section className="panel os16-operations-panel">
      <div className="panel-head"><div><h2>Preparación operativa</h2>
       <p>Controles de captura, recuperación y exportación de datos de la agencia.</p>
      </div></div>
      <dl className="os16-feature-gates">
       {([
        ['Prospectos', 'OS05_CRM_WRITES_ENABLED'],
        ['Proyectos y tareas', 'OS06_OPERATIONS_WRITES_ENABLED'],
        ['Cotizaciones', 'OS07_QUOTES_WRITES_ENABLED'],
        ['Finanzas', 'OS08_FINANCE_WRITES_ENABLED'],
       ] as const).map(([label,key])=><div key={key}>
        <dt>{label}</dt>
        <dd>{!isPilotReadOnly()&&process.env[key]==='true'?'Captura privada habilitada':'Solo lectura'}</dd>
       </div>)}
      </dl>
      <div className="os16-operational-actions">
       <a className="db-export" href="/equipo/exportar" download>Exportar datos comerciales (JSON) ↗</a>
      </div>
      <p className="os16-onboarding-foot">Esta exportación es una copia de consulta privada.
       No sustituye un respaldo administrado de PostgreSQL ni verifica su restauración.
       Conserva el archivo en un lugar seguro, porque contiene información de clientes.
      </p>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h2>Accesos autorizados</h2><p>Consulta segura desde Supabase · Sin creación pública de usuarios.</p></div></div>
      <div className="roster" role="list">
        {(data ?? []).map((row,index) => <div className="roster-entry" role="listitem" key={index}>
          <div><strong>{row.display_name}</strong><small>{row.email}</small></div>
          <span>{isTeamRole(row.role) ? roleLabels[row.role] : 'Sin rol'}</span>
          <span className={row.active && row.bound_user_id ? 'roster-ready' : 'roster-pending'}>{row.active && row.bound_user_id ? 'Vinculado' : 'Sin activar'}</span>
        </div>)}
      </div>
      <p className="note">Las altas humanas se gestionan por separado y requieren una identidad confirmada.</p>
    </section>
    <section className="panel agent-registry-panel">
     <div className="panel-head"><div><h2>Identidades de agentes</h2>
      <p>Estas identidades nunca heredan roles humanos. Vinculación administrada y revocable.</p>
     </div></div>
     <div className="roster" role="list">
      {(agentRows??[]).map(agent=><div key={agent.id} className="roster-entry" role="listitem">
       <div><strong>{agent.display_name}</strong><small>Agente separado · {agent.agent_slug}</small></div>
       <span>Solo lectura</span>
       <span className={agent.status==='active'&&agent.bound_user_id?'roster-ready':'roster-pending'}>
        {agent.status==='active'&&agent.bound_user_id?'Activo':agent.status==='suspended'?'Suspendido':'Pendiente'}
       </span>
      </div>)}
     </div>
     <p className="note">El alta definitiva requiere una cuenta Auth confirmada y vinculada. No se crean contraseñas ni invitaciones desde este panel.</p>
    </section>
  </AppShell>;
}
