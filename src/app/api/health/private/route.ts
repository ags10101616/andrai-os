import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';

export const dynamic='force-dynamic';
export const revalidate=0;
const headers={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff',
 'X-Robots-Tag':'noindex, nofollow'
};
export async function GET():Promise<Response>{
 try{
  const state=await resolveSession();
  if(state.kind==='signed-out')
   return NextResponse.json({status:'unauthorized'},{status:401,headers});
  if(state.kind==='restricted')
   return NextResponse.json({status:'forbidden'},{status:403,headers});
  const db=await createServerSupabase();
  const {data,error}=await db.rpc('os09_dashboard_v1',{p_days:7});
  if(error||!data||typeof data!=='object')
   return NextResponse.json({status:'degraded',component:'database'},{status:503,headers});
  return NextResponse.json({
   status:'ready',app:'andrai-os',spec:'os-10',component:'workspace',
   role:state.member.role,readOnly:process.env.OS10_PILOT_READ_ONLY!=='false'
  },{status:200,headers});
 }catch{
  return NextResponse.json({status:'degraded',component:'workspace'},{status:503,headers});
 }
}
