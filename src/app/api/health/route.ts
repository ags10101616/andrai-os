import { NextResponse } from 'next/server';
/** Public liveness only; this does not establish Supabase or Auth readiness. */
export function GET(){
 return NextResponse.json({
  status:'ok',application:'andrai-os',spec:'os-10',
  mode:'private-pilot-readonly',component:'http',
  revision:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??'local'
 },{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
