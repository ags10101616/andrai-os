import 'server-only';
import { resolveAgentSession } from '@/lib/agent/session';
import { resolveSession } from './session';

/**
 * Session-aware entry without a new credential, impersonation or bypass.
 * Staff and agents retain separate, database-verified identities and RLS.
 */
export type WorkspaceLanding = 'resumen' | 'agente' | 'restricted' | 'login';

export async function resolveWorkspaceLanding(): Promise<WorkspaceLanding> {
  const staff = await resolveSession();
  if (staff.kind === 'member') return 'resumen';
  if (staff.kind === 'signed-out') return 'login';

  // A confirmed Supabase user without staff membership may be the agent.
  // Never derive this from an email string, URL, or user_metadata.
  const dot = await resolveAgentSession();
  if (dot.kind === 'agent') return 'agente';
  return 'restricted';
}
