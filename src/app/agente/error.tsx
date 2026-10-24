'use client';
export default function AgentError({reset}:{error:Error;reset:()=>void}){
 return <main className="restricted-page" role="alert">
  <div className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">AGENTE / ACCESO CONTROLADO</div>
   <h1>No pudimos verificar el acceso.</h1>
   <p>El sistema no concede permisos adicionales si falla la consulta de identidad o el resumen.</p>
   <button className="auth-submit" type="button" onClick={reset}>Volver a comprobar ↗</button>
  </div>
 </main>;
}
