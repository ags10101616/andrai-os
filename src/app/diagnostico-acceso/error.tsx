'use client';
export default function DiagnosticError({reset}:{error:Error;reset:()=>void}){
 return <main className="restricted-page" role="alert">
  <div className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">DIAGNÓSTICO / SERVICIO NO DISPONIBLE</div>
   <h1>No podemos comprobar los permisos ahora.</h1>
   <p>La consulta de identidad falló. Ningún acceso se habilitó por defecto. Puedes volver a intentar.</p>
   <button className="auth-submit" type="button" onClick={reset}>Reintentar ↗</button>
  </div>
 </main>;
}
