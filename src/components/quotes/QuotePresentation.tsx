'use client';
import {useState,type ReactNode} from 'react';

type Appearance='statement'|'atelier';
/** On-screen style only. The quote totals, permissions and PDF stay server authoritative. */
export function QuotePresentation({children}:{children:ReactNode}){
 const [appearance,setAppearance]=useState<Appearance>('statement');
 return <div className="lp-quote-presentation" data-appearance={appearance}>
  <div className="lp-quote-ribbon">
   <div>
    <span className="lp-eyebrow">ANDRAI / DOCUMENTOS</span>
    <h2>Una propuesta, dos expresiones.</h2>
    <p>Cambia la presentación sin modificar importes,
     versión, condiciones ni autorizaciones.</p>
   </div>
   <div className="lp-quote-select" role="group" aria-label="Apariencia de la cotización">
    <button type="button" aria-pressed={appearance==='statement'}
     onClick={()=>setAppearance('statement')}>Statement</button>
    <button type="button" aria-pressed={appearance==='atelier'}
     onClick={()=>setAppearance('atelier')}>Atelier</button>
   </div>
  </div>
  {children}
  <p className="lp-quote-footnote">
   La descarga PDF existente conserva su formato contractual y los importes verificados.
   Estos controles únicamente cambian la presentación en pantalla.
  </p>
 </div>;
}
