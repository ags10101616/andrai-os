'use client';
export default function ExecutiveError({reset}:{error:Error;reset:()=>void}){
 return <main className="restricted-page" role="alert">
  <div className="restricted-card">
   <span className="restricted-logo">ANDRAI<span>.</span></span>
   <div className="eyebrow">VISIÓN GENERAL / RECUPERACIÓN</div>
   <h1>No pudimos actualizar el tablero.</h1>
   <p>Los indicadores no están disponibles ahora. No se han inventado cifras ni se modificaron registros.</p>
   <button type="button" className="auth-submit" onClick={reset}>Reintentar ↗</button>
  </div>
 </main>;
}
