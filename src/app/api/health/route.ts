import {NextResponse} from 'next/server';
import {isPilotReadOnly} from '@/lib/release/gates';

/** Liveness and exact pilot-mode observation. Never interpreted as DB readiness. */
export function GET(){
 const manualWritesEnabled=!isPilotReadOnly()
  &&process.env.OS05_CRM_WRITES_ENABLED==='true'
  &&process.env.OS06_OPERATIONS_WRITES_ENABLED==='true'
  &&process.env.OS07_QUOTES_WRITES_ENABLED==='true'
  &&process.env.OS08_FINANCE_WRITES_ENABLED==='true';
 return NextResponse.json({
  status:'ok',application:'andrai-os',spec:'os-16',
  mode:manualWritesEnabled?'private-pilot-manual-entry':'read-only-preview',
  agent_mode:'read-only',component:'http',
  revision:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??'local',
 },{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
