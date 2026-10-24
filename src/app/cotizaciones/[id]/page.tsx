import { isPilotReadOnly } from '@/lib/release/gates';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { QuoteDraftForm } from '@/components/quotes/QuoteDraftForm';
import { QuoteTransitionForm } from '@/components/quotes/QuoteTransitionForm';
import { requireMembership } from '@/lib/auth/session';
import { getQuoteDetail } from '@/lib/quotes/data';
import { isQuoteId,quoteLabels,quoteShortCode,displayQuoteMoney } from '@/lib/quotes/model';
import { formatLocalDate } from '@/lib/data/ops-validation';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Detalle de cotización'};

export default async function QuoteDetailPage({params}:{
 params:Promise<{id:string}>;
}){
 const member=await requireMembership('cotizaciones');
 const {id}=await params;
 if(!isQuoteId(id))notFound();
 const quote=await getQuoteDetail(id);
 if(!quote)notFound();
 const enabled=!isPilotReadOnly()&&process.env.OS07_QUOTES_WRITES_ENABLED==='true';
 const owner=member.role==='owner';
 const actions:{action:'submit'|'revise'|'approve'|'sent'|'accept'|'reject';label:string;notice?:string}[]=[];
 if(quote.status==='draft')actions.push({action:'submit',label:'Solicitar revisión ↗'});
 if(quote.status==='review'){
  actions.push({action:'revise',label:'Solicitar cambios ↺'});
  if(owner)actions.push({action:'approve',label:'Aprobar cotización ✓'});
 }
 if(quote.status==='approved'&&owner)actions.push({action:'sent',label:'Registrar envío manual ↗',
  notice:'No se enviará ningún correo automáticamente.'});
 if(quote.status==='sent'&&owner)actions.push(
  {action:'accept',label:'Registrar aceptación',notice:'Confirmación administrativa, no firma electrónica.'},
  {action:'reject',label:'Registrar rechazo'}
 );
 return <AppShell active="cotizaciones" role={member.role} displayName={member.displayName}>
  <div className="quote-back"><Link href="/cotizaciones">← Volver a cotizaciones</Link></div>
  <section className="page-intro"><div>
   <div className="eyebrow">COTIZACIONES / {quoteShortCode(quote.id,quote.version)}</div>
   <h1>{quote.title}<span className="accent">.</span></h1>
   <p>{quote.clientName} · {quoteLabels[quote.status]}</p>
  </div><a className="quote-download" href={'/cotizaciones/'+quote.id+'/pdf'}>
    Descargar PDF ↗</a></section>

  <section className="panel quote-detail">
   <div className="quote-detail-summary">
    <div><small>Estado</small><span className={'quote-state quote-state-'+quote.status}>{quoteLabels[quote.status]}</span></div>
    <div><small>Versión</small><strong>V{quote.version}</strong></div>
    <div><small>Revisión interna</small><strong>{quote.revision}</strong></div>
    <div><small>Vigencia</small><strong>{formatLocalDate(quote.validUntil)}</strong></div>
   </div>
   {quote.projectName&&<p className="quote-linked">Proyecto vinculado: <strong>{quote.projectName}</strong></p>}
   <div className="quote-detail-table-wrap"><table className="quote-detail-table">
    <caption>Desglose actual de conceptos, cantidades y precios en MXN</caption>
    <thead><tr><th scope="col">Concepto y alcance</th><th scope="col">Cantidad</th><th scope="col">P. unitario</th><th scope="col">Importe</th></tr></thead>
    <tbody>{quote.lines.map((line,i)=><tr key={i}>
     <td><strong>{line.description}</strong>{line.detail&&<span>{line.detail}</span>}</td>
     <td>{line.quantity}</td><td>{displayQuoteMoney(line.unit_minor)}</td>
     <td>{displayQuoteMoney(line.unit_minor*line.quantity)}</td>
    </tr>)}</tbody>
   </table></div>
   <div className="quote-total-box">
    <div><span>Subtotal</span><strong>{displayQuoteMoney(quote.subtotalMinor)}</strong></div>
    <div><span>IVA ({quote.taxRateBps===1600?'16':'0'} %)</span><strong>{displayQuoteMoney(quote.taxMinor)}</strong></div>
    <div className="quote-grand-total"><span>Total MXN</span><strong>{displayQuoteMoney(quote.totalMinor)}</strong></div>
   </div>
   <div className="quote-terms"><h2>Condiciones y alcance</h2>
    <p>{quote.notes||'Sin notas adicionales. El alcance se limita a los conceptos desglosados.'}</p>
    <small>Esta cotización no es un CFDI. La aceptación del cliente debe documentarse por separado.</small>
   </div>
  </section>

  {actions.length>0&&<section className="panel quote-decisions">
   <div className="panel-head"><div><h2>Revisión y aprobación</h2>
    <p>Las decisiones se registran en PostgreSQL con responsable y auditoría.</p></div>
    <span className={enabled?'ops-active-pill':'ops-locked-pill'}>{enabled?'Piloto habilitado':'Acciones desactivadas'}</span></div>
   <div className="quote-decision-list">{actions.map(item=>
    <QuoteTransitionForm key={quote.revision+item.action} quoteId={quote.id} revision={quote.revision}
     actionType={item.action} label={item.label} enabled={enabled} notice={item.notice}/>)}</div>
  </section>}
  {quote.status==='draft'&&<QuoteDraftForm key={quote.id+':'+quote.revision}
    quote={quote} enabled={enabled}/>}
  <section className="panel quote-history">
   <div className="panel-head"><div><h2>Historial inmutable</h2>
    <p>Versiones conservadas al solicitar revisión. No pueden editarse ni eliminarse desde la aplicación.</p></div>
   </div>
   {quote.history.length===0?<p className="ops-note">Aún no hay versiones enviadas a revisión.</p>:
    <ol className="quote-history-list">{quote.history.map(s=><li key={s.id}>
      <div><strong>Versión {s.version}</strong><small>{formatLocalDate(s.submittedAt.slice(0,10))}</small></div>
      <span>{s.title}</span><strong>{displayQuoteMoney(s.totalMinor)}</strong>
    </li>)}</ol>}
  </section>
 </AppShell>;
}
