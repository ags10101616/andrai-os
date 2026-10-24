'use client';
export default function EventsError({reset}:{error:Error;reset:()=>void}){
 return <main className="restricted-page" role="alert">
  <div className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">EVENTOS / SERVICIO NO DISPONIBLE</div>
   <h1>No pudimos consultar los eventos.</h1>
   <p>La lectura se interrumpió. No se enviaron notificaciones ni se modificaron datos.</p>
   <button className="auth-submit" onClick={reset} type="button">Reintentar ↗</button>
  </div>
 </main>;
}
