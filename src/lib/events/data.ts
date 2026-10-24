import 'server-only';
import { requireMembership } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/auth/server';
import {
 parseEventFeed,parseEventSummary,
 type EventInbox,type ReportingDays
} from './model';

/** Returns sanitized, RLS-filtered events to an approved owner ONLY. */
export async function loadEventInbox(days:ReportingDays):Promise<EventInbox>{
 const member=await requireMembership('eventos');
 if(member.role!=='owner')throw new Error('Event feed is restricted');
 const db=await createServerSupabase();
 const [report,feed]=await Promise.all([
  db.rpc('os11_event_summary_v1',{p_days:days}),
  db.rpc('os11_event_feed_v1',{p_days:days,p_limit:50}),
 ]);
 if(report.error||feed.error)
  throw new Error('Unable to read event history');
 const summary=parseEventSummary(report.data,days);
 const events=parseEventFeed(feed.data);
 if(events.length>summary.total)
  throw new Error('Invalid event feed length');
 return {summary,events};
}
