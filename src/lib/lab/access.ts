import {createHash} from 'node:crypto';
export interface LabEnvironment {vercelEnv?:string;nodeEnv?:string}
/** Public app production never exposes a synthetic design lab by accident. */
export function isLabEnvironment(env:LabEnvironment):boolean{
 if(env.vercelEnv==='production')return false;
 return env.vercelEnv==='preview'||(!env.vercelEnv&&env.nodeEnv==='development');
}
export function createLabResponse(html:string,script:string,env:LabEnvironment):Response{
 const headers:Record<string,string>={
  'Cache-Control':'private, no-store, max-age=0',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 };
 if(!isLabEnvironment(env))return new Response('Not found',{status:404,headers});
 const hash=createHash('sha256').update(script).digest('base64');
 headers['Content-Type']='text/html; charset=utf-8';
 headers['Content-Security-Policy']="default-src 'none'; script-src 'sha256-"+hash+"'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
 return new Response(html,{status:200,headers});
}
