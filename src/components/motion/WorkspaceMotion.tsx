'use client';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

function motionAllowed():boolean{
 return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  &&document.documentElement.dataset.lpMotion!=='reduce';
}
/** Motion is presentation only: never edits the server-rendered data. */
export function WorkspaceMotion(){
 const pathname=usePathname();
 useEffect(()=>{
  const main=document.getElementById('workspace-main');
  if(!main)return;
  const entries=Array.from(main.querySelectorAll<HTMLElement>(
   '.db-intro, .page-intro, .db-counter, .finance-summary .metric, .panel, .ops-project-card, .quote-card'
  )).slice(0,26);
  const animations:Animation[]=[];
  let observer:IntersectionObserver|null=null;
  function enter(node:HTMLElement,index:number){
   if(!motionAllowed()||typeof node.animate!=='function')return;
   const animation=node.animate([
    {opacity:.5,transform:'translateY(10px)'},
    {opacity:1,transform:'translateY(0)'},
   ],{duration:420,delay:Math.min(index*32,240),easing:'cubic-bezier(.2,.8,.2,1)'});
   animations.push(animation);
  }
  function replay(){
   animations.forEach(a=>a.cancel());animations.length=0;
   entries.filter(el=>el.getBoundingClientRect().top<window.innerHeight)
    .forEach((el,index)=>enter(el,index));
  }
  if(typeof IntersectionObserver==='function'){
   observer=new IntersectionObserver(changes=>{
    changes.forEach(change=>{
     if(change.isIntersecting){
      const el=change.target as HTMLElement;
      const index=entries.indexOf(el);
      if(index>=0)enter(el,index);
      observer?.unobserve(el);
     }
    });
   },{threshold:.08});
   entries.forEach(el=>observer?.observe(el));
  }else{entries.forEach((el,index)=>enter(el,index));}
  window.addEventListener('lp:replay',replay);
  return ()=>{
   observer?.disconnect();
   window.removeEventListener('lp:replay',replay);
   animations.forEach(a=>a.cancel());
  };
 },[pathname]);
 return null;
}
export function MotionReplay(){
 return <button className="lp-motion-replay" type="button"
  aria-label="Repetir animaciones de esta página"
  onClick={()=>window.dispatchEvent(new Event('lp:replay'))}>
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
   <path d="M4 11a8 8 0 1 1 3 7M4 4v7h7"/>
  </svg>
  Repetir entrada
 </button>;
}
