'use client';
import {useEffect,useState} from 'react';

const PREF_KEY='andrai.os.liquid-precision.preferences.v1';
function readStored():{motion:boolean;solid:boolean}{
 try{
  const raw=window.localStorage.getItem(PREF_KEY);
  if(!raw)return {motion:false,solid:false};
  const parsed=JSON.parse(raw) as Record<string,unknown>;
  return {motion:parsed.motion===true,solid:parsed.solid===true};
 }catch{return {motion:false,solid:false};}
}
export function WorkspacePreferences(){
 const [reduced,setReduced]=useState(false);
 const [solid,setSolid]=useState(false);
 const [osReduced,setOsReduced]=useState(false);
 const [osSolid,setOsSolid]=useState(false);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  const saved=readStored();
  setReduced(saved.motion);setSolid(saved.solid);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const transparency=window.matchMedia('(prefers-reduced-transparency: reduce)');
  const update=()=>{
   setOsReduced(motion.matches);setOsSolid(transparency.matches);
  };
  update();setReady(true);
  motion.addEventListener('change',update);
  transparency.addEventListener('change',update);
  return ()=>{
   motion.removeEventListener('change',update);
   transparency.removeEventListener('change',update);
  };
 },[]);
 useEffect(()=>{
  if(!ready)return;
  const effectiveReduced=reduced||osReduced;
  const effectiveSolid=solid||osSolid;
  document.documentElement.dataset.lpMotion=effectiveReduced?'reduce':'full';
  document.documentElement.dataset.lpSolid=effectiveSolid?'true':'false';
  window.dispatchEvent(new Event('lp:preference-changed'));
  try{window.localStorage.setItem(PREF_KEY,JSON.stringify({motion:reduced,solid}));}catch{}
 },[ready,reduced,solid,osReduced,osSolid]);
 const effectiveReduced=reduced||osReduced;
 const effectiveSolid=solid||osSolid;
 return <details className="lp-motion-settings">
  <summary aria-label="Preferencias visuales de ANDRAI OS">
   <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></svg>
   Visual
  </summary>
  <div className="lp-motion-popover">
   <h3>A tu ritmo.</h3>
   <p>Elige una experiencia ligera sin alterar datos, permisos ni funciones.</p>
   <button type="button" className="lp-motion-choice" aria-pressed={effectiveReduced}
    disabled={osReduced} onClick={()=>setReduced(p=>!p)}>
    <span><strong>Reducir movimiento</strong><small>Desactiva conteos y desplazamientos decorativos.</small></span>
    <span className="lp-switch" aria-hidden="true"/>
   </button>
   <button type="button" className="lp-motion-choice" aria-pressed={effectiveSolid}
    disabled={osSolid} onClick={()=>setSolid(p=>!p)}>
    <span><strong>Superficies opacas</strong><small>Reemplaza el cristal por fondos sólidos.</small></span>
    <span className="lp-switch" aria-hidden="true"/>
   </button>
   <p className="lp-motion-note">{osReduced||osSolid
    ?'Se respeta automáticamente la configuración de accesibilidad de tu dispositivo.'
    :'Las preferencias se guardan solo en este navegador.'}</p>
  </div>
 </details>;
}
