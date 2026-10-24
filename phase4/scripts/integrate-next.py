from pathlib import Path
root=Path('/opt/febro-ecosystem/phase4/apps')
def write(app,file,text):
 p=root/app/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
def edit(app,file,a,b):
 p=root/app/file;s=p.read_text();assert a in s,(app,file);p.write_text(s.replace(a,b))
write('voltlab','server/febro-sso.ts','''import {Pool} from 'pg';
import {cookies} from 'next/headers';
import {createSSO} from '../sso/http.mjs';
import {repository,pgConnection,digest} from '../sso/repository.mjs';
import {currentUser,sessionResponse,cookieName,appUrl} from './auth';
import {verifyPassword} from './crypto.mjs';
let handler:ReturnType<typeof createSSO>|undefined;
export async function febroSSO(req:Request){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return new Response('SSO belum diaktifkan.',{status:404});
 handler??=createSSO({app:'VoltLab',origin:appUrl(),issuer:process.env.FEBRO_SSO_ISSUER!,clientId:process.env.FEBRO_SSO_CLIENT_ID!,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET!,callbackPath:'/api/auth/febro/callback',basePath:'/api/auth/febro',repo:repository(pgConnection(new Pool({connectionString:process.env.DATABASE_URL,max:3})),'voltlab'),testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async()=>{const u=await currentUser();return u?{...u,sessionHash:digest((await cookies()).get(cookieName())?.value||'')}:null;},
 reauthenticate:async(_r:Request,u:any,password:string)=>u.password_hash?verifyPassword(password,u.password_hash):false,
 issueSession:async(u:any,response:Response)=>{const next=await sessionResponse(u,true);for(const c of next.headers.getSetCookie())response.headers.append('Set-Cookie',c);}});
 return (await handler(req))||new Response('Not found',{status:404});
}
''')
write('voltlab','app/api/auth/febro/[[...flow]]/route.ts',"import {febroSSO} from '../../../../../server/febro-sso';\nexport const dynamic='force-dynamic';\nexport const GET=febroSSO;export const POST=febroSSO;\n")
# Google identity collision is denied; existing mappings and login remain valid.
edit('voltlab','app/api/auth/google/callback/route.ts',"if(u){if(u.email!==email||u.google_sub&&u.google_sub!==sub||u.status!=='active')", "if(u){if(u.email!==email||u.google_sub!==sub||u.status!=='active')")
# Credentials are not exposed; client UI reads a public capability endpoint.
write('voltlab','app/api/auth/febro-status/route.ts',"export function GET(){return Response.json({enabled:process.env.FEBRO_SSO_ENABLED==='true'},{headers:{'Cache-Control':'no-store'}});}\n")
edit('voltlab','app/login/page.tsx',"const [admin,setAdmin]=useState(false)","const [sso,setSSO]=useState(false);useEffect(()=>{fetch('/api/auth/febro-status').then(r=>r.json()).then(v=>setSSO(v.enabled===true)).catch(()=>{});},[]);const [admin,setAdmin]=useState(false)")
edit('voltlab','app/login/page.tsx','{admin?<form onSubmit={submit}>','{sso&&<a className="btn primary full" href="/api/auth/febro">Login with Febro Space</a>}{admin?<form onSubmit={submit}>')
write('lamariva','src/lib/febro-sso.ts','''import {Pool} from 'pg';
import {createHmac} from 'node:crypto';
import {verifyPassword} from 'better-auth/crypto';
import {auth} from './auth';
import {db} from './db';
import {createSSO} from '../../sso/http.mjs';
import {repository,pgConnection,digest} from '../../sso/repository.mjs';
let handler:ReturnType<typeof createSSO>|undefined;
export async function febroSSO(req:Request){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return new Response('SSO belum diaktifkan.',{status:404});
 const origin=new URL(process.env.APP_URL!).origin;
 handler??=createSSO({app:'Lamariva',origin,issuer:process.env.FEBRO_SSO_ISSUER!,clientId:process.env.FEBRO_SSO_CLIENT_ID!,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET!,callbackPath:'/auth/febro/callback',repo:repository(pgConnection(new Pool({connectionString:process.env.DATABASE_URL,max:3})),'lamariva'),testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async(r:Request)=>{const session=await auth.api.getSession({headers:r.headers});if(!session)return null;const u=await db.user.findUnique({where:{id:session.user.id}});return u&&!u.suspended?{...u,sessionHash:digest(session.session.token)}:null;},
 reauthenticate:async(_r:Request,u:any,password:string)=>{const account=await db.account.findFirst({where:{userId:u.id,providerId:'credential'}});return account?.password?verifyPassword({hash:account.password,password}):false;},
 issueSession:async(u:any,response:Response)=>{
  const context=await auth.$context;const session=await context.internalAdapter.createSession(u.id);if(!session)throw Error('Session rejected');
  // Match the installed Better Auth signed-cookie format; cache remains disabled.
  const signature=createHmac('sha256',context.secret).update(session.token).digest('base64');const cookie=context.authCookies.sessionToken;
  response.headers.append('Set-Cookie',`${cookie.name}=${encodeURIComponent(session.token+'.'+signature)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${cookie.attributes.secure?'; Secure':''}`);
 }});
 return (await handler(req))||new Response('Not found',{status:404});
}
''')
write('lamariva','src/app/auth/febro/[[...flow]]/route.ts',"import {febroSSO} from '@/lib/febro-sso';\nexport const dynamic='force-dynamic';\nexport const GET=febroSSO;export const POST=febroSSO;\n")
write('lamariva','src/app/api/febro-status/route.ts',"export function GET(){return Response.json({enabled:process.env.FEBRO_SSO_ENABLED==='true'},{headers:{'Cache-Control':'no-store'}});}\n")
edit('lamariva','src/lib/auth.ts','      trustedProviders: ["google"],','      trustedProviders: [],\n      disableImplicitLinking: true,')
# Dedicated optional component works on login and authenticated account settings.
write('lamariva','src/components/febro-login.tsx','''"use client";
import {useEffect,useState} from 'react';
export function FebroLogin(){const [enabled,setEnabled]=useState(false);useEffect(()=>{fetch('/api/febro-status').then(r=>r.json()).then(v=>setEnabled(v.enabled===true)).catch(()=>{});},[]);return enabled?<a className="btn" href="/auth/febro">Login / hubungkan Febro Space</a>:null;}
''')
edit('lamariva','src/components/workspace.tsx','"use client";','"use client";\nimport {FebroLogin} from "./febro-login";')
edit('lamariva','src/components/workspace.tsx','        {(register || mode === "login") && site?.googleAvailable && (','        <FebroLogin />\n        {(register || mode === "login") && site?.googleAvailable && (')
