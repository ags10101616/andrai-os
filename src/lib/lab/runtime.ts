import {labModel} from './model';
export const labRuntime = '(()=>{\n"use strict";\n' + labModel + String.raw`
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const root=document.documentElement;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const transparencyQuery=matchMedia('(prefers-reduced-transparency: reduce)');
const frames=new Map();
let period=30,manualReduced=false,manualSolid=false,lastTrigger=null,view='dashboard';
let currentQuote=quoteTotals(1,false);
let theme='liquid';
try{const p=JSON.parse(localStorage.getItem('andrai.os15.preferences.v1')||'{}');manualReduced=p.motion===true;manualSolid=p.solid===true;if(p.theme==='editorial')theme='editorial';}catch{ /* preferences are optional */ }
function reduced(){return manualReduced||motionQuery.matches;}
function announce(message){$('#announcement').textContent=message;}
function savePreferences(){try{localStorage.setItem('andrai.os15.preferences.v1',JSON.stringify({theme,motion:manualReduced,solid:manualSolid}));}catch{ /* storage denied: still fully functional */ }}
function animateElement(node,keyframes,options={}){
 if(reduced()||!node||typeof node.animate!=='function')return;
 return node.animate(keyframes,{duration:240,easing:'cubic-bezier(.2,.8,.2,1)',...options});
}
function reveal(scope){
 const nodes=Array.from(scope.querySelectorAll('[data-reveal]'));
 nodes.forEach((node,i)=>animateElement(node,[{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,delay:Math.min(i*35,280)}));
}
function formatValue(node,value){return node.dataset.format==='money'?money(value):new Intl.NumberFormat('es-MX').format(Math.round(value))+(node.dataset.format==='percent'?'%':'');}
function countTo(node,value,fromZero=false){
 if(!node)return;
 if(frames.has(node))cancelAnimationFrame(frames.get(node));
 const from=fromZero?0:Number(node.dataset.value||value);
 node.dataset.value=String(value);
 const accessible=node.parentElement.querySelector('[data-number-accessible]');
 if(accessible)accessible.textContent=formatValue(node,value);
 if(reduced()||from===value){node.textContent=formatValue(node,value);frames.delete(node);return;}
 let start;
 const step=now=>{if(start===undefined)start=now;const t=Math.min(1,(now-start)/640),ease=1-Math.pow(1-t,3);node.textContent=formatValue(node,from+(value-from)*ease);if(t<1&&!reduced())frames.set(node,requestAnimationFrame(step));else{node.textContent=formatValue(node,value);frames.delete(node);}};
 frames.set(node,requestAnimationFrame(step));
}
function finishMotion(){frames.forEach(id=>cancelAnimationFrame(id));frames.clear();$$('[data-number]').forEach(node=>node.textContent=formatValue(node,Number(node.dataset.value)));document.getAnimations().forEach(a=>a.cancel());}
function syncSegments(){
 $$('.segmented').forEach(group=>{let indicator=group.querySelector('.segmented-indicator');if(!indicator){indicator=document.createElement('span');indicator.className='segmented-indicator';indicator.setAttribute('aria-hidden','true');group.prepend(indicator);}const active=group.querySelector('button[aria-pressed=true]');if(!active||!group.offsetWidth)return;group.dataset.glide='true';indicator.style.width=active.offsetWidth+'px';indicator.style.transform='translateX('+active.offsetLeft+'px)';});
}
function applyPreferences(){
 root.dataset.reduced=String(reduced());root.dataset.solid=String(manualSolid||transparencyQuery.matches);root.dataset.theme=theme;
 $('#motion-toggle').setAttribute('aria-pressed',String(reduced()));$('#motion-toggle').disabled=motionQuery.matches;
 $('#solid-toggle').setAttribute('aria-pressed',String(manualSolid||transparencyQuery.matches));$('#solid-toggle').disabled=transparencyQuery.matches;
 $('#system-preference').textContent=motionQuery.matches?'Tu sistema solicita movimiento reducido. Lo respetamos automáticamente.':'Puedes reducir el movimiento sin perder contenido ni funciones.';
 $$('[data-theme-option]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeOption===theme)));
 if(reduced())finishMotion();syncSegments();
}
function drawChart(){
 const data=periodData(period),max=Math.ceil(Math.max(...data.values)/500000)*500000;
 const points=data.values.map((v,i)=>[42+i*75,162-135*v/max]);
 const path='M'+points[0].join(',')+points.slice(1).map((p,i)=>{const a=points[i],mid=(a[0]+p[0])/2;return ' C'+mid+','+a[1]+' '+mid+','+p[1]+' '+p.join(',');}).join('');
 $('#revenue-line').setAttribute('d',path);
 $('#revenue-area').setAttribute('d',path+' L492,163 L42,163 Z');
 $('#chart-top').textContent=money(max);$('#chart-mid').textContent=money(max/2);$('#chart-title').textContent='Ingresos ficticios en '+period+' días: '+money(data.total);
 const labels=$$('#chart-labels span');labels.forEach((el,i)=>el.textContent=data.labels[i]);
 const cells=$$('#chart-values>span');cells.forEach((el,i)=>{el.querySelector('small').textContent=data.labels[i];el.querySelector('strong').textContent=money(data.values[i]);});
 const last=points[points.length-1];$('#chart-end').setAttribute('cx',String(last[0]));$('#chart-end').setAttribute('cy',String(last[1]));
 const line=$('#revenue-line'),length=line.getTotalLength();
 animateElement(line,[{strokeDasharray:length,strokeDashoffset:length},{strokeDasharray:length,strokeDashoffset:0}],{duration:700});
 animateElement($('#revenue-area'),[{opacity:0},{opacity:1}],{duration:650});
 countTo($('#income-number'),data.total);countTo($('#chart-number'),data.total);
 $('#period-copy').textContent='Escenario de '+period+' días · MXN';$('#income-helper').textContent=period+' días · escenario';
 $$('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.period)===period)));syncSegments();
}
function animateProgress(scope){scope.querySelectorAll('.progress-fill').forEach(el=>animateElement(el,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:640}));}
function routeView(next,focus=false){
 if(!['dashboard','projects','quote','system'].includes(next))next='dashboard';
 view=next;
 $$('section[data-view]').forEach(section=>section.hidden=section.id!==next);
 $$('.nav-link').forEach(link=>{if(link.getAttribute('href')==='#'+next)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 $('#breadcrumb-view').textContent=({dashboard:'Visión general',projects:'Proyectos',quote:'Cotización',system:'Sistema visual'})[next];
 const section=$('#'+next);reveal(section);animateProgress(section);
 if(next==='dashboard')drawChart();syncSegments();
 if(focus){const title=section.querySelector('h1');title.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
$$('.nav-link').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const id=link.hash.slice(1);if(location.hash!==link.hash)history.pushState(null,'',link.hash);routeView(id,true);}));
window.addEventListener('popstate',()=>routeView(location.hash.slice(1),true));
window.addEventListener('hashchange',()=>routeView(location.hash.slice(1)));
$$('[data-period]').forEach(button=>button.addEventListener('click',()=>{period=Number(button.dataset.period);drawChart();announce('Periodo de muestra: '+period+' días. Total ficticio: '+money(periodData(period).total)+'.');}));
$('#replay').addEventListener('click',()=>{reveal($('#dashboard'));drawChart();$$('#dashboard [data-number]').forEach(n=>countTo(n,Number(n.dataset.value),true));animateProgress($('#dashboard'));});
$$('[data-theme-option]').forEach(button=>button.addEventListener('click',()=>{theme=button.dataset.themeOption;applyPreferences();savePreferences();announce('Acabado '+(theme==='liquid'?'Liquid':'Editorial')+' seleccionado.');}));
$('#motion-toggle').addEventListener('click',()=>{manualReduced=!manualReduced;applyPreferences();savePreferences();});
$('#solid-toggle').addEventListener('click',()=>{manualSolid=!manualSolid;applyPreferences();savePreferences();});
motionQuery.addEventListener('change',applyPreferences);transparencyQuery.addEventListener('change',applyPreferences);
function openDialog(dialog,trigger){lastTrigger=trigger;dialog.showModal();syncSegments();document.body.style.overflow='hidden';animateElement(dialog,[{opacity:0,transform:'translateY(18px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:300});}
$$('dialog').forEach(dialog=>{dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=Array.from(dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')).filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);const first=items[0],last=items[items.length-1];if(!first){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});dialog.addEventListener('close',()=>{document.body.style.overflow='';if(lastTrigger&&lastTrigger.isConnected)lastTrigger.focus({preventScroll:true});});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#preferences-button').addEventListener('click',e=>openDialog($('#preferences'),e.currentTarget));
$$('[data-project]').forEach(button=>button.addEventListener('click',e=>{
 const p=DEMO_PROJECTS[Number(button.dataset.project)];if(!p)return;
 $('#project-title').textContent=p.name;$('#project-code').textContent='PROYECTO DE MUESTRA / '+p.code;
 $('#project-description').textContent=p.description;$('#project-stage').textContent=p.status;
 $('#project-progress').textContent=p.progress+'%';$('#project-deliverables').textContent=String(p.tasks);$('#project-budget').textContent=money(p.budget);
 openDialog($('#project-dialog'),e.currentTarget);
}));
$('#project-search').addEventListener('input',()=>{
 const value=$('#project-search').value.trim().toLocaleLowerCase('es-MX');let count=0;
 $$('#project-rows tr').forEach(row=>{const shown=row.textContent.toLocaleLowerCase('es-MX').includes(value);row.hidden=!shown;if(shown){count++;animateElement(row,[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,delay:count*25});}});
 $('#no-results').hidden=count>0;$('#projects-table').hidden=count===0;
 announce(count+' proyectos de muestra encontrados.');
});
function setScenario(state){
 $('#dashboard-ready').hidden=state!=='ready';$('#test-state').hidden=state==='ready';
 $$('#test-state [data-state]').forEach(el=>el.hidden=el.dataset.state!==state);
 $('#dashboard-region').setAttribute('aria-busy',String(state==='loading'));
 if(state==='ready'){reveal($('#dashboard-ready'));drawChart();animateProgress($('#dashboard-ready'));}
 announce('Estado de demostración: '+({ready:'con datos',loading:'carga simulada',empty:'vacío',error:'error simulado'})[state]+'. No hay solicitudes a servicios externos.');
}
$('#scenario').addEventListener('change',()=>setScenario($('#scenario').value));
$$('[data-reset-scenario]').forEach(b=>b.addEventListener('click',()=>{$('#scenario').value='ready';setScenario('ready');}));
function updateQuote(){
 const raw=$('#quote-quantity').value;
 const quantity=Number(raw),valid=/^\d+$/.test(raw)&&validQuantity(quantity);
 $('#quote-quantity').setAttribute('aria-invalid',String(!valid));$('#quote-error').hidden=valid;$('#print-button').disabled=!valid;
 if(!valid){announce('Revisa la cantidad: utiliza un entero de 1 a 20. El total anterior no se modifica.');return;}
 const support=$('#quote-support').checked;currentQuote=quoteTotals(quantity,support);
 $('#development-quantity').textContent=String(quantity);$('#development-total').textContent=money(currentQuote.development,2);
 $('#support-line').hidden=!support;
 $('#subtotal').textContent=money(currentQuote.subtotal,2);$('#tax').textContent=money(currentQuote.tax,2);
 $('#quote-grand-total').textContent=money(currentQuote.total,2);
 animateElement($('#quote-grand-total'),[{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
 announce('Total de muestra: '+money(currentQuote.total,2)+'. Cálculo local, sin guardar.');
}
$('#quote-quantity').addEventListener('input',updateQuote);$('#quote-support').addEventListener('change',updateQuote);
$$('[data-format]').filter(b=>b.tagName==='BUTTON').forEach(button=>button.addEventListener('click',()=>{
 $('#quote-paper').dataset.format=button.dataset.format;
 $$('button[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 animateElement($('#quote-paper'),[{opacity:.45},{opacity:1}],{duration:240});
 announce('Formato '+(button.dataset.format==='atelier'?'Atelier':'Statement')+' seleccionado.');
}));
$('#print-button').addEventListener('click',()=>window.print());
$('#replay-system').addEventListener('click',()=>{reveal($('#system'));$$('.motion-dot').forEach((dot,i)=>animateElement(dot,[{transform:'translateX(0)'},{transform:'translateX(32px)'},{transform:'translateX(0)'}],{duration:[160,240,640][i%3]}));});
window.addEventListener('resize',syncSegments);
window.addEventListener('pagehide',()=>frames.forEach(id=>cancelAnimationFrame(id)));
applyPreferences();root.dataset.enhanced='true';routeView(location.hash.slice(1));
countTo($('#income-number'),periodData(30).total,true);countTo($('#project-number'),DEMO_PROJECTS.length,true);
countTo($('#deliverables-number'),DEMO_PROJECTS.reduce((n,p)=>n+p.tasks,0),true);countTo($('#progress-number'),averageProgress(),true);
})();
`;
