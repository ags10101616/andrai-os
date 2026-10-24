import type {Metadata} from 'next';
import Link from 'next/link';
import {requestPasswordRecovery} from './actions';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={
 title:'Recuperar acceso',
 robots:{index:false,follow:false,nocache:true}
};

export default async function RecoveryRequestPage({
 searchParams
}:{searchParams:Promise<{state?:string}>}){
 const {state}=await searchParams;
 return <main className="restricted-page">
  <section className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">SEGURIDAD / RECUPERAR ACCESO</div>
   <h1>Recupera tu contraseña<span className="accent">.</span></h1>
   <p>Te enviaremos un enlace de un solo uso para establecer una contraseña nueva en ANDRAI OS.</p>
   {state==='sent'&&<div className="auth-notice" role="status">Si existe una cuenta con ese correo, recibirás un enlace. Revisa también spam.</div>}
   {state==='expired'&&<div className="auth-error" role="alert">El enlace caducó o no pudo verificarse. Solicita uno nuevo.</div>}
   {state==='invalid'&&<div className="auth-error" role="alert">Introduce un correo válido.</div>}
   {state==='throttled'&&<div className="auth-error" role="alert">Demasiados intentos. Reintenta más tarde.</div>}
   {state==='unavailable'&&<div className="auth-error" role="alert">El servicio no pudo enviar el correo ahora. Intenta más tarde.</div>}
   <form action={requestPasswordRecovery} className="auth-form">
    <label htmlFor="reset-email">Correo de la cuenta</label>
    <input name="email" id="reset-email" type="email" autoComplete="email"
     inputMode="email" maxLength={254} required placeholder="correo@empresa.com"/>
    <button className="auth-submit" type="submit">Solicitar enlace ↗</button>
   </form>
   <p className="auth-notice">No compartas el enlace de recuperación con otras personas. No pedimos contraseñas por chat.</p>
   <Link className="auth-back" href="/login">Volver al inicio de sesión →</Link>
  </section>
 </main>;
}
