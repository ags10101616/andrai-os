import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireMembership } from '@/lib/auth/session';

/**
 * OS-03 data layer. Not exposed as an HTTP endpoint yet.
 * OS-05 will provide a validated form and retain its two UUIDs across retries.
 */
export interface CreateLeadCommand {
  clientId: string;
  opportunityId: string;
  clientName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  source?: string;
  title: string;
  amountMinor: number;
  nextAction: string;
  nextActionOn: string; // YYYY-MM-DD
}

export type CreateLeadResult = {
  clientId: string;
  opportunityId: string;
  created: boolean;
};

function requireUuid(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Invalid request ID');
  }
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const dt = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().startsWith(value);
}
export async function createLeadAtomic(command: CreateLeadCommand): Promise<CreateLeadResult> {
  // A server-side permission check is not a substitute for RLS.
  await requireMembership('prospectos');
  requireUuid(command.clientId);
  requireUuid(command.opportunityId);
  if (command.clientId === command.opportunityId) throw new Error('Distinct IDs required');
  if (!command.clientName?.trim() || !command.title?.trim() || !command.nextAction?.trim()) throw new Error('Required information missing');
  if (!validDate(command.nextActionOn)) throw new Error('Invalid date');
  if (!Number.isSafeInteger(command.amountMinor) || command.amountMinor < 0 || command.amountMinor > 999999999999) {
    throw new Error('Invalid amount');
  }
  const db = await createServerSupabase();
  const { data, error } = await db.rpc('os_create_lead_v1', {
    p_client_id: command.clientId,
    p_opportunity_id: command.opportunityId,
    p_client_name: command.clientName,
    p_contact_name: command.contactName ?? '',
    p_email: command.email ?? null,
    p_phone: command.phone ?? null,
    p_source: command.source ?? 'Otro',
    p_title: command.title,
    p_amount_minor: command.amountMinor,
    p_next_action: command.nextAction,
    p_next_action_on: command.nextActionOn,
  }).single();

  if (error || !data) {
    // Deliberately do not expose raw SQL errors to end users.
    if (error?.code === '23505') throw new Error('The submitted request IDs are already associated with different data');
    if (error?.code === '42501') throw new Error('You are not authorized for this action');
    throw new Error('We could not create the lead; retry with the same request IDs');
  }
  const row: unknown = data;
  if (
    !row || typeof row !== 'object' ||
    !('client_id' in row) || typeof row.client_id !== 'string' ||
    !('opportunity_id' in row) || typeof row.opportunity_id !== 'string' ||
    !('created' in row) || typeof row.created !== 'boolean'
  ) {
    throw new Error('Lead creation returned an invalid response');
  }
  return {
    clientId: row.client_id,
    opportunityId: row.opportunity_id,
    created: row.created,
  };
}
