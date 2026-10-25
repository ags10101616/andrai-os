import {labDocument} from '@/lib/lab/document';
import {labRuntime} from '@/lib/lab/runtime';
import {createLabResponse} from '@/lib/lab/access';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const revalidate=0;

/** Preview-only, deterministic design study. No business session or data is read. */
export function GET():Response{
 return createLabResponse(labDocument,labRuntime,{
  vercelEnv:process.env.VERCEL_ENV,nodeEnv:process.env.NODE_ENV,
 });
}
