import { isISODate, isUuid } from '@/lib/data/ops-validation';
import { parseMxAmountMinor, formatMxMoneyMinor } from '@/lib/data/money';

export const quoteStatuses=['draft','review','approved','sent','accepted','rejected'] as const;
export type QuoteStatus=typeof quoteStatuses[number];
export const quoteLabels:Readonly<Record<QuoteStatus,string>>={
 draft:'Borrador',review:'En revisión',approved:'Aprobada',
 sent:'Enviada (registro manual)',accepted:'Aceptada (registro manual)',
 rejected:'Rechazada (registro manual)'
};
export function isQuoteStatus(v:unknown):v is QuoteStatus {
 return typeof v==='string' && quoteStatuses.includes(v as QuoteStatus);
}
export const quoteActions=['submit','revise','approve','sent','accept','reject'] as const;
export type QuoteAction=typeof quoteActions[number];
export function isQuoteAction(value:unknown):value is QuoteAction {
 return typeof value==='string' && quoteActions.includes(value as QuoteAction);
}
export type QuoteLine={
 description:string; detail:string; quantity:number; unit_minor:number;
};
export interface QuoteSummary {
 id:string;clientId:string;clientName:string;title:string;status:QuoteStatus;
 version:number;revision:number;subtotalMinor:number;taxMinor:number;totalMinor:number;
 validUntil:string|null;updatedAt:string;
}
export interface QuoteDetail extends QuoteSummary {
 projectId:string|null;projectName:string|null;notes:string;taxRateBps:0|1600;
 lines:QuoteLine[];approvedAt:string|null;sentAt:string|null;
 respondedAt:string|null;createdAt:string;
 history:QuoteSnapshot[];
}
export interface QuoteSnapshot {
 id:string;version:number;title:string;submittedAt:string;
 totalMinor:number;amountMinor:number;taxMinor:number;taxRateBps:number;
 lines:QuoteLine[];notes:string;
}
export function parseQuoteLines(value:unknown):QuoteLine[]|null {
 let v:unknown=value;
 if(typeof value==='string'){
  if(value.length>30000)return null;
  try{v=JSON.parse(value) as unknown;}catch{return null;}
 }
 if(!Array.isArray(v)||v.length<1||v.length>24)return null;
 const result:QuoteLine[]=[];
 let subtotal=0;
 for(const item of v){
  if(!item||typeof item!=='object')return null;
  const entry=item as Record<string,unknown>;
  const description=typeof entry.description==='string'?entry.description.trim():'';
  const detail=typeof entry.detail==='string'?entry.detail.trim():'';
  const quantity=typeof entry.quantity==='number'?entry.quantity:Number(entry.quantity);
  const minor=typeof entry.unit_minor==='number'?entry.unit_minor:parseMxAmountMinor(entry.unit_price_mxn);
  if(description.length<2||description.length>180||detail.length>450||
   !Number.isSafeInteger(quantity)||quantity<1||quantity>100||
   minor===null||!Number.isSafeInteger(minor)||minor<0||minor>9999999999)return null;
  subtotal+=quantity*minor;
  if(!Number.isSafeInteger(subtotal)||subtotal>999999999999)return null;
  result.push({description,detail,quantity,unit_minor:minor});
 }
 return result;
}
export function calculateQuoteTotals(lines:QuoteLine[],taxRateBps:0|1600){
 const subtotal=lines.reduce((sum,line)=>sum+line.quantity*line.unit_minor,0);
 const tax=Math.floor((subtotal*taxRateBps+5000)/10000);
 return {subtotalMinor:subtotal,taxMinor:tax,totalMinor:subtotal+tax};
}
export function validQuoteExpiry(value:unknown):value is string|null {
 return value===null||value===''||isISODate(value);
}
export function isQuoteId(value:unknown):value is string {
 return isUuid(value);
}
export function displayQuoteMoney(minor:number):string {
 return formatMxMoneyMinor(minor);
}
export function quoteShortCode(id:string,version:number):string {
 return 'COT-'+id.replaceAll('-','').slice(0,8).toUpperCase()+' / V'+version;
}
