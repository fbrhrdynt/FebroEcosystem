import {db} from './db';
import {Pool} from 'pg';
import {cookies} from 'next/headers';
import {createSSO,canonicalRequest} from '../sso/http.mjs';
import {repository,pgConnection,digest} from '../sso/repository.mjs';
import {currentUser,sessionResponse,cookieName,appUrl} from './auth';
import {verifyPassword} from './crypto.mjs';
let handler:ReturnType<typeof createSSO>|undefined;
export async function febroSSO(req:Request){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return new Response('SSO belum diaktifkan.',{status:404});
 handler??=createSSO({app:'VoltLab',origin:appUrl(),issuer:process.env.FEBRO_SSO_ISSUER!,clientId:process.env.FEBRO_SSO_CLIENT_ID!,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET!,callbackPath:'/api/auth/febro/callback',basePath:'/api/auth/febro',repo:repository(pgConnection(new Pool({connectionString:process.env.DATABASE_URL,max:3})),'voltlab'),testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async()=>{const u=await currentUser();return u?{...u,sessionHash:digest((await cookies()).get(cookieName())?.value||'')}:null;},
 reauthenticate:async(_r:Request,u:any,password:string)=>u.password_hash?verifyPassword(password,u.password_hash):(await db().query("SELECT 1 FROM sessions WHERE token_hash=$1 AND created_at>now()-interval '5 minutes' AND expires_at>now()",[u.sessionHash])).rows.length===1,
 localLogout:async(_r:Request,response:Response)=>{const token=(await cookies()).get(cookieName())?.value;if(token)await db().query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]);response.headers.append('Set-Cookie',`${cookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV==='production'?'; Secure':''}`);},
 issueSession:async(u:any,response:Response)=>{const old=(await cookies()).get(cookieName())?.value;const next=await sessionResponse(u,true);if(old)await db().query('DELETE FROM sessions WHERE token_hash=$1 AND user_id=$2',[digest(old),u.id]);for(const c of next.headers.getSetCookie())response.headers.append('Set-Cookie',c);}});
 return (await handler(canonicalRequest(req,appUrl())))||new Response('Not found',{status:404});
}
