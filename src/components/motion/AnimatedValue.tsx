'use client';
import { useEffect, useRef } from 'react';

export type AnimatedValueMode='count'|'money'|'percent';
function formatIntermediate(value:number,mode:AnimatedValueMode):string{
 if(mode==='money')return new Intl.NumberFormat('es-MX',{
  style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2,
 }).format(value/100);
 if(mode==='percent')return new Intl.NumberFormat('es-MX',{
  maximumFractionDigits:0,
 }).format(value)+'%';
 return new Intl.NumberFormat('es-MX',{maximumFractionDigits:0}).format(value);
}
/**
 * Server-supplied display remains the accessible and no-JS source of truth.
 * The changing glyphs are decoration only; it never changes monetary data.
 */
export function AnimatedValue({value,display,mode='count'}:{
 value:number;display:string;mode?:AnimatedValueMode;
}){
 const element=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const node=element.current;
  if(!node)return;
  let frame=0;
  function canMove(){
   return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    &&document.documentElement.dataset.lpMotion!=='reduce';
  }
  function run(){
   window.cancelAnimationFrame(frame);
   if(!node||!canMove()||value===0||!Number.isSafeInteger(value)){
    if(node)node.textContent=display;
    return;
   }
   const duration=640;
   let start:number|undefined;
   function tick(now:number){
    if(!node)return;
    if(!canMove()){node.textContent=display;return;}
    if(start===undefined)start=now;
    const fraction=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-fraction,3);
    if(fraction>=1){node.textContent=display;return;}
    const current=mode==='money'
     ?Math.round(value*eased):Math.round(value*eased);
    node.textContent=formatIntermediate(current,mode);
    frame=window.requestAnimationFrame(tick);
   }
   frame=window.requestAnimationFrame(tick);
  }
  run();
  const handleReduced=()=>{if(!canMove()){window.cancelAnimationFrame(frame);node.textContent=display;}};
  const handleReplay=()=>run();
  window.addEventListener('lp:preference-changed',handleReduced);
  window.addEventListener('lp:replay',handleReplay);
  return ()=>{
   window.cancelAnimationFrame(frame);
   window.removeEventListener('lp:preference-changed',handleReduced);
   window.removeEventListener('lp:replay',handleReplay);
  };
 },[value,display,mode]);
 return <>
  <span className="sr-only">{display}</span>
  <span className="lp-counter" aria-hidden="true" ref={element}>{display}</span>
 </>;
}
