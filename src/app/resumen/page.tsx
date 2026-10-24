import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard';
import { parseDashboardDays } from '@/lib/dashboard/model';
import { loadExecutiveDashboard } from '@/lib/dashboard/data';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Resumen ejecutivo'};

export default async function ExecutivePage({searchParams}:{
 searchParams:Promise<{days?:string}>;
}){
 const {days:rawDays}=await searchParams;
 const days=parseDashboardDays(rawDays);
 const data=await loadExecutiveDashboard(days);
 return <AppShell active="resumen" role={data.member.role} displayName={data.member.displayName}>
  <ExecutiveDashboard report={data.report} tasks={data.upcomingTasks}
    followups={data.followups} activity={data.activity}/>
 </AppShell>;
}
