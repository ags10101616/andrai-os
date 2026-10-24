import { isPilotReadOnly } from '@/lib/release/gates';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ManualEntryForm } from '@/components/finance/ManualEntryForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionSurface } from '@/components/ui/SectionSurface';
import { requireMembership } from '@/lib/auth/session';
import { loadFinanceReport } from '@/lib/finance/data';
import {
 financeEntryLabels,financeMethodLabels,signedMoneyMXN,
 type FinanceEntryType
} from '@/lib/finance/model';
import { formatLocalDate } from '@/lib/data/ops-validation';

export const metadata:Metadata={title:'Finanzas'};
export const dynamic='force-dynamic';
export const revalidate=0;
function metric(label:string,value:number,helper:string){
 return <article className="metric" key={label}>
  <span>{label}</span>
  <strong className="finance-metric-value">{signedMoneyMXN(value)}</strong>
  <small>{helper}</small>
  <div className="tiny-line" aria-hidden="true"/>
 </article>;
}
const filterOptions:{kind:FinanceEntryType|'all';label:string}[]=[
 {kind:'all',label:'Todos'}, {kind:'receipt',label:'Cobros'},
 {kind:'expense',label:'Gastos'},{kind:'refund',label:'Devoluciones'},
];
export default async function FinancePage({
 searchParams
}:{searchParams:Promise<{type?:string}>}){
 const member=await requireMembership('finanzas');
 const {type}=await searchParams;
 const filter=filterOptions.some(x=>x.kind===type)?type:'all';
 const report=await loadFinanceReport();
 const enabled=!isPilotReadOnly()&&process.env.OS08_FINANCE_WRITES_ENABLED==='true';
 const entries=filter==='all'?report.entries:report.entries.filter(x=>x.type===filter);
 const {summary}=report;
 return <AppShell active="finanzas" role={member.role} displayName={member.displayName}>
  <section className="page-intro">
   <div>
    <div className="eyebrow">DIRECCIÓN / FINANZAS / OS-08</div>
    <h1>Control sin<br/>puntos ciegos<span className="accent">.</span></h1>
    <p>Movimientos registrados, devoluciones y saldos asociados a cotizaciones aceptadas.
    Las cifras provienen de tu base de datos, no de estimaciones ficticias.</p>
   </div>
   <span className="action-disabled">{enabled?'Piloto privado':'Lectura real · escrituras pausadas'}</span>
  </section>

  <section className="finance-summary" aria-label="Indicadores del libro financiero interno">
   {metric('Cobros registrados',summary.receiptsMinor,'Declarados manualmente; sin conciliación bancaria')}
   {metric('Gastos registrados',summary.expensesMinor,'Movimientos operativos registrados')}
   {metric('Devoluciones registradas',summary.refundsMinor,'Restan de los cobros reconocidos')}
   {metric('Movimiento neto registrado',summary.netMovementMinor,'Cobros menos gastos y devoluciones')}
  </section>
  <div className="finance-secondary">
   <div><small>Valor total de cotizaciones marcadas como aceptadas</small>
    <strong>{signedMoneyMXN(summary.acceptedTotalMinor)}</strong>
    <p>No es facturación CFDI ni ingresos efectivamente liquidados.</p>
   </div>
   <div><small>Saldo pendiente según cotizaciones aceptadas</small>
    <strong>{signedMoneyMXN(summary.acceptedOpenMinor)}</strong>
    <p>Importe aceptado menos cobros y devoluciones vinculadas.</p>
   </div>
  </div>

  <SectionSurface title="Saldos vinculados a cotizaciones aceptadas"
   subtitle="Solo se incluyen cotizaciones con aceptación registrada internamente; las enviadas no se contabilizan como deuda.">
   {report.quoteBalances.length===0?
    <EmptyState symbol="◫" title="Sin saldos de cotizaciones aceptadas"
     description="Los saldos aparecerán cuando existan propuestas aceptadas y movimientos registrados."/>:
    <div className="finance-table-scroll">
     <table className="finance-table">
      <caption>Cotizaciones aceptadas y sus cobros netos registrados</caption>
      <thead><tr><th scope="col">Cotización</th><th scope="col">Total</th>
       <th scope="col">Cobros</th><th scope="col">Devoluciones</th>
       <th scope="col">Saldo</th></tr></thead>
      <tbody>{report.quoteBalances.map(q=><tr key={q.quoteId}>
       <td><Link href={'/cotizaciones/'+q.quoteId}>{q.title}</Link>
        <span>{q.clientName}</span></td>
       <td>{signedMoneyMXN(q.totalMinor)}</td><td>{signedMoneyMXN(q.receivedMinor)}</td>
       <td>{signedMoneyMXN(q.refundedMinor)}</td>
       <td className="finance-strong">{signedMoneyMXN(q.remainingMinor)}</td>
      </tr>)}</tbody>
     </table>
    </div>}
  </SectionSurface>

  <SectionSurface title="Movimientos registrados"
   subtitle="Últimos 100 eventos del libro interno por fecha. Los totales superiores abarcan todos los registros.">
   <nav className="finance-filters" aria-label="Filtrar movimientos financieros">
    {filterOptions.map(x=><Link key={x.kind} href={x.kind==='all'?'/finanzas':'/finanzas?type='+x.kind}
      aria-current={filter===x.kind?'page':undefined}>{x.label}</Link>)}
   </nav>
   {entries.length===0?
    <EmptyState symbol="↗" title="Sin movimientos en este filtro"
     description="El libro no contiene movimientos registrados bajo los filtros seleccionados."/>:
    <div className="finance-table-scroll">
     <table className="finance-table">
      <caption>Movimientos financieros introducidos manualmente</caption>
      <thead><tr><th scope="col">Fecha / tipo</th><th scope="col">Referencia</th>
       <th scope="col">Vinculación</th><th scope="col">Medio</th>
       <th scope="col">Importe</th></tr></thead>
      <tbody>{entries.map(entry=><tr key={entry.id}>
       <td><strong>{formatLocalDate(entry.happenedOn)}</strong>
        <span>{financeEntryLabels[entry.type]}</span></td>
       <td>{entry.reference}{entry.note&&<span>{entry.note}</span>}</td>
       <td>{entry.quoteId?<Link href={'/cotizaciones/'+entry.quoteId}>
        {entry.quoteTitle} ↗</Link>:entry.projectName??'Operación general'}</td>
       <td>{financeMethodLabels[entry.method]}</td>
       <td className={'finance-strong finance-'+entry.type}>
        {entry.type==='receipt'?'+':'−'}{signedMoneyMXN(entry.amountMinor)}</td>
      </tr>)}</tbody>
     </table>
    </div>}
  </SectionSurface>

  <div className="finance-form-section">
   <ManualEntryForm enabled={enabled} quotes={report.eligibleQuotes}
    projects={report.projects}/>
  </div>
  <p className="finance-disclaimer">
   Este módulo registra movimientos internos declarados manualmente. No procesa tarjetas,
   no consulta bancos, no emite CFDI y no sustituye una conciliación o contabilidad formal.
   Todos los asientos son inmutables; los errores se corrigen con movimientos compensatorios auditables.
  </p>
 </AppShell>;
}
