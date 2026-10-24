'use server';
import {redirect} from 'next/navigation';
import {createServerSupabase} from '@/lib/auth/server';

/** Generic feedback prevents account enumeration. Template uses SiteURL/auth/confirm. */
export async function requestPasswordRecovery(form:FormData):Promise<never>{
 const raw=form.get('email');
 const email=typeof raw==='string'?raw.trim().toLowerCase():'';
 if(email.length<5||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  redirect('/recuperar-acceso?state=invalid');

 let result:'sent'|'throttled'|'unavailable'='sent';
 try{
  const db=await createServerSupabase();
  const {error}=await db.auth.resetPasswordForEmail(email);
  if(error)result=error.status===429?'throttled':'unavailable';
 }catch{result='unavailable';}
 redirect('/recuperar-acceso?state='+result);
}
