'use client';
import { useState } from 'react';
import type { QuoteLine } from '@/lib/quotes/model';
import { parseMxAmountMinor,formatMxMoneyMinor } from '@/lib/data/money';

type LineDraft={
 key:string;description:string;detail:string;quantity:string;unit_price_mxn:string;
};
function buildInitial(initialLines?:QuoteLine[]):LineDraft[]{
 if(!initialLines?.length){
  return [{key:'first',description:'',detail:'',quantity:'1',unit_price_mxn:'0.00'}];
 }
 return initialLines.map((line,i)=>({
  key:'line-'+i,description:line.description,detail:line.detail,
  quantity:String(line.quantity),unit_price_mxn:(line.unit_minor/100).toFixed(2),
 }));
}
export function QuoteLinesEditor({initialLines,disabled}:{
 initialLines?:QuoteLine[];disabled:boolean;
}){
 const [lines,setLines]=useState<LineDraft[]>(()=>buildInitial(initialLines));
 function edit(key:string,field:'description'|'detail'|'quantity'|'unit_price_mxn',value:string){
  setLines(prev=>prev.map(line=>line.key===key?{...line,[field]:value}:line));
 }
 const total=lines.reduce<number|null>((sum,line)=>{
  if(sum===null)return null;
  const price=parseMxAmountMinor(line.unit_price_mxn);
  const quantity=Number(line.quantity);
  if(price===null||!Number.isInteger(quantity)||quantity<1||quantity>100)return null;
  return sum+price*quantity;
 },0);
 const serialized=lines.map(({description,detail,quantity,unit_price_mxn})=>({
  description,detail,quantity:Number(quantity),unit_price_mxn,
 }));
 return <div className="quotes-lines">
  <div className="quotes-lines-top"><strong>Conceptos</strong><span>Hasta 24 conceptos · cantidades y precios en MXN</span></div>
  <input type="hidden" name="lines" value={JSON.stringify(serialized)} readOnly />
  <div className="quotes-line-list">
   {lines.map((line,index)=><div className="quotes-line" key={line.key}>
    <div className="quotes-line-title"><span>Concepto {index+1}</span>
     <button type="button" className="quotes-remove" disabled={disabled||lines.length===1}
      onClick={()=>setLines(prev=>prev.filter(x=>x.key!==line.key))}>Quitar</button>
    </div>
    <label>Descripción *<input value={line.description} onChange={e=>edit(line.key,'description',e.target.value)}
      required minLength={2} maxLength={180} disabled={disabled} placeholder="Diseño y desarrollo de sitio web"/></label>
    <label>Detalle / alcance<textarea value={line.detail} onChange={e=>edit(line.key,'detail',e.target.value)}
      maxLength={450} disabled={disabled} rows={2} placeholder="Diseño responsive, animaciones y entrega..."/></label>
    <div className="quotes-line-grid">
      <label>Cantidad<input type="number" min="1" max="100" step="1" value={line.quantity}
       onChange={e=>edit(line.key,'quantity',e.target.value)} disabled={disabled} required/></label>
      <label>Precio unitario (MXN)<input inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?"
       value={line.unit_price_mxn} onChange={e=>edit(line.key,'unit_price_mxn',e.target.value)}
       disabled={disabled} required/></label>
      <div className="quotes-line-amount"><span>Importe</span>
       <strong>{(()=>{const cost=parseMxAmountMinor(line.unit_price_mxn),qty=Number(line.quantity);
        return cost===null||!Number.isSafeInteger(qty)||qty<1? '—':formatMxMoneyMinor(cost*qty);
       })()}</strong></div>
    </div>
   </div>)}
  </div>
  <div className="quotes-lines-footer"><button type="button" className="quotes-add" disabled={disabled||lines.length>=24}
    onClick={()=>setLines(prev=>[...prev,{key:crypto.randomUUID(),description:'',detail:'',quantity:'1',unit_price_mxn:'0.00'}])}>
     + Agregar concepto</button>
    <div>Subtotal estimado: <strong>{total===null?'—':formatMxMoneyMinor(total)}</strong></div>
  </div>
 </div>;
}
