import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireMembership } from '@/lib/auth/session';
import {
 minorAmount,isFinanceEntryType,isFinanceMethod,
 type FinanceEntry,type FinanceReport,type QuoteBalance,
 type FinanceSummary,type FinanceOption
} from './model';

type UnknownRecord=Record<string,unknown>;
function asRows(value:unknown):UnknownRecord[]{
 if(!Array.isArray(value))throw new Error('Unexpected finance rows');
 return value as UnknownRecord[];
}
function asRecord(value:unknown):UnknownRecord{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Unexpected finance summary');
 return value as UnknownRecord;
}
export async function loadFinanceReport():Promise<FinanceReport>{
 const member=await requireMembership('finanzas');
 if(member.role!=='owner')throw new Error('Direction privileges required');
 const db=await createServerSupabase();

 const [summaryResult,balancesResult,entriesResult,quotesResult,projectsResult]=await Promise.all([
  db.rpc('os08_finance_summary_v1').single(),
  db.rpc('os08_quote_balances_v1'),
  db.from('os_ledger').select('id,entry_type,amount_minor,reference,note,method,happened_on,quote_id,project_id')
   .eq('organization_id',member.organizationId)
   .order('happened_on',{ascending:false}).order('created_at',{ascending:false})
   .limit(100),
  db.from('os_quotes').select('id,title,status,client_id')
   .eq('organization_id',member.organizationId)
   .in('status',['sent','accepted','rejected'])
   .order('updated_at',{ascending:false}).limit(100),
  db.from('os_projects').select('id,name')
   .eq('organization_id',member.organizationId)
   .order('updated_at',{ascending:false}).limit(100),
 ]);
 if(summaryResult.error||balancesResult.error||entriesResult.error||quotesResult.error||projectsResult.error)
  throw new Error('Unable to load authorized financial records');

 const rawSummary=asRecord(summaryResult.data);
 const summary:FinanceSummary={
  receiptsMinor:minorAmount(rawSummary.receipts_minor),
  expensesMinor:minorAmount(rawSummary.expenses_minor),
  refundsMinor:minorAmount(rawSummary.refunds_minor),
  netMovementMinor:Number(rawSummary.net_movement_minor),
  acceptedTotalMinor:minorAmount(rawSummary.accepted_quote_total_minor),
  acceptedOpenMinor:minorAmount(rawSummary.accepted_quote_open_minor),
 };
 if(!Number.isSafeInteger(summary.netMovementMinor))
  throw new Error('Invalid net cash movement');

 const rawBalances=asRows(balancesResult.data);
 const rawEntries=asRows(entriesResult.data);
 const rawQuotes=(quotesResult.data??[]) as UnknownRecord[];
 const rawProjects=(projectsResult.data??[]) as UnknownRecord[];
 const allQuoteIds=[
  ...new Set([
   ...rawBalances.map(b=>String(b.quote_id)),
   ...rawEntries.filter(x=>x.quote_id).map(x=>String(x.quote_id)),
   ...rawQuotes.map(x=>String(x.id)),
  ]),
 ];
 const quoteLookupResult=allQuoteIds.length
  ?await db.from('os_quotes').select('id,title,client_id')
     .eq('organization_id',member.organizationId).in('id',allQuoteIds)
  :{data:[] as UnknownRecord[],error:null};
 if(quoteLookupResult.error)throw new Error('Unable to load linked quotes');
 const quoteRows=(quoteLookupResult.data??[]) as UnknownRecord[];
 const clientIds=[...new Set(quoteRows.map(q=>String(q.client_id)))];
 const clientsResult=clientIds.length
  ?await db.from('os_clients').select('id,name')
     .eq('organization_id',member.organizationId).in('id',clientIds)
  :{data:[] as UnknownRecord[],error:null};
 if(clientsResult.error)throw new Error('Unable to load quote customers');

 const titles=new Map(quoteRows.map(x=>[String(x.id),String(x.title)]));
 const customerNames=new Map((clientsResult.data??[]).map(x=>[String(x.id),String(x.name)]));
 const quoteClients=new Map(quoteRows.map(x=>[String(x.id),String(x.client_id)]));
 const projectNames=new Map(rawProjects.map(x=>[String(x.id),String(x.name)]));

 const entries:FinanceEntry[]=rawEntries.filter(
  r=>isFinanceEntryType(r.entry_type)&&isFinanceMethod(r.method)
 ).map(row=>{
  const quoteId=row.quote_id?String(row.quote_id):null;
  const projectId=row.project_id?String(row.project_id):null;
  return {
   id:String(row.id),type:row.entry_type as FinanceEntry['type'],
   amountMinor:minorAmount(row.amount_minor),reference:String(row.reference),
   note:String(row.note??''),method:row.method as FinanceEntry['method'],
   happenedOn:String(row.happened_on),quoteId,projectId,
   quoteTitle:quoteId?titles.get(quoteId)??'Cotización vinculada':null,
   projectName:projectId?projectNames.get(projectId)??'Proyecto vinculado':null
  };
 });

 const quoteBalances:QuoteBalance[]=rawBalances.map(x=>{
  const quoteId=String(x.quote_id);
  const clientId=quoteClients.get(quoteId);
  return {
   quoteId,title:titles.get(quoteId)??'Cotización aceptada',
   clientName:clientId?customerNames.get(clientId)??'Cliente vinculado':'Cliente vinculado',
   totalMinor:minorAmount(x.quote_total_minor),
   receivedMinor:minorAmount(x.received_minor),
   refundedMinor:minorAmount(x.refunded_minor),
   remainingMinor:minorAmount(x.remaining_minor),
  };
 });
 const eligibleQuotes:FinanceOption[]=rawQuotes.map(x=>({
  id:String(x.id),name:String(x.title),status:String(x.status),
 }));
 const projects:FinanceOption[]=rawProjects.map(x=>({
  id:String(x.id),name:String(x.name),
 }));
 return {summary,entries,quoteBalances,eligibleQuotes,projects};
}
