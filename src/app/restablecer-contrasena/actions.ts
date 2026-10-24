'use server';
import {redirect} from 'next/navigation';
import {createServerSupabase} from '@/lib/auth/server';

export async function changeRecoveredPassword(form:FormData):Promise<never>{
 const original=form.get('password');
 const repeated=form.get('password_confirm');
 const password=typeof original==='string'?original:'';
 const confirmation=typeof repeated==='string'?repeated:'';
 if(password.length<12||password.length>128)
  redirect('/restablecer-contrasena?error=length');
 if(password!==confirmation)
  redirect('/restablecer-contrasena?error=mismatch');
 const db=await createServerSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user?.id||!user.email_confirmed_at)
  redirect('/recuperar-acceso?state=expired');

 const {error}=await db.auth.updateUser({password});
 if(error)redirect('/restablecer-contrasena?error=update');
 await db.auth.signOut();
 redirect('/login?reset=ok');
}
