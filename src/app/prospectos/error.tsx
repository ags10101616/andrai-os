'use client';

export default function ProspectsError({reset}:{error:Error;reset:()=>void}) {
  return <main className="restricted-page" role="alert">
    <div className="restricted-card">
      <span className="restricted-logo">ANDRAI<span>.</span></span>
      <div className="eyebrow">CRM / RECUPERACIÓN</div>
      <h1>No pudimos cargar el CRM.</h1>
      <p>No se modificaron datos desde esta vista. Reintenta la carga o vuelve a entrar más tarde.</p>
      <button type="button" onClick={reset} className="auth-submit">Reintentar ↗</button>
    </div>
  </main>;
}
