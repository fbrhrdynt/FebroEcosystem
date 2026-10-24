from pathlib import Path
root=Path('/opt/febro-ecosystem/phase4/apps')
def write(app,file,text):
 p=root/app/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
def edit(app,file,a,b):
 p=root/app/file;s=p.read_text();assert a in s,(app,file,a);p.write_text(s.replace(a,b))
write('files','src/febro-sso.mjs','''import {createSSO,nodeRequest,nodeResponse} from '../sso/http.mjs';
import {repository,sqliteConnection,digest} from '../sso/repository.mjs';
import {randomBytes} from 'node:crypto';
export async function filesSSO({repo,origin,cookieName,secure}){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return async()=>false;
 const links=repository(sqliteConnection(repo.db),'files');
 const parse=req=>Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));
 const handle=createSSO({app:'Files',origin,issuer:process.env.FEBRO_SSO_ISSUER,clientId:process.env.FEBRO_SSO_CLIENT_ID,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET,callbackPath:'/auth/febro/callback',repo:links,testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async req=>{const token=parse(req)[cookieName],u=repo.getSession(token);if(!u||u.blocked)return null;const row=repo.db.prepare('SELECT expires_at FROM sessions WHERE hash=?').get(digest(token));return {...u,sessionHash:digest(token),fresh:row.expires_at-604800000>Date.now()-300000};},
 reauthenticate:async(_req,u)=>u.fresh,
 issueSession:async(u,response,req)=>{const token=randomBytes(36).toString('base64url');repo.session(token,u.sub);repo.endSession(parse(req)[cookieName]);response.headers.append('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`);},audit:({event})=>repo.audit(null,event)});
 return async(req,res)=>{if(!req.url.split('?')[0].startsWith('/auth/febro'))return false;const response=await handle(nodeRequest(req,origin));if(!response)return false;await nodeResponse(response,res);return true;};
}
''')
edit('files','src/server.mjs',"import http from 'node:http';","import http from 'node:http';\nimport {filesSSO} from './febro-sso.mjs';")
edit('files','src/server.mjs','async function handle(req,res){',"const febroSSO=await filesSSO({repo,origin,cookieName:sessionsCookie,secure:config.production});\nasync function handle(req,res){\n if(await febroSSO(req,res))return;")
# Show button only from actual server capability; account settings link also available after login.
edit('files','src/server.mjs',"{user:null,authUrl:'/auth/start'}","{user:null,authUrl:'/auth/start',febroSSO:process.env.FEBRO_SSO_ENABLED==='true'}")
write('play','services/leaderboard/febro-sso.mjs','''import {createSSO,nodeRequest,nodeResponse} from '../../sso/http.mjs';
import {repository,sqliteConnection,digest} from '../../sso/repository.mjs';
import {randomBytes} from 'node:crypto';
export async function playSSO({db,origin,secure,findPlayer}){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return {handle:async()=>false,player:()=>null};
 const repo=repository(sqliteConnection(db),'play'),name=secure?'__Host-play_sso':'play_sso';
 // Additive session table; never rewrites players, runs, or bests.
 const parse=req=>Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));
 const player=req=>{const token=String(req.headers?.get?parse(req)[name]:(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'');if(!token)return null;return db.prepare('SELECT p.* FROM febro_play_sessions s JOIN players p ON p.id=s.player_id WHERE s.hash=? AND s.expires>?').get(digest(token),Date.now())||null;};
 const handle=createSSO({app:'Play',origin,issuer:process.env.FEBRO_SSO_ISSUER,clientId:process.env.FEBRO_SSO_CLIENT_ID,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET,callbackPath:'/api/leaderboard/auth/callback',basePath:'/api/leaderboard/auth/febro',repo,testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async req=>{const jar=parse(req),p=player(req)||findPlayer.get(jar.fa_player||'');return p?{...p,sessionHash:digest(player(req)?jar[name]:jar.fa_player)}:null;},
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
''')
edit('play','services/leaderboard/server.mjs',"import http from 'node:http';","import http from 'node:http';\nimport {playSSO} from './febro-sso.mjs';")
edit('play','services/leaderboard/server.mjs','function getPlayer(req,res){','function getPlayer(req,res){\n const signed=febroSSO.player(req);if(signed)return signed;')
edit('play','services/leaderboard/server.mjs','const server=http.createServer(async(req,res)=>{',"const febroSSO=await playSSO({db,origin:ORIGIN,secure:PROD,findPlayer});\nconst server=http.createServer(async(req,res)=>{")
edit('play','services/leaderboard/server.mjs',' try{\n  const player=getPlayer(req,res);',' try{\n  if(await febroSSO.handle(req,res))return;\n  const player=getPlayer(req,res);')
edit('play','services/leaderboard/server.mjs','nameSet:!!player.name_set','nameSet:!!player.name_set,authenticated:!!febroSSO.player(req),febroSSO:process.env.FEBRO_SSO_ENABLED===\'true\'')
# Play migrations must be run explicitly; enabling feature without migrations fails closed.
write('itinerary','src/services/febro-sso.js','''import {createSSO,nodeRequest,nodeResponse} from '../../sso/http.mjs';
import {repository,pgConnection,digest} from '../../sso/repository.mjs';
import bcrypt from 'bcryptjs';
import {pool,query} from '../database.js';
const save=req=>new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
export function febroSSO(){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return (_req,_res,next)=>next();
 const origin=new URL(process.env.APP_URL).origin;
 return async(req,res,next)=>{if(!req.path.startsWith('/auth/space'))return next();try{
 const web=nodeRequest(req,origin);
 const handle=createSSO({app:'Itinerary',origin,issuer:process.env.FEBRO_SSO_ISSUER,clientId:process.env.FEBRO_SSO_CLIENT_ID,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET,basePath:'/auth/space',callbackPath:'/auth/space/callback',repo:repository(pgConnection(pool),'itinerary'),testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async()=>{if(!req.session.user)return null;const u=(await query("SELECT * FROM users WHERE id=$1 AND status='active'",[req.session.user.id])).rows[0];return u?{...u,sessionHash:digest(req.sessionID)}:null;},
 reauthenticate:async(_r,u,password)=>u.password_hash?bcrypt.compare(String(password||''),u.password_hash):Number(req.session.authenticatedAt)>Date.now()-300000,
 issueSession:async u=>{await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.user={id:u.id,name:u.name,email:u.email,role:u.role,status:u.status};req.session.authenticatedAt=Date.now();await save(req);}});
 const response=await handle(web);if(response)await nodeResponse(response,res);else next();
 }catch{res.status(503).send('SSO sementara tidak tersedia. Gunakan login lama.');}};
}
''')
# Mount after session, BEFORE body parsers. This also preserves ordinary forms.
edit('itinerary','src/server.js',"import 'dotenv/config';","import 'dotenv/config';\nimport {febroSSO} from './services/febro-sso.js';")
edit('itinerary','src/server.js',"app.use(express.urlencoded({ extended: true, limit: '1mb' }));\napp.use(express.json({ limit: '1mb' }));\napp.use(methodOverride('_method'));",'')
edit('itinerary','src/server.js','app.use((req, res, next) => {',"app.use(febroSSO());\napp.use(express.urlencoded({ extended: true, limit: '1mb' }));\napp.use(express.json({ limit: '1mb' }));\napp.use(methodOverride('_method'));\napp.use((req, res, next) => {")
edit('itinerary','src/routes/auth.js','  req.session.user = {','  req.session.authenticatedAt = Date.now();\n  req.session.user = {')
edit('itinerary','src/routes/auth.js',"res.render('auth/login', { title: 'Masuk', ssoEnabled: configured() });","req.session.loginCSRF=randomToken();\n  res.render('auth/login', { title: 'Masuk', ssoEnabled: configured(), febroSSO:process.env.FEBRO_SSO_ENABLED==='true', loginCSRF:req.session.loginCSRF });")
edit('itinerary','src/routes/auth.js',"router.post(['/login', '/register'], guestOnly, (req, res) => res.redirect(303, '/login'));",'''router.post('/register', guestOnly, (req,res)=>res.redirect(303,'/login'));
router.post('/login',authLimiter,guestOnly,async(req,res,next)=>{try{
 const csrf=req.session.loginCSRF;delete req.session.loginCSRF;
 if(req.headers.origin!==new URL(process.env.APP_URL).origin||!safeEqual(req.body.csrf,csrf))return res.status(403).send('Sesi formulir tidak valid.');
 const user=(await query('SELECT * FROM users WHERE LOWER(email)=$1',[String(req.body.email||'').trim().toLowerCase()])).rows[0];
 if(!user||user.status!=='active'||!user.password_hash||!await bcrypt.compare(String(req.body.password||''),user.password_hash)){flash(req,'danger','Email atau password tidak valid.');await save(req);return res.redirect('/login');}
 await completeLogin(req,res,user);
}catch(e){next(e);}});''')
edit('itinerary','views/auth/login.ejs','      <% if (ssoEnabled) { %>','''      <% if (febroSSO) { %><p><a class="btn btn-primary btn-block" href="/auth/space">Login with Febro Space</a></p><% } %>
      <form method="post" action="/login" class="form-stack"><input type="hidden" name="csrf" value="<%= loginCSRF %>"><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" required maxlength="128" autocomplete="current-password"></label><button class="btn btn-primary">Masuk dengan password</button></form>
      <% if (ssoEnabled) { %>''')
