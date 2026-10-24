import { isPilotReadOnly } from '@/lib/release/gates';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { QuoteCreateForm } from '@/components/quotes/QuoteCreateForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';
import { requireMembership } from '@/lib/auth/session';
import { quoteFormOptions, listQuotes } from '@/lib/quotes/data';
import { isQuoteStatus,quoteStatuses,quoteLabels,displayQuoteMoney,quoteShortCode } from '@/lib/quotes/model';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Cotizaciones'};

export default async function QuotesPage({searchParams}:{
 searchParams:Promise<{status?:string}>;
}){
 const member=await requireMembership('cotizaciones');
 const {status:filterValue}=await searchParams;
 const status=isQuoteStatus(filterValue)?filterValue:undefined;
 const [quotes,options]=await Promise.all([listQuotes(status),quoteFormOptions()]);
 const enabled=!isPilotReadOnly()&&process.env.OS07_QUOTES_WRITES_ENABLED==='true';
 return <AppShell active="cotizaciones" role={member.role} displayName={member.displayName}>
   <section className="page-intro"><div>
    <div className="eyebrow">VENTAS / COTIZACIONES / OS-07</div>
    <h1>Propuestas<br/>con claridad<span className="accent">.</span></h1>
    <p>Conceptos, versiones, aprobación y PDF. Cada importe proviene de los conceptos reales registrados, nunca de cifras de ejemplo.</p>
   </div>
    <span className="action-disabled">{enabled?'Piloto privado':'Lectura real · nuevas cotizaciones pausadas'}</span>
   </section>
   <SectionSurface title="Cotizaciones de Andrai" subtitle="Hasta 60 documentos reales recientes por filtro.">
    <nav aria-label="Filtrar cotizaciones por estado" className="quote-status-nav">
     <Link href="/cotizaciones" aria-current={!status?'page':undefined}>Todas</Link>
     {quoteStatuses.map(s=><Link key={s} href={'/cotizaciones?status='+s}
       aria-current={status===s?'page':undefined}>{quoteLabels[s]}</Link>)}
    </nav>
    {quotes.length===0?<EmptyState symbol="▤" title="Todavía no hay cotizaciones en este filtro"
      description="Aquí aparecerán los borradores y las propuestas aprobadas cuando se inicie la operación comercial."/>:
     <div className="quote-cards">
      {quotes.map(q=><article key={q.id} className="quote-card">
       <div className="quote-card-head">
        <div><span>{quoteShortCode(q.id,q.version)}</span><h3>{q.title}</h3><p>{q.clientName}</p></div>
        <span className={'quote-state quote-state-'+q.status}>{quoteLabels[q.status]}</span>
       </div>
       <div className="quote-card-bottom">
        <div><small>Total estimado en MXN</small><strong>{displayQuoteMoney(q.totalMinor)}</strong></div>
        <div><small>Revisión</small><strong>{q.revision}</strong></div>
        <Link href={'/cotizaciones/'+q.id}>Ver detalle ↗</Link>
       </div>
      </article>)}
     </div>}
   </SectionSurface>
   <QuoteCreateForm clients={options.clients} projects={options.projects} enabled={enabled}/>
 </AppShell>;
}
