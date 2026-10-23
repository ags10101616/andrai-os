import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/session';
import { allowedBySection, canVisit } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await resolveSession();
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  if (state.kind === 'signed-out') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  if (state.kind === 'restricted') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
  }
  const member = state.member;
  return NextResponse.json({
    role: member.role,
    displayName: member.displayName,
    sections: Object.keys(allowedBySection).filter(section => canVisit(member.role, section)),
  }, { headers });
}
