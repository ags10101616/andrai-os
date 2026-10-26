import {requireMembership} from '@/lib/auth/session';
import {createServerSupabase} from '@/lib/auth/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
const TABLES=[
 'os_clients','os_opportunities','os_projects','os_tasks',
 'os_quotes','os_quote_snapshots','os_ledger','os_audit_events'
] as const;
const PAGE_SIZE=500;
const MAX_ROWS_PER_TABLE=5000;
const headerBase={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff',
 'X-Robots-Tag':'noindex, nofollow',
 'Referrer-Policy':'no-referrer',
 'Content-Security-Policy':"default-src 'none'",
};
/**
 * Private owner-scoped operational JSON export. This is NOT a database dump
 * or a guarantee of disaster recovery. Uses only the authenticated, RLS-filtered per-request database client.
 */
export async function GET():Promise<Response>{
 const member=await requireMembership('equipo');
 if(member.role!=='owner')
  return new Response('Acceso denegado',{status:403,headers:headerBase});
 const db=await createServerSupabase();
 const tables:Record<string,unknown[]>={};
 try{
  for(const table of TABLES){
   const rows:unknown[]=[];
   for(let offset=0;offset<MAX_ROWS_PER_TABLE;offset+=PAGE_SIZE){
    const {data,error}=await db.from(table)
     .select('*').eq('organization_id',member.organizationId)
     .order('id',{ascending:true}).range(offset,offset+PAGE_SIZE-1);
    if(error)throw new Error('Export unavailable');
    const chunk=data??[];
    rows.push(...chunk);
    if(chunk.length<PAGE_SIZE)break;
    if(offset+PAGE_SIZE>=MAX_ROWS_PER_TABLE)
     throw new Error('Export exceeds safe limit');
   }
   tables[table]=rows;
  }
  const now=new Date();
  const payload={
   format:'andrai-os-owner-data-export-v1',
   exported_at:now.toISOString(),
   scope:'commercial_operational_tables_only',
   restore_supported:false,
   notice:'Exportación privada para consulta; no sustituye un backup administrado de PostgreSQL.',
   tables,
  };
  const date=now.toISOString().slice(0,10);
  return new Response(JSON.stringify(payload,null,2),{
   status:200,
   headers:{...headerBase,
    'Content-Type':'application/json; charset=utf-8',
    'Content-Disposition':'attachment; filename="ANDRAI-OS-datos-'+date+'.json"',
   },
  });
 }catch{
  return new Response('La exportación no está disponible. No se descargó un archivo parcial.',{
   status:503,headers:headerBase,
  });
 }
}
