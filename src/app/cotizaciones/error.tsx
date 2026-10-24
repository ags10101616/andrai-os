'use client';
export default function QuotesError({reset}:{error:Error;reset:()=>void}){
 return <main className="restricted-page" role="alert"><div className="restricted-card">
  <span className="restricted-logo">ANDRAI<span>.</span></span>
  <div className="eyebrow">COTIZACIONES / REINTENTAR</div>
  <h1>No pudimos cargar las cotizaciones.</h1>
  <p>La consulta falló y no se guardaron cambios desde esta vista. Revisa tu conexión.</p>
  <button className="auth-submit" type="button" onClick={reset}>Reintentar ↗</button>
 </div></main>;
}
