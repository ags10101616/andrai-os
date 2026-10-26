import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {renderQuotePdf} from '../src/lib/quotes/pdf.ts';

function syntheticQuote(count){
 const lines=Array.from({length:count},(_,index)=>({
  description:'Concepto de prueba '+(index+1),
  detail:'Diseño y desarrollo responsivo, entregables y documentación. '.repeat(5),
  quantity:2,unit_minor:650000,
 }));
 const subtotalMinor=lines.reduce((sum,line)=>sum+line.quantity*line.unit_minor,0);
 const taxMinor=Math.floor((subtotalMinor*1600+5000)/10000);
 return {
  id:'123e4567-e89b-42d3-a456-426614174000',clientId:'123e4567-e89b-42d3-a456-426614174001',
  clientName:'Cliente Sintético (QA)',title:'Cotización de prueba con acentos y términos',
  status:'draft',projectId:null,projectName:null,
  version:2,revision:4,subtotalMinor,taxMinor,totalMinor:subtotalMinor+taxMinor,
  notes:'Se entrega diseño responsive, documentación y seguimiento. '.repeat(16),
  taxRateBps:1600,lines,
  validUntil:'2026-11-10',createdAt:'2026-10-24T00:00:00Z',
  updatedAt:'2026-10-24T00:00:00Z',
  approvedAt:null,sentAt:null,respondedAt:null,history:[],
 };
}
test('Render real A4 PDFs, including multiple pages and synthetic character accents',async()=>{
 const small=await renderQuotePdf(syntheticQuote(2));
 assert.equal(String.fromCharCode(...small.slice(0,5)),'%PDF-');
 const doc=await PDFDocument.load(small);
 assert.ok(doc.getPageCount()>=1);
 for(const page of doc.getPages()){
  assert.ok(Math.abs(page.getWidth()-595.28)<0.5);
  assert.ok(Math.abs(page.getHeight()-841.89)<0.5);
 }
 mkdirSync('tests/artifacts',{recursive:true});
 writeFileSync('tests/artifacts/os07-quote-sample.pdf',small);
 const large=await renderQuotePdf(syntheticQuote(24));
 const longDoc=await PDFDocument.load(large);
 assert.ok(longDoc.getPageCount()>1,'24 long quote lines must paginate');
 const atelier=await renderQuotePdf(syntheticQuote(2),'atelier');
 assert.equal(String.fromCharCode(...atelier.slice(0,5)),'%PDF-');
 const atelierDoc=await PDFDocument.load(atelier);
 assert.equal(atelierDoc.getPageCount(),doc.getPageCount());
 writeFileSync('tests/artifacts/os15-quote-atelier.pdf',atelier);
 const atelierLarge=await renderQuotePdf(syntheticQuote(24),'atelier');
 const atelierLongDoc=await PDFDocument.load(atelierLarge);
 assert.ok(atelierLongDoc.getPageCount()>1,'Atelier must preserve pagination');
 assert.equal(atelierDoc.getTitle()?.includes('Cotización'),true);
});
