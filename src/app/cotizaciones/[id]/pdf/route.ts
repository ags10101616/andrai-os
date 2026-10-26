import { notFound } from 'next/navigation';
import { getQuoteDetail } from '@/lib/quotes/data';
import { isQuoteId } from '@/lib/quotes/model';
import { renderQuotePdf } from '@/lib/quotes/pdf';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(
 request:Request,
 {params}:{params:Promise<{id:string}>}
):Promise<Response>{
 const {id}=await params;
 if(!isQuoteId(id))notFound();
 // The data function performs server session+role checks and queries with RLS.
 const quote=await getQuoteDetail(id);
 if(!quote)notFound();
 const appearance=new URL(request.url).searchParams.get('style')==='atelier'
  ?'atelier':'statement';
 const bytes=await renderQuotePdf(quote,appearance);
 const name='ANDRAI-COT-'+id.replaceAll('-','').slice(0,8).toUpperCase()
  +'-V'+quote.version+(appearance==='atelier'?'-ATELIER':'')+'.pdf';
 return new Response(new Uint8Array(bytes),{
  status:200,
  headers:{
   'Content-Type':'application/pdf',
   'Content-Disposition':'attachment; filename="'+name+'"',
   'Cache-Control':'private, no-store, max-age=0',
   'X-Content-Type-Options':'nosniff',
   'Content-Security-Policy':"default-src 'none'",
  }
 });
}
