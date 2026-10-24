import type {Metadata} from 'next';
import Link from 'next/link';
import {createServerSupabase} from '@/lib/auth/server';
import {changeRecoveredPassword} from './actions';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={
 title:'Establecer contraseña',
 robots:{index:false,follow:false,nocache:true}
};

export default async function NewPasswordPage({
 searchParams
}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 const db=await createServerSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 const valid=!authError&&Boolean(user?.id)&&Boolean(user?.email_confirmed_at);
 return <main className="restricted-page">
  <section className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">SEGURIDAD / NUEVA CONTRASEÑA</div>
   <h1>Protege tu acceso<span className="accent">.</span></h1>
   {!valid?<>
    <p>En este navegador no encontramos una sesión válida de recuperación. El enlace pudo vencer o haber sido utilizado.</p>
    <Link href="/recuperar-acceso" className="auth-back">Pedir un nuevo enlace →</Link>
   </>:<>
    <p>Introduce una contraseña nueva de entre 12 y 128 caracteres, exclusiva para esta cuenta.</p>
    {error==='length'&&<div className="auth-error" role="alert">Utiliza entre 12 y 128 caracteres.</div>}
    {error==='mismatch'&&<div className="auth-error" role="alert">Las contraseñas no coinciden.</div>}
    {error==='update'&&<div className="auth-error" role="alert">No fue posible actualizarla. Utiliza otra contraseña más fuerte e inténtalo de nuevo.</div>}
    <form action={changeRecoveredPassword} className="auth-form">
     <label htmlFor="password">Nueva contraseña</label>
     <input id="password" type="password" name="password"
      minLength={12} maxLength={128} autoComplete="new-password" required/>
     <label htmlFor="password-confirm">Repite la nueva contraseña</label>
     <input id="password-confirm" type="password" name="password_confirm"
      minLength={12} maxLength={128} autoComplete="new-password" required/>
     <button type="submit" className="auth-submit">Guardar contraseña ↗</button>
    </form>
    <p className="auth-notice">Después de guardar, inicia sesión nuevamente con tu contraseña nueva. No compartas tu contraseña en el chat.</p>
   </>}
  </section>
 </main>;
}
