import {createSSO,nodeRequest,nodeResponse} from '../sso/http.mjs';
import {repository,sqliteConnection,digest} from '../sso/repository.mjs';
import {randomBytes} from 'node:crypto';
export async function filesSSO({repo,origin,cookieName,secure}){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return async()=>false;
 const links=repository(sqliteConnection(repo.db),'files');
 const parse=req=>Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));
 const handle=createSSO({app:'Files',origin,issuer:process.env.FEBRO_SSO_ISSUER,clientId:process.env.FEBRO_SSO_CLIENT_ID,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET,callbackPath:'/auth/febro/callback',repo:links,testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async req=>{const token=parse(req)[cookieName],u=repo.getSession(token);if(!u||u.blocked)return null;const row=repo.db.prepare('SELECT expires_at FROM sessions WHERE hash=?').get(digest(token));return {...u,sessionHash:digest(token),fresh:row.expires_at-604800000>Date.now()-300000};},
 reauthenticate:async(_req,u)=>u.fresh,
 localLogout:async(req,response)=>{repo.endSession(parse(req)[cookieName]);response.headers.append('Set-Cookie',`${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`);},
 issueSession:async(u,response,req)=>{const token=randomBytes(36).toString('base64url');repo.session(token,u.sub);repo.endSession(parse(req)[cookieName]);response.headers.append('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`);},audit:({event})=>repo.audit(null,event)});
 return async(req,res)=>{if(!req.url.split('?')[0].startsWith('/auth/febro'))return false;const response=await handle(nodeRequest(req,origin));if(!response)return false;await nodeResponse(response,res);return true;};
}
