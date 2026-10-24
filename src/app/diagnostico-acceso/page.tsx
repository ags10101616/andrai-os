import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveSession } from '@/lib/auth/session';
import { roleLabels } from '@/lib/auth/roles';
import { signOut } from '@/lib/auth/actions';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={
 title:'Diagnóstico de acceso',
 robots:{index:false,follow:false,nocache:true}
};

export default async function AccessDiagnosticPage(){
 const access=await resolveSession();
 return <main className="access-diagnostic-page">
  <section className="access-diagnostic-card">
   <div className="auth-wordmark">ANDRAI<span>.</span></div>
   <p className="auth-overline">ACCESO PRIVADO / OS-10</p>
   <h1>Comprobación de acceso<span className="accent">.</span></h1>
   <p className="access-explainer">Esta página comprueba tu sesión actual con Supabase Auth y vuelve a consultar tu membresía directamente en la base de datos.</p>
   {access.kind==='signed-out'&&<>
    <div className="access-result access-result-attention" role="status">
     <strong><span aria-hidden="true">◌</span> Sin sesión válida</strong>
     <p>El navegador no tiene una sesión confirmada de ANDRAI OS. Inicia sesión con tu cuenta autorizada. Si te registraste recientemente, revisa la confirmación de correo.</p>
    </div>
    <Link className="access-primary-link" href="/login">Iniciar sesión ↗</Link>
   </>}
   {access.kind==='restricted'&&<>
    <div className="access-result access-result-attention" role="status">
     <strong><span aria-hidden="true">◌</span> Sesión válida, acceso restringido</strong>
     <p>La cuenta pudo autenticarse, pero no existe una membresía activa y vinculada que permita abrir el workspace. Contacta a Dirección para revisar el acceso.</p>
    </div>
    <form action={signOut}><button type="submit" className="access-primary-link">Cerrar sesión y usar otra cuenta ↗</button></form>
   </>}
   {access.kind==='member'&&<>
    <div className="access-result access-result-success" role="status">
     <strong><span aria-hidden="true">✓</span> Acceso autorizado</strong>
     <p>Sesión confirmada. Tu membresía de {roleLabels[access.member.role]} está activa y vinculada. Puedes entrar al workspace.</p>
    </div>
    <Link className="access-primary-link" href="/resumen">Abrir ANDRAI OS ↗</Link>
   </>}
   <div className="access-diagnostic-help">
    <h2>¿La página ni siquiera llega a abrirse?</h2>
    <p>Ese bloqueo corresponde al acceso a la preview de Vercel, que es independiente de tu sesión de ANDRAI OS. Accede con la misma cuenta de Vercel propietaria del proyecto o utiliza un enlace temporal de preview autorizado.</p>
    <p>Este diagnóstico no muestra contraseñas, identificadores de sesión, tokens ni correos completos.</p>
   </div>
  </section>
 </main>;
}
