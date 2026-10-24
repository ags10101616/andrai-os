import 'server-only';
import { createServerSupabase } from '@/lib/auth/server';
import { requireMembership } from '@/lib/auth/session';
import { isQuoteStatus, parseQuoteLines, type QuoteSummary, type QuoteDetail, type QuoteSnapshot, type QuoteStatus } from './model';
import type { NameOption } from '@/lib/data/operations';

type Raw = Record<string,unknown>;
function int(value:unknown):number {
 const num=Number(value);
 if(!Number.isSafeInteger(num)||num<0)throw new Error('Invalid amount received from database');
 return num;
}
export async function listQuotes(filter?:QuoteStatus):Promise<QuoteSummary[]> {
 const member=await requireMembership('cotizaciones');
 const db=await createServerSupabase();
 let query=db.from('os_quotes')
  .select('id,client_id,title,status,version,revision,amount_minor,tax_minor,total_minor,valid_until,updated_at')
  .eq('organization_id',member.organizationId).order('updated_at',{ascending:false}).limit(60);
 if(filter)query=query.eq('status',filter);
 const {data,error}=await query;
 if(error)throw new Error('Unable to load quotes');
 const rows=(data??[]) as Raw[];
 if(!rows.length)return [];
 const ids=[...new Set(rows.map(q=>String(q.client_id)))];
 const clientResponse=await db.from('os_clients').select('id,name').eq('organization_id',member.organizationId).in('id',ids);
 if(clientResponse.error)throw new Error('Unable to load quote clients');
 const clientNames=new Map((clientResponse.data??[]).map(c=>[String(c.id),String(c.name)]));
 return rows.filter(q=>isQuoteStatus(q.status)).map(q=>({
  id:String(q.id),clientId:String(q.client_id),
  clientName:clientNames.get(String(q.client_id))??'Cliente vinculado',
  title:String(q.title),status:q.status as QuoteStatus,
  version:int(q.version),revision:int(q.revision),
  subtotalMinor:int(q.amount_minor),taxMinor:int(q.tax_minor),totalMinor:int(q.total_minor),
  validUntil:q.valid_until?String(q.valid_until):null,
  updatedAt:String(q.updated_at),
 }));
}
export async function getQuoteDetail(id:string):Promise<QuoteDetail|null> {
 const member=await requireMembership('cotizaciones');
 const db=await createServerSupabase();
 const {data:q,error}=await db.from('os_quotes')
 .select('id,client_id,project_id,title,status,version,revision,amount_minor,tax_minor,total_minor,valid_until,notes,tax_rate_bps,line_items,approved_at,sent_at,responded_at,created_at,updated_at')
 .eq('organization_id',member.organizationId).eq('id',id).maybeSingle();
 if(error)throw new Error('Unable to load quote');
 if(!q || !isQuoteStatus(q.status))return null;
 const [clients,projects,snapshots]=await Promise.all([
  db.from('os_clients').select('id,name').eq('organization_id',member.organizationId).eq('id',String(q.client_id)).maybeSingle(),
  q.project_id?db.from('os_projects').select('id,name').eq('organization_id',member.organizationId).eq('id',String(q.project_id)).maybeSingle()
  :Promise.resolve({data:null,error:null}),
  db.from('os_quote_snapshots').select('id,version,title,submitted_at,total_minor,amount_minor,tax_minor,tax_rate_bps,line_items,notes')
   .eq('organization_id',member.organizationId).eq('quote_id',id).order('version',{ascending:false}).limit(60),
 ]);
 if(clients.error||projects.error||snapshots.error)throw new Error('Quote relations unavailable');
 const lines=parseQuoteLines(q.line_items);
 if(!lines)throw new Error('Stored quote lines are invalid');
 const history:QuoteSnapshot[]=[];
 for(const item of snapshots.data??[]){
  const snapLines=parseQuoteLines(item.line_items);
  if(!snapLines)throw new Error('Stored quote history is invalid');
  history.push({
   id:String(item.id),version:int(item.version),title:String(item.title),
   submittedAt:String(item.submitted_at),totalMinor:int(item.total_minor),
   amountMinor:int(item.amount_minor),taxMinor:int(item.tax_minor),
   taxRateBps:int(item.tax_rate_bps),lines:snapLines,notes:String(item.notes),
  });
 }
 return {
  id:String(q.id),clientId:String(q.client_id),clientName:String(clients.data?.name??'Cliente vinculado'),
  projectId:q.project_id?String(q.project_id):null,
  projectName:projects.data?.name?String(projects.data.name):null,
  title:String(q.title),status:q.status,version:int(q.version),revision:int(q.revision),
  subtotalMinor:int(q.amount_minor),taxMinor:int(q.tax_minor),totalMinor:int(q.total_minor),
  taxRateBps:q.tax_rate_bps===0?0:1600,lines,notes:String(q.notes),
  validUntil:q.valid_until?String(q.valid_until):null,createdAt:String(q.created_at),
  updatedAt:String(q.updated_at),approvedAt:q.approved_at?String(q.approved_at):null,
  sentAt:q.sent_at?String(q.sent_at):null,respondedAt:q.responded_at?String(q.responded_at):null,
  history,
 };
}
export async function quoteFormOptions():Promise<{clients:NameOption[];projects:Array<NameOption&{clientId:string}>}>{
 const member=await requireMembership('cotizaciones');
 const db=await createServerSupabase();
 const [c,p]=await Promise.all([
  db.from('os_clients').select('id,name').eq('organization_id',member.organizationId).order('name').limit(100),
  db.from('os_projects').select('id,name,client_id').eq('organization_id',member.organizationId).order('updated_at',{ascending:false}).limit(100),
 ]);
 if(c.error||p.error)throw new Error('Quote choices unavailable');
 return {
  clients:(c.data??[]).map(x=>({id:String(x.id),name:String(x.name)})),
  projects:(p.data??[]).map(x=>({id:String(x.id),name:String(x.name),clientId:String(x.client_id)})),
 };
}
