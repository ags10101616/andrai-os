import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { EventInboxView } from '@/components/events/EventInbox';
import { requireMembership } from '@/lib/auth/session';
import { loadEventInbox } from '@/lib/events/data';
import { parseReportingDays } from '@/lib/events/model';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={
 title:'Actividad y eventos',
 robots:{index:false,follow:false,nocache:true}
};

export default async function EventsPage({searchParams}:{
 searchParams:Promise<{days?:string}>;
}){
 const query=await searchParams;
 const days=parseReportingDays(query.days);
 const [member,inbox]=await Promise.all([
  requireMembership('eventos'),loadEventInbox(days)
 ]);
 return <AppShell active="eventos" role={member.role} displayName={member.displayName}>
  <EventInboxView inbox={inbox}/>
 </AppShell>;
}
