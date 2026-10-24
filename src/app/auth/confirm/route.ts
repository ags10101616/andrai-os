import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { publicSupabaseConfig } from '@/lib/auth/server';

export const dynamic='force-dynamic';
export const revalidate=0;
export const runtime='nodejs';

/** Consume Supabase's one-time recovery token without reflecting it in a redirect. */
export async function GET(request:NextRequest):Promise<NextResponse>{
 const token_hash=request.nextUrl.searchParams.get('token_hash');
 const type=request.nextUrl.searchParams.get('type');
 const denied=NextResponse.redirect(new URL('/recuperar-acceso?state=expired',request.url));
 denied.headers.set('Cache-Control','no-store');
 denied.headers.set('Referrer-Policy','no-referrer');

 if(type!=='recovery'||!token_hash||token_hash.length<16||token_hash.length>2048)
  return denied;

 const allowed=NextResponse.redirect(new URL('/restablecer-contrasena',request.url));
 allowed.headers.set('Cache-Control','private, no-store, max-age=0');
 allowed.headers.set('Referrer-Policy','no-referrer');
 try{
  const {url,publishableKey}=publicSupabaseConfig();
  const db=createServerClient(url,publishableKey,{
   cookies:{
    getAll(){return request.cookies.getAll();},
    setAll(items){
     for(const {name,value,options} of items){
      request.cookies.set(name,value);
      allowed.cookies.set(name,value,options);
     }
    },
   },
  });
  const {data,error}=await db.auth.verifyOtp({token_hash,type:'recovery'});
  if(error||!data.user?.id||!data.user.email_confirmed_at)return denied;
  return allowed;
 }catch{
  return denied;
 }
}
