import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { QuoteDetail, QuoteLine } from './model';

const PAGE_W=595.28;
const PAGE_H=841.89;
const LEFT=46;
const RIGHT=PAGE_W-46;
const INK=rgb(.07,.08,.08);
const GREY=rgb(.41,.44,.42);
const FAINT=rgb(.88,.87,.84);
const CORAL=rgb(1,.376,.212);
const IVORY=rgb(.953,.941,.910);
const BLACK=rgb(.047,.055,.051);

/** WinAnsi-compatible printable Latin characters, without untrusted PDF markup. */
function printable(input:unknown):string {
 return String(input??'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'")
  .replace(/[–—]/g,'-').replace(/…/g,'...')
  .replace(/[\t\r\n]+/g,' ').replace(/[\u0000-\u001f]/g,' ')
  .replace(/[^\u0020-\u00ff]/g,'?');
}
function currency(amount:number):string {
 return 'MXN '+new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount/100);
}
function localDate(date:string|null):string {
 if(!date)return 'No especificada';
 const d=new Date(date.slice(0,10)+'T12:00:00Z');
 return Number.isNaN(d.getTime())?'No especificada':new Intl.DateTimeFormat('es-MX',{
  year:'numeric',month:'short',day:'numeric',timeZone:'UTC',
 }).format(d);
}

export type QuotePdfAppearance='statement'|'atelier';
/** Uses the same versioned quote and exact monetary values in both templates. */
export async function renderQuotePdf(
 quote:QuoteDetail,appearance:QuotePdfAppearance='statement'
):Promise<Uint8Array> {
 const atelier=appearance==='atelier';
 const themeInk=atelier?rgb(.953,.943,.916):INK;
 const themeMuted=atelier?rgb(.77,.8,.74):GREY;
 const themeFaint=atelier?rgb(.32,.36,.32):FAINT;
 const themeCoral=atelier?rgb(1,.62,.45):CORAL;
 const themeIvory=IVORY;
 const themeBlack=atelier?rgb(.125,.145,.125):BLACK;
 const pageSurface=rgb(.090,.108,.095);
 const rowSurface=atelier?rgb(.16,.19,.16):rgb(.976,.968,.952);
 const totalInk=INK;

 const pdf=await PDFDocument.create();
 pdf.setTitle(printable('ANDRAI - Cotización '+quote.title));
 pdf.setAuthor('ANDRAI · Estudio de sistemas digitales');
 pdf.setSubject('Propuesta comercial interna. No es CFDI ni firma electrónica.');
 pdf.setCreator('ANDRAI OS / OS-07');
 const regular=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const displayFont=atelier?await pdf.embedFont(StandardFonts.TimesRoman):regular;
 const pages:ReturnType<typeof pdf.addPage>[]=[];
 const label=printable('COT-'+quote.id.replaceAll('-','').slice(0,8).toUpperCase()+'  /  V'+quote.version);
 const state=quote.status==='draft'||quote.status==='review'?'BORRADOR · NO ENVIAR':
  quote.status==='approved'?'APROBADA INTERNAMENTE':
  quote.status==='sent'?'ENVÍO REGISTRADO':
  quote.status==='accepted'?'ACEPTACIÓN REGISTRADA':'RECHAZO REGISTRADO';
 let page=pdf.addPage([PAGE_W,PAGE_H]);
 if(atelier)page.drawRectangle({x:0,y:0,width:PAGE_W,height:PAGE_H,color:pageSurface});
 let y=PAGE_H-143;
 function newPage(continuation=false):void {
  page=pdf.addPage([PAGE_W,PAGE_H]);
  pages.push(page);
  if(atelier)page.drawRectangle({x:0,y:0,width:PAGE_W,height:PAGE_H,color:pageSurface});
  page.drawRectangle({x:0,y:PAGE_H-95,width:PAGE_W,height:95,color:themeBlack});
  page.drawText('ANDRAI',{x:LEFT,y:PAGE_H-55,size:23,font:bold,color:themeIvory});
  page.drawCircle({x:148,y:PAGE_H-49,size:3,color:themeCoral});
  page.drawText('ESTUDIO DE SISTEMAS DIGITALES',{
   x:LEFT,y:PAGE_H-76,size:8.5,font:regular,color:rgb(.72,.74,.72)
  });
  right(continuation?'COTIZACIÓN · CONTINUACIÓN':'COTIZACIÓN',RIGHT,PAGE_H-51,regular,10,themeIvory);
  right(label,RIGHT,PAGE_H-72,regular,8.5,rgb(.79,.78,.75));
  y=PAGE_H-126;
 }
 function right(text:string,atX:number,atY:number,font:typeof regular,size:number,color=themeInk){
  const safe=printable(text);
  page.drawText(safe,{x:atX-font.widthOfTextAtSize(safe,size),y:atY,font,size,color});
 }
 function textAt(text:string,atX:number,atY:number,size:number,font=regular,color=themeInk){
  page.drawText(printable(text),{x:atX,y:atY,size,font,color});
 }
 function rule(atY:number,color=themeFaint){
  page.drawLine({start:{x:LEFT,y:atY},end:{x:RIGHT,y:atY},color,thickness:.75});
 }
 function wrap(text:string,maxWidth:number,font=regular,size=10):string[]{
  const clean=printable(text);
  const chunks=clean.split(/\s+/).filter(Boolean);
  if(!chunks.length)return [''];
  const lines:string[]=[];let line='';
  for(const word of chunks){
   const attempt=line?line+' '+word:word;
   if(font.widthOfTextAtSize(attempt,size)<=maxWidth){line=attempt;continue;}
   if(line){lines.push(line);line='';}
   if(font.widthOfTextAtSize(word,size)<=maxWidth){line=word;continue;}
   let fragment='';
   for(const letter of word){
    if(font.widthOfTextAtSize(fragment+letter,size)>maxWidth&&fragment){
     lines.push(fragment);fragment='';
    }
    fragment+=letter;
   }
   line=fragment;
  }
  if(line)lines.push(line);
  return lines;
 }
 function ensure(height:number):void{
  if(y-height<74)newPage(true);
 }
 function paragraph(text:string,width:number,atX:number,size=10,lineHeight=15,color=themeInk,font=regular){
  const lines=wrap(text,width,font,size);
  for(const line of lines){
   ensure(lineHeight);
   textAt(line,atX,y,size,font,color);
   y-=lineHeight;
  }
 }
 // The page helper draws a new page when needed; start with the same header.
 pages.push(page);
 page.drawRectangle({x:0,y:PAGE_H-95,width:PAGE_W,height:95,color:themeBlack});
 page.drawText('ANDRAI',{x:LEFT,y:PAGE_H-55,size:23,font:bold,color:themeIvory});
 page.drawCircle({x:148,y:PAGE_H-49,size:3,color:themeCoral});
 page.drawText('ESTUDIO DE SISTEMAS DIGITALES',{
  x:LEFT,y:PAGE_H-76,size:8.5,font:regular,color:rgb(.72,.74,.72)
 });
 right('COTIZACIÓN',RIGHT,PAGE_H-51,regular,10,themeIvory);
 right(label,RIGHT,PAGE_H-72,regular,8.5,rgb(.79,.78,.75));

 textAt('PROPUESTA COMERCIAL',LEFT,y,9,bold,themeCoral);y-=26;
 paragraph(quote.title,RIGHT-LEFT,LEFT,atelier?23:21,atelier?29:27,themeInk,displayFont);
 y-=3;
 const clientText='PARA  '+quote.clientName;
 paragraph(clientText,RIGHT-LEFT,LEFT,12,17,themeMuted);
 y-=14;
 rule(y);y-=23;
 textAt('VERSIÓN  '+quote.version,LEFT,y,9,bold,themeMuted);
 right('VIGENCIA  '+localDate(quote.validUntil),RIGHT,y,regular,9,themeMuted);y-=19;
 textAt(printable(state),LEFT,y,9,bold,quote.status==='draft'||quote.status==='review'?themeCoral:themeMuted);
 y-=24;

 function itemHead(){
  ensure(34);
  page.drawRectangle({x:LEFT,y:y-17,width:RIGHT-LEFT,height:27,color:themeBlack});
  textAt('ALCANCE / CONCEPTO',LEFT+12,y-9,8,bold,themeIvory);
  right('CANT.',355,y-9,regular,8,themeIvory);
  right('PRECIO',445,y-9,regular,8,themeIvory);
  right('IMPORTE',RIGHT-11,y-9,regular,8,themeIvory);
  y-=31;
 }
 itemHead();
 quote.lines.forEach((line:QuoteLine,index:number)=>{
  const titleLines=wrap(line.description,235,bold,10);
  const detailLines=line.detail?wrap(line.detail,235,regular,9):[];
  const lineHeight=14,detailHeight=12;
  const height=Math.max(48,titleLines.length*lineHeight+detailLines.length*detailHeight+14);
  if(y-height<120){
   newPage(true);
   itemHead();
  }
  if(index%2===1)page.drawRectangle({x:LEFT,y:y-height+7,width:RIGHT-LEFT,height:height-5,color:rowSurface});
  let offset=0;
  for(const t of titleLines){textAt(t,LEFT+11,y-13-offset,10,bold);offset+=lineHeight;}
  for(const t of detailLines){textAt(t,LEFT+11,y-13-offset,9,regular,themeMuted);offset+=detailHeight;}
  right(String(line.quantity),355,y-15,regular,9);
  right(currency(line.unit_minor),445,y-15,regular,9);
  right(currency(line.unit_minor*line.quantity),RIGHT-11,y-15,bold,9);
  y-=height;
  rule(y+7,themeFaint);
 });
 y-=18;
 ensure(118);
 const amountX=RIGHT-5;
 right('Subtotal',RIGHT-155,y,regular,10,themeMuted);
 right(currency(quote.subtotalMinor),amountX,y,bold,11);y-=22;
 right(quote.taxRateBps===1600?'IVA (16 %)':'IVA (0 %)',RIGHT-155,y,regular,10,themeMuted);
 right(currency(quote.taxMinor),amountX,y,bold,11);y-=22;
 page.drawRectangle({x:RIGHT-295,y:y-19,width:295,height:40,color:themeIvory});
 right('TOTAL MXN',RIGHT-155,y,bold,10,totalInk);
 right(currency(quote.totalMinor),amountX,y-2,bold,16,totalInk);
 y-=58;
 ensure(70);
 textAt('CONDICIONES / ALCANCE',LEFT,y,9,bold,themeCoral);y-=20;
 paragraph(quote.notes?.trim()||'Sin notas adicionales. Alcance limitado a los conceptos descritos en esta cotización.',RIGHT-LEFT,LEFT,10,15,themeMuted);
 y-=22;
 ensure(50);
 rule(y);y-=19;
 paragraph('Esta cotización no es un CFDI ni sustituye un contrato. La aprobación es interna y la aceptación del cliente debe documentarse por separado.',RIGHT-LEFT,LEFT,8.5,13,themeMuted);
 for(let i=0;i<pages.length;i++){
  const pg=pages[i];
  pg.drawLine({start:{x:LEFT,y:52},end:{x:RIGHT,y:52},color:themeFaint,thickness:1});
  pg.drawText('ANDRAI · DISEÑO QUE CONECTA. SISTEMAS QUE FUNCIONAN.',{
   x:LEFT,y:34,font:regular,size:7.5,color:themeMuted,
  });
  const pagination=String(i+1)+' / '+String(pages.length);
  pg.drawText(pagination,{x:RIGHT-bold.widthOfTextAtSize(pagination,8),y:34,font:bold,size:8,color:themeMuted});
 }
 return await pdf.save();
}
