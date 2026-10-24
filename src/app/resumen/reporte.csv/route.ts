import { loadExecutiveDashboard } from '@/lib/dashboard/data';
import { buildExecutiveCsv } from '@/lib/dashboard/csv';
import { parseDashboardDays } from '@/lib/dashboard/model';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

/** Download only aggregated metrics that the authenticated role is entitled to see. */
export async function GET(request:Request):Promise<Response>{
 const params=new URL(request.url).searchParams;
 const days=parseDashboardDays(params.get('days'));
 // loadExecutiveDashboard checks Supabase Auth + RLS and rejects leaked finance
 // columns for sales/production. No generic unauthenticated report endpoint exists.
 const data=await loadExecutiveDashboard(days);
 const report=buildExecutiveCsv(data.report);
 const date=data.report.asOf.replaceAll('-','');
 const filename='ANDRAI-OS-Reporte-'+days+'d-'+date+'.csv';
 const bytes=new TextEncoder().encode(report);
 return new Response(bytes,{
  status:200,
  headers:{
    'Content-Type':'text/csv; charset=utf-8',
    'Content-Disposition':'attachment; filename="'+filename+'"',
    'Cache-Control':'private, no-store, max-age=0',
    'X-Content-Type-Options':'nosniff',
    'X-Robots-Tag':'noindex, nofollow',
  },
 });
}
