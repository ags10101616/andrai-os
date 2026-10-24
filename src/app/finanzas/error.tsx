'use client';

export default function FinanceError({reset}:{error:Error;reset:()=>void}){
 return <main className="restricted-page" role="alert">
  <div className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">DIRECCIÓN / FINANZAS</div>
   <h1>No pudimos cargar los movimientos.</h1>
   <p>No se realizaron cambios. Puede tratarse de una interrupción de conexión o de permisos.</p>
   <button className="auth-submit" type="button" onClick={reset}>Reintentar ↗</button>
  </div>
 </main>;
}
