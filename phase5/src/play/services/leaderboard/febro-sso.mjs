import {createSSO,nodeRequest,nodeResponse} from '../../sso/http.mjs';
import {repository,sqliteConnection,digest} from '../../sso/repository.mjs';
import {randomBytes} from 'node:crypto';
export async function playSSO({db,origin,secure,findPlayer}){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return {handle:async()=>false,player:()=>null};
 const repo=repository(sqliteConnection(db),'play'),name=secure?'__Host-play_sso':'play_sso';
 // Additive session table; never rewrites players, runs, or bests.
 const parse=req=>Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));
 const player=req=>{const token=String(req.headers?.get?parse(req)[name]:(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'');if(!token)return null;return db.prepare('SELECT p.* FROM febro_play_sessions s JOIN players p ON p.id=s.player_id WHERE s.hash=? AND s.expires>?').get(digest(token),Date.now())||null;};
 const handle=createSSO({app:'Play',allowGuestLogin:true,origin,issuer:process.env.FEBRO_SSO_ISSUER,clientId:process.env.FEBRO_SSO_CLIENT_ID,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET,callbackPath:'/api/leaderboard/auth/callback',basePath:'/api/leaderboard/auth/febro',repo,testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async req=>{const jar=parse(req),p=player(req)||findPlayer.get(jar.fa_player||'');return p?{...p,authenticated:!!player(req),sessionHash:digest(player(req)?jar[name]:jar.fa_player)}:null;},
 localLogout:async(req,response)=>{db.prepare('DELETE FROM febro_play_sessions WHERE hash=?').run(digest(parse(req)[name]||''));response.headers.append('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`);},
 reauthenticate:async()=>true, // current HttpOnly guest bearer proves THIS player; fresh central auth is also required.
 issueSession:async(u,response,req)=>{const token=randomBytes(32).toString('base64url');db.prepare('DELETE FROM febro_play_sessions WHERE expires<=? OR hash=?').run(Date.now(),digest(parse(req)[name]||''));db.prepare('INSERT INTO febro_play_sessions VALUES(?,?,?)').run(digest(token),u.id,Date.now()+28800000);response.headers.append('Set-Cookie',`${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure?'; Secure':''}`);}});
 return {player,async handle(req,res){
 if(req.url.split('?')[0]==='/api/leaderboard/auth/logout'){
  if(req.method!=='POST'||req.headers.origin!==origin){res.writeHead(403);res.end();return true;}
  const request=nodeRequest(req,origin);db.prepare('DELETE FROM febro_play_sessions WHERE hash=?').run(digest(parse(request)[name]||''));res.writeHead(200,{'Set-Cookie':`${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`,'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');return true;
 }
 if(!req.url.split('?')[0].startsWith('/api/leaderboard/auth/'))return false;
 const response=await handle(nodeRequest(req,origin));if(!response)return false;await nodeResponse(response,res);return true;
 }};
}
