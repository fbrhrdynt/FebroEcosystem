import http from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createStore } from './store.mjs';
import { normalizeUrl,validAlias,sha256,clientIp,limiter,parseCookies,safeEqual } from './security.mjs';
import { publicUser,passwordCheck,displayName,isEmail,normalizeEmail,hashPassword,verifyPassword,createSession,randomString,sendMail,googleConfig,googleStart,googleComplete } from './auth.mjs';
import { PROJECTS,LABS } from './docs.mjs';
import { parseUpload,pdfInfo,stampPdf,privatePath,writePrivate,hashBuffer,convert,bad } from './files.mjs';
import { renderQr } from './qr.mjs';
import { initOidc } from './oidc.mjs';
import {initControlPlane,isCentralAdmin} from './control-plane.mjs';
import {controlOverview} from './control-analytics.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(fs.existsSync(path.join(ROOT,'.env')))process.loadEnvFile(path.join(ROOT,'.env'));
const config={
 production:process.env.NODE_ENV==='production',host:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||3470),domain:process.env.BASE_DOMAIN||'febro.id',
 secure:process.env.NODE_ENV==='production',dataDir:path.resolve(ROOT,process.env.DATA_DIR||'data'),admins:process.env.NODE_ENV==='production'?['febroherdyanto@outlook.com','febroherdyanto98@gmail.com']:(process.env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean),
 smtpHost:process.env.SMTP_HOST||'smtp.hostinger.com',smtpPort:Number(process.env.SMTP_PORT||465),smtpSecure:process.env.SMTP_SECURE!=='false',smtpUser:process.env.SMTP_USER||'',smtpPass:process.env.SMTP_PASS||'',smtpFrom:process.env.SMTP_FROM||'',
 googleClientId:process.env.GOOGLE_CLIENT_ID||'',googleClientSecret:process.env.GOOGLE_CLIENT_SECRET||'',googleRedirectUri:process.env.GOOGLE_REDIRECT_URI||'',
 registration:process.env.ALLOW_REGISTRATION!=='false',shortening:process.env.ALLOW_SHORTENING!=='false',secret:process.env.APP_SECRET||''
};
if(config.production&&(!config.secret||config.secret.length<64||!config.admins.length))throw Error('Konfigurasi APP_SECRET/ADMIN_EMAILS belum benar; jalankan scripts/setup.sh dan sesuaikan .env');
if(!config.production&&!config.secret)config.secret=randomString(64);
const SITES=['tools','lab','api','docs','qr','convert','snip','short','verify','auth'];
const domains=Object.fromEntries(SITES.map(site=>[`${site}.${config.domain}`,site]));
const store=createStore(config.dataDir);
const control=initControlPlane(store.db,config.dataDir);
// Logout HTTP flow verified by tests/oidc-http.test.mjs before advertising.
const oidc=initOidc(store.db,config.dataDir,`https://auth.${config.domain}`,{logoutVerified:true});
const allow=limiter();
const now=()=>Date.now();
const context=new AsyncLocalStorage();
const modulePaths={tools:'/tools',lab:'/lab',qr:'/qr-generator',convert:'/converter',short:'/url-shortener',snip:'/snippets',auth:'/profile',verify:'/verify',api:'/api',docs:'/docs'};
const ecoHost=`eco.${config.domain}`,ecoOrigin=`https://${ecoHost}`;
const base=site=>context.getStore()?.unified?ecoOrigin+modulePaths[site]:`https://${site}.${config.domain}`;
function destinationSite(dest){return dest.hostname===ecoHost?Object.keys(modulePaths).find(s=>dest.pathname===modulePaths[s]||dest.pathname.startsWith(modulePaths[s]+'/'))||'tools':dest.hostname.split('.')[0];}

const reqIp=req=>sha256(`${config.secret}:${clientIp(req)}`);
function rate(req,name,n,ms){if(!allow(reqIp(req),name,n,ms))throw bad('Terlalu banyak permintaan. Coba lagi nanti.',429);}
function safeReturn(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname===ecoHost||SITES.some(s=>u.hostname===`${s}.${config.domain}`))&&!u.username&&!u.password?u.href:base('tools');}catch{return base('tools');}}
function respond(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(data));}
function redirect(res,url,status=302){res.writeHead(status,{'Location':url,'Cache-Control':'no-store'});res.end();}
function fail(s,msg){throw bad(msg,s);}
function bytes(res,status,buf,mime,name){res.writeHead(status,{'Content-Type':mime,'Cache-Control':'no-store','Content-Length':buf.length,...(name?{'Content-Disposition':`attachment; filename="${name}"`}:{})});res.end(buf);}
function siteFor(req,u){const host=String(req.headers.host||'').split(':')[0].toLowerCase();if(host===ecoHost){
 const match=Object.entries(modulePaths).find(([,prefix])=>u.pathname===prefix||u.pathname.startsWith(prefix+'/'));
 if(match){u.pathname=u.pathname.slice(match[1].length)||'/';return match[0];}
 if(u.pathname.startsWith('/v1/')){const part=u.pathname.split('/')[2];return ({account:'auth',control:'auth',auth:'auth',links:'short',snippets:'snip',convert:'convert',qr:'qr',verify:'verify',api:'api',catalog:'docs'})[part]||'tools';}
 if(u.pathname==='/control-center.js'||u.pathname==='/control-center.css')return 'auth';
 return u.pathname==='/'?'dashboard':'tools';
 }if(domains[host])return domains[host];if(!config.production&&['localhost','127.0.0.1','[::1]'].includes(host)){const candidate=u.searchParams.get('site')||'tools';return SITES.includes(candidate)?candidate:'tools';}return null;}
function sessionToken(req){return parseCookies(req.headers.cookie||'')[config.secure?'__Host-fb_session':'fb_session_dev']||'';}
async function form(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)fail(413,'Form terlalu besar');}return Object.fromEntries(new URLSearchParams(body));}
function oidcForm(res,title,action,ticket,password=false){
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(`<!doctype html><html lang="id"><meta name="viewport" content="width=device-width"><title>${title}</title><h1>${title}</h1><form method="post" action="${action}"><input type="hidden" name="ticket" value="${ticket}">${password?'<label>Password <input type="password" name="password" autocomplete="current-password" required></label>':''}<button type="submit">Konfirmasi</button></form></html>`);
}
function getUser(req){const cookie=parseCookies(req.headers.cookie||'');const user=store.sessionUser(cookie[config.secure?'__Host-fb_session':'fb_session_dev']||'');return user?.disabled?null:user;}
function loginRequired(req){const user=getUser(req);if(!user||!user.email_verified)fail(401,'Login dan verifikasi email diperlukan');return user;}
function adminRequired(req){const user=loginRequired(req);if(!config.admins.includes(user.email))fail(403,'Hanya administrator dokumen yang diizinkan');return user;}
function setCookie(res,token,maxAge=604800){const parts=[`${config.secure?'__Host-fb_session':'fb_session_dev'}=${token}`,'Path=/','HttpOnly','SameSite=Lax',`Max-Age=${maxAge}`];if(config.secure)parts.push('Secure');res.setHeader('Set-Cookie',[...(res.getHeader('Set-Cookie')?(Array.isArray(res.getHeader('Set-Cookie'))?res.getHeader('Set-Cookie'):[res.getHeader('Set-Cookie')]):[]),parts.join('; ')]);}
function setOAuthCookie(res,state,maxAge=600){const parts=[`${config.secure?'__Host-fb_oauth':'fb_oauth_dev'}=${state}`,'Path=/','HttpOnly','SameSite=Lax',`Max-Age=${maxAge}`];if(config.secure)parts.push('Secure');res.setHeader('Set-Cookie',[...(res.getHeader('Set-Cookie')?(Array.isArray(res.getHeader('Set-Cookie'))?res.getHeader('Set-Cookie'):[res.getHeader('Set-Cookie')]):[]),parts.join('; ')]);}
function allowedOrigin(req,site){const origin=req.headers.origin;if(!origin)return false;try{const u=new URL(origin);if(context.getStore()?.unified)return u.origin===ecoOrigin; if(config.production)return u.origin===base(site);return ['http://localhost','http://127.0.0.1'].includes(u.origin)||u.origin===`http://localhost:${config.port}`||u.origin===`http://127.0.0.1:${config.port}`;}catch{return false;}}
function guardOrigin(req,site){if(!allowedOrigin(req,site))fail(403,'Origin browser tidak diizinkan');}
function headers(res,pathName){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');res.setHeader('Cross-Origin-Resource-Policy','same-site');res.setHeader('Content-Security-Policy',"default-src 'none';script-src 'self';style-src 'self';img-src 'self' data: blob:;connect-src 'self';worker-src 'self' blob:;font-src 'self';base-uri 'none';object-src 'none';frame-ancestors 'none';form-action 'self'");if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');if(pathName.startsWith('/v1/api/')){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');}}
async function json(req,max=24000){if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Content-Type wajib application/json');let n=0,chunks=[];for await (const chunk of req){n+=chunk.length;if(n>max)fail(413,'Body terlalu besar');chunks.push(chunk);}try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw 0;return data;}catch{fail(400,'JSON tidak valid');}}
function serveStatic(res,p){
 const ST={
 '/assets/shell.js':['public/shell.js','text/javascript; charset=utf-8'],
 '/assets/apple-touch-icon.png':['public/apple-touch-icon.png','image/png'],
 '/assets/app-icon-192.png':['public/app-icon-192.png','image/png'],
 '/assets/app-icon-512.png':['public/app-icon-512.png','image/png'],
 '/assets/app-icon.svg':['public/app-icon.svg','image/svg+xml'],
 '/assets/unified.css':['public/unified.css','text/css; charset=utf-8'],
 '/assets/app.css':['public/app.css','text/css; charset=utf-8'],
 '/assets/site-identities.css':['public/site-identities.css','text/css; charset=utf-8'],
 '/assets/app.js':['public/app.js','text/javascript; charset=utf-8'],
 '/assets/pdf.mjs':['node_modules/pdfjs-dist/build/pdf.min.mjs','text/javascript; charset=utf-8'],
 '/assets/pdf.worker.mjs':['node_modules/pdfjs-dist/build/pdf.worker.min.mjs','text/javascript; charset=utf-8'],
 '/favicon.svg':['public/icon.svg','image/svg+xml'],
 '/openapi.yaml':['docs-content/openapi.yaml','application/yaml; charset=utf-8']
 };
 if(!ST[p])return false;
 const [f,mime]=ST[p],full=path.join(ROOT,f);
 if(!fs.existsSync(full)){respond(res,503,{error:'Jalankan npm install untuk menyiapkan asset'});return true;}
 const stat=fs.statSync(full);res.writeHead(200,{'Content-Type':mime,'Content-Length':stat.size,'Cache-Control':'public,max-age=3600'});fs.createReadStream(full).pipe(res);return true;
}
function sitePage(res,site){let template=fs.readFileSync(path.join(ROOT,'public','sites',`${site}.html`),'utf8');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});if(context.getStore()?.unified){
 template=template.replace(/\/assets\/app\.js\?[^"]*/g,'/assets/app.js?v=space-1');
 template=template.replace(/<html /,'<html data-unified="true" ');
 
 template=template.replace('</head>','<link rel="stylesheet" href="/assets/unified.css?v=space-1"></head>');
 const nav='<nav class="ecosystem-nav" aria-label="Ecosystem"><a href="/">Dashboard</a>'+Object.entries(modulePaths).map(([s,p])=>`<a href="${p}"${s===site?' aria-current="page"':''}>${({auth:'Account',qr:'QR',convert:'Converter',snip:'Snippets',short:'Short URL'})[s]||s[0].toUpperCase()+s.slice(1)}</a>`).join('')+'</nav>';
 template=template.replace('</header>','</header>'+nav);
 template=template.replace(/https:\/\/(tools|lab|api|docs|qr|convert|snip|short|verify|auth)\.febro\.id/g,(_,s)=>modulePaths[s]);
 }res.end(template);}
function catalogItem(item){if(!context.getStore()?.unified||!item.url)return item;try{const u=new URL(item.url),site=domains[u.hostname];return site?{...item,url:base(site)+(u.pathname==='/'?'':u.pathname)+u.search+u.hash}:item;}catch{return item;}}
function visibleDocument(row){if(!row)return null;return {id:row.id,title:row.title,status:row.status,validatedBy:row.validator_name,validatedAt:row.validated_at,revokedAt:row.revoked_at,sha256:row.output_hash,createdAt:row.created_at};}
function apiKeyUser(req){const key=String(req.headers.authorization||'').match(/^Bearer (fb_[A-Za-z0-9_-]{20,120})$/);if(!key)fail(401,'API key diperlukan: Authorization: Bearer fb_...');const user=store.keyUser(key[1]);if(!user)fail(401,'API key tidak valid atau email belum diverifikasi');if(!control.isEnabled(user.id,'api'))fail(403,'Akses API dinonaktifkan');return user;}
async function handle(req,res){
 const u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`),site=siteFor(req,u),p=u.pathname,method=req.method;
 headers(res,p);if(!site)fail(421,'Hostname tidak dikenali');
 if(method==='GET'&&site==='dashboard')return sitePage(res,'dashboard');
 if(method==='GET'&&p==='/openapi.yaml'&&site!=='docs')fail(404,'Endpoint tidak tersedia');
 if(site==='auth'&&method==='GET'&&['/console','/control-center.js','/control-center.css'].includes(p)){
  if(p==='/console'&&!isCentralAdmin(getUser(req)))return redirect(res,base('auth')+'/account');
  const asset=p==='/console'?'console.html':p.slice(1),file=path.join(ROOT,'public',asset);
  const mime=p==='/console'?'text/html; charset=utf-8':p.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8';
  let content=fs.readFileSync(file);if(context.getStore()?.unified&&p==='/console')content=Buffer.from(content.toString().replaceAll('href="/account"','href="/profile/account"').replaceAll('href="/console"','href="/profile/console"'));res.writeHead(200,{'Content-Type':mime,'Content-Length':content.length,'Cache-Control':'no-store'});res.end(content);return;
 }
 if(method==='GET'&&serveStatic(res,p))return;
 if(method==='GET'&&p==='/health')return respond(res,200,{status:'ok',app:'febro-ecosystem'});
 if(method==='GET'&&p==='/v1/health')return respond(res,200,{status:'ok',sites:SITES.length,serverTime:new Date().toISOString()});
 if(method==='GET'&&p==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(['verify','auth','snip','short'].includes(site)?'User-agent: *\nDisallow: /\n':'User-agent: *\nDisallow: /v1/\n');return;}
 if(method==='OPTIONS'&&p.startsWith('/v1/api/')){res.writeHead(204);res.end();return;}
 rate(req,'all',300,60000);
 // Central account control plane. Browser session required; no token or secret exposure.
 if(site==='auth'&&p.startsWith('/v1/control/')){
  const actor=getUser(req);if(!isCentralAdmin(actor))fail(403,'Administrator verified account required');
  rate(req,'control',60,60000);
  if(method==='GET'&&p==='/v1/control/overview')return respond(res,200,controlOverview(store.db));
  if(method==='GET'&&p==='/v1/control/users')return respond(res,200,control.userList(Number(u.searchParams.get('offset'))||0));
  if(method==='GET'&&p==='/v1/control/apps')return respond(res,200,{apps:control.appList()});
  if(method==='GET'&&p==='/v1/control/audit')return respond(res,200,{items:control.log()});
  const m=p.match(/^\/v1\/control\/users\/([a-f0-9-]{36})(?:\/(block|access|revoke))?$/i);
  if(m){
   if(method==='GET'&&!m[2])return respond(res,200,control.detail(m[1]));
   if(method==='POST'){
    guardOrigin(req,site);const b=await json(req,1000);
    if(m[2]==='block'){if(typeof b.blocked!=='boolean')fail(400,'blocked must be boolean');return respond(res,200,control.setBlocked(actor.id,m[1],b.blocked));}
    if(m[2]==='access'){if(typeof b.enabled!=='boolean'||typeof b.app!=='string')fail(400,'Invalid app access payload');return respond(res,200,control.setAccess(actor.id,m[1],b.app,b.enabled));}
    if(m[2]==='revoke')return respond(res,200,control.revokeSessions(actor.id,m[1]));
   }
  }
  fail(404,'Control endpoint not found');
 }
 // Per-app access to existing private endpoints. Public utilities remain accessible anonymously.
 if(site!=='auth'&&site!=='verify'&&p.startsWith('/v1/')&&
    !['/v1/auth/me','/v1/health'].includes(p)){
  const local=getUser(req);if(local&&!control.isEnabled(local.id,site))fail(403,'Access to this application is disabled');
 }
 // OpenID Connect bridge for independently deployed services, PKCE S256 + confidential clients.
 if(site==='auth' && method==='GET' && p==='/.well-known/openid-configuration')return respond(res,200,oidc.discovery());
 if(site==='auth' && method==='GET' && p==='/oauth/jwks')return respond(res,200,oidc.jwks());
 if(site==='auth' && method==='GET' && p==='/oauth/authorize'){
   const params=Object.fromEntries(u.searchParams.entries());
   const me=getUser(req);
   try{return redirect(res,oidc.authorize(params,me));}catch(error){
     if(error.message!=='login_required')throw error;
     if(String(params.prompt||'').split(/\s+/).includes('none')) {const dest=new URL(params.redirect_uri);dest.searchParams.set('error','login_required');dest.searchParams.set('state',params.state);return redirect(res,dest.href);}
     if(!me?.email_verified)return redirect(res,`${base('auth')}/?next=${encodeURIComponent(`${base('auth')}${u.pathname}${u.search}`)}`);
     const ticket=oidc.saveAction('reauth',sessionToken(req),params);
     return oidcForm(res,'Konfirmasi password untuk masuk kembali','/oauth/reauth',ticket,true);
   }
 }
 if(site==='auth' && method==='POST' && p==='/oauth/reauth'){
   guardOrigin(req,site);rate(req,'oidc-reauth',8,15*60000);const b=await form(req),me=loginRequired(req);
   const params=oidc.takeAction('reauth',sessionToken(req),b.ticket);
   if(!me.password_hash||!verifyPassword(String(b.password||''),me.password_hash))fail(401,'Password tidak cocok; akun Google perlu mengatur password melalui pemulihan email terlebih dahulu');
   const auth_time=Math.floor(Date.now()/1000);
   const dest=oidc.authorize(params,{...me,auth_time},{reauthenticated:true});
   store.endSession(sessionToken(req));setCookie(res,createSession(store,me.id,auth_time));return redirect(res,dest,303);
 }
 if(site==='auth' && method==='GET' && p==='/oauth/logout'){
   const target=oidc.logoutTarget(Object.fromEntries(u.searchParams));
   const ticket=oidc.saveAction('logout',sessionToken(req),{target});
   return oidcForm(res,'Keluar dari sesi Febro Space ini?','/oauth/logout',ticket);
 }
 if(site==='auth' && method==='POST' && p==='/oauth/logout'){
   guardOrigin(req,site);const b=await form(req),{target}=oidc.takeAction('logout',sessionToken(req),b.ticket);
   store.endSession(sessionToken(req));setCookie(res,'',0);return redirect(res,target,303);
 }
 if(site==='auth' && method==='POST' && p==='/oauth/token'){
   rate(req,'oidc-token',60,60000);
   if(!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))fail(415,'Form urlencoded required');
   let body='';for await(const c of req){body+=c;if(body.length>4096)fail(413,'Body too large');}
   return respond(res,200,oidc.token(Object.fromEntries(new URLSearchParams(body))));
 }
 if(site==='auth' && method==='GET' && p==='/oauth/userinfo'){
   rate(req,'oidc-userinfo',120,60000);
   const bearer=/^Bearer (\S+)$/.exec(String(req.headers.authorization||''));
   if(!bearer)fail(401,'Bearer access token required');
   return respond(res,200,oidc.userinfo(bearer[1]));
 }


 // Host-only sessions; unified modules share the eco host cookie.
 if(method==='GET'&&p==='/v1/auth/me')return respond(res,200,{user:publicUser(getUser(req),config.admins),googleEnabled:googleConfig(config)});
 if(site==='auth'&&method==='GET'&&p==='/v1/account/profile'){
   const u=loginRequired(req);
   return respond(res,200,{profile:{name:u.name,headline:u.headline||'',city:u.city||'',website:u.website||'',bio:u.bio||'',email:u.email,verified:!!u.email_verified,googleLinked:!!u.google_sub,isAdmin:config.admins.includes(u.email)}});
 }
 if(site==='auth'&&method==='POST'&&p==='/v1/account/profile'){
   guardOrigin(req,site);rate(req,'profile',30,3600000);const u=loginRequired(req),b=await json(req);
   const clean=(key,max)=>typeof b[key]==='string'?b[key].trim().slice(0,max+1):'';
   const data={name:clean('name',90),headline:clean('headline',80),city:clean('city',80),website:clean('website',200),bio:clean('bio',240)};
   if(data.name.length<2||data.name.length>90||data.headline.length>80||data.city.length>80||data.bio.length>240||data.website.length>200)fail(400,'Profil melebihi batas karakter yang diizinkan');
   if(/[\x00-\x1f<>]/.test(Object.values(data).join('')))fail(400,'Karakter profil tidak valid');
   if(data.website){try{const w=new URL(data.website);if(w.protocol!=='https:'||!w.hostname.includes('.')||w.username||w.password)throw 0;}catch{fail(400,'Website harus berupa URL HTTPS yang valid');}}
   const updated=store.updateProfile(u.id,data);return respond(res,200,{profile:{name:updated.name,headline:updated.headline,city:updated.city,website:updated.website,bio:updated.bio},user:publicUser(updated,config.admins)});
 }
 if(site==='auth'&&method==='GET'&&p==='/v1/auth/google/status'){
   return respond(res,200,{configured:googleConfig(config),redirectUri:config.googleRedirectUri||null,expectedRedirectUri:`${base('auth')}/auth/google/callback`,linked:getUser(req)?!!getUser(req).google_sub:null});
 }
 if(method==='POST'&&p==='/v1/auth/logout'){guardOrigin(req,site);const current=getUser(req);if(current)store.endAllSessions(current.id);setCookie(res,'',0);return respond(res,200,{ok:true});}
 if(method==='GET'&&p==='/auth/handoff'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');rate(req,'handoff',20,60000);const target=safeReturn(u.searchParams.get('next')||base('tools'));const user=getUser(req);
  if(!user||!user.email_verified)return redirect(res,`${base('auth')}/?next=${encodeURIComponent(target)}`);
  const dest=new URL(target);if(!control.isEnabled(user.id,destinationSite(dest)))fail(403,'App access denied');if(context.getStore()?.unified&&dest.hostname===ecoHost)return redirect(res,dest.href);if(dest.hostname===`auth.${config.domain}`)return redirect(res,dest.href);
  const ticket=randomString(40);store.saveHandoff(ticket,user.id,dest.hostname);
  return redirect(res,`${dest.origin}/#fb_ticket=${encodeURIComponent(ticket)}&to=${encodeURIComponent(dest.pathname+dest.search)}`);
 }
 if(method==='POST'&&p==='/v1/auth/claim'){
  guardOrigin(req,site);rate(req,'claim',12,60000);const b=await json(req),ticket=String(b.ticket||'');
  if(ticket.length<40||ticket.length>150)fail(401,'Login ticket tidak valid');
  const uid=store.takeHandoff(ticket,context.getStore()?.unified?ecoHost:`${site}.${config.domain}`);if(!uid)fail(401,'Login ticket kedaluwarsa atau sudah digunakan');
  const user=store.getUserById(uid);if(!user?.email_verified||user.disabled||!control.isEnabled(user.id,site))fail(403,'Akun belum aktif atau akses ditolak');
  setCookie(res,createSession(store,uid));return respond(res,200,{user:publicUser(user,config.admins)});
 }
 if(method==='POST'&&p==='/v1/auth/register'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);rate(req,'authreg',4,3600000);if(!config.registration)fail(403,'Pendaftaran sedang ditutup');
  const b=await json(req),email=normalizeEmail(b.email),name=displayName(b.name);
  if(!isEmail(email)||name.length<2||!passwordCheck(b.password))fail(400,'Masukkan nama, email valid dan password 12–128 karakter');
  if(store.getUserByEmail(email))return respond(res,200,{message:'Jika email dapat didaftarkan, tautan verifikasi akan dikirim.'});
  const user=store.createUser({email,name,passwordHash:hashPassword(b.password)});
  const token=randomString(36);store.saveToken(token,user.id,'verify',15*60000);
  await sendMail(config,{to:email,subject:'Verifikasi email — Febro Space',heading:'Konfirmasi alamat email',text:'Aktifkan akunmu melalui tautan berikut. Tautan berlaku 15 menit.',button:'Verifikasi email',url:`${base('auth')}/auth/verify?token=${encodeURIComponent(token)}`});
  return respond(res,201,{message:'Akun dibuat. Cek inbox dan folder spam untuk verifikasi email.'});
 }
 if(method==='GET'&&p==='/auth/verify'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');const token=u.searchParams.get('token')||'';
  const id=token.length>=32&&token.length<=180?store.consumeToken(token,'verify'):null;if(!id)return redirect(res,`${base('auth')}/?notice=verification-invalid`);
  store.verifyUser(id);return redirect(res,`${base('auth')}/?notice=verified`);
 }
 if(method==='POST'&&p==='/v1/auth/login'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);rate(req,'authlogin',8,15*60000);
  const b=await json(req),user=store.getUserByEmail(normalizeEmail(b.email));
  if(!user||!user.password_hash||!verifyPassword(String(b.password||''),user.password_hash))fail(401,'Email atau password salah');
  if(!user.email_verified)fail(403,'Verifikasi email terlebih dahulu');
  if(user.disabled)fail(403,'Akun dinonaktifkan');
  setCookie(res,createSession(store,user.id,Math.floor(Date.now()/1000)));return respond(res,200,{user:publicUser(user,config.admins)});
 }
 if(method==='POST'&&p==='/v1/auth/forgot'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);rate(req,'authforgot',4,3600000);
  const b=await json(req),email=normalizeEmail(b.email),user=store.getUserByEmail(email);
  if(user){const token=randomString(36);store.saveToken(token,user.id,'reset',15*60000);
    await sendMail(config,{to:email,subject:'Reset password — Febro Space',heading:'Atur ulang password',text:'Kami menerima permintaan untuk mengubah password akunmu. Tautan berlaku 15 menit dan hanya dapat dipakai sekali.',button:'Reset password',url:`${base('auth')}/reset?token=${encodeURIComponent(token)}`});}
  return respond(res,200,{message:'Jika email terdaftar, tautan reset password akan dikirim.'});
 }
 if(method==='POST'&&p==='/v1/auth/reset'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);rate(req,'authreset',6,15*60000);const b=await json(req);
  if(!passwordCheck(b.password))fail(400,'Password wajib 12–128 karakter');
  const id=typeof b.token==='string'&&b.token.length>=32&&b.token.length<=180?store.consumeToken(b.token,'reset'):null;
  if(!id)fail(400,'Tautan reset tidak valid atau kedaluwarsa');store.updatePassword(id,hashPassword(b.password));setCookie(res,'',0);return respond(res,200,{message:'Password diperbarui. Silakan masuk lagi.'});
 }
 if(method==='POST'&&p==='/v1/auth/resend'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);rate(req,'resend',3,3600000);const b=await json(req),email=normalizeEmail(b.email),user=store.getUserByEmail(email);
  if(user&&!user.email_verified){const token=randomString(36);store.saveToken(token,user.id,'verify',15*60000);await sendMail(config,{to:email,subject:'Verifikasi email — Febro Space',heading:'Verifikasi alamat email',text:'Konfirmasi kepemilikan alamat email untuk mengaktifkan akun. Tautan berlaku 15 menit.',button:'Verifikasi',url:`${base('auth')}/auth/verify?token=${token}`});}
  return respond(res,200,{message:'Jika email terdaftar dan belum aktif, tautan verifikasi telah dikirim.'});
 }
 if(method==='GET'&&p==='/auth/google/start'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');rate(req,'oauthstart',10,15*60000);if(!googleConfig(config))fail(503,'Google login belum diatur di .env');
  const target=safeReturn(u.searchParams.get('next')||base('tools'));
  const callback=new URL(config.googleRedirectUri);
  if(context.getStore()?.unified&&callback.hostname!==ecoHost&&u.searchParams.get('link')==='1'){
   const user=loginRequired(req),ticket=randomString(40);store.saveHandoff(ticket,user.id,callback.hostname);
   return redirect(res,`${callback.origin}/#fb_ticket=${encodeURIComponent(ticket)}&to=${encodeURIComponent('/auth/google/start'+u.search)}`);
  }
  if((context.getStore()?.unified?ecoHost:`auth.${config.domain}`)!==callback.hostname)return redirect(res,`${callback.origin}${callback.hostname===ecoHost?'/profile':''}/auth/google/start${u.search}`);
  const oauth=googleStart(config,store,target,u.searchParams.get('link')==='1'?getUser(req)?.id||null:null);setOAuthCookie(res,oauth.state);return redirect(res,oauth.url);
 }
 if(method==='GET'&&p==='/auth/google/callback'){
  if(site!=='auth')fail(404,'Endpoint tidak tersedia');const s=String(u.searchParams.get('state')||''),code=String(u.searchParams.get('code')||'');
  const cookie=parseCookies(req.headers.cookie||'')[config.secure?'__Host-fb_oauth':'fb_oauth_dev'];
  if(!cookie||!safeEqual(cookie,s))fail(400,'OAuth browser state tidak cocok');
  setOAuthCookie(res,'',0);
  const row=s.length>=30&&s.length<=100?store.takeOAuth(s):null;
  if(row&&u.searchParams.get('error'))return redirect(res,`${base('auth')}/?notice=google-cancelled`);
  if(!row||!code)fail(400,'OAuth state tidak valid atau kedaluwarsa');
  if(row.user_id&&getUser(req)?.id!==row.user_id)fail(403,'Koneksi Google harus dilakukan dari akun yang sedang login');
  const profile=await googleComplete(config,code,row.verifier);
  let user=store.getUserByGoogle(profile.sub);
  if(row.user_id){
    const existing=store.getUserById(row.user_id);if(!existing||!existing.email_verified||existing.email!==profile.email||user&&user.id!==existing.id)fail(403,'Google tidak dapat dihubungkan ke akun ini');
    if(existing.google_sub&&existing.google_sub!==profile.sub)fail(409,'Akun sudah terhubung ke Google lain');
    if(!existing.google_sub)store.linkGoogle(existing.id,profile.sub);user=store.getUserById(existing.id);
  }else if(!user){
    if(store.getUserByEmail(profile.email))fail(409,'Email sudah terdaftar. Login via email dahulu dan hubungkan Google dari halaman Account.');
    user=store.createUser({email:profile.email,name:profile.name,verified:profile.authoritative,googleSub:profile.sub});
    if(!profile.authoritative&&config.smtpUser&&config.smtpPass&&!config.smtpPass.startsWith('REPLACE')){
      const token=randomString(36);store.saveToken(token,user.id,'verify',15*60000);
      await sendMail(config,{to:user.email,subject:'Verifikasi email — Febro Space',heading:'Verifikasi alamat email',text:'Google login dengan alamat email non-Gmail membutuhkan verifikasi kepemilikan mailbox sebelum fitur pribadi dapat digunakan.',button:'Verifikasi email',url:`${base('auth')}/auth/verify?token=${token}`});
    }
  }
  if(user.disabled)fail(403,'Akun dinonaktifkan');
  setCookie(res,createSession(store,user.id));
  if(!user.email_verified)return redirect(res,`${base('auth')}/account`);
  if(context.getStore()?.unified&&new URL(row.return_to).hostname===ecoHost)return redirect(res,row.return_to);
  if(new URL(row.return_to).hostname===`auth.${config.domain}`)return redirect(res,row.return_to);
  const dest=new URL(row.return_to);if(!control.isEnabled(user.id,destinationSite(dest)))fail(403,'App access denied');const ticket=randomString(40);store.saveHandoff(ticket,user.id,dest.hostname);
  return redirect(res,`${dest.origin}/#fb_ticket=${encodeURIComponent(ticket)}&to=${encodeURIComponent(dest.pathname+dest.search)}`);
 }
 // Catalogue is public and only contains curated links/text.
 if(method==='GET'&&p==='/v1/catalog/labs')return respond(res,200,{projects:LABS.map(catalogItem)});
 if(method==='GET'&&p==='/v1/catalog/docs')return respond(res,200,{articles:PROJECTS.map(catalogItem)});
 if(method==='GET'&&p.startsWith('/v1/catalog/docs/')){const slug=p.slice('/v1/catalog/docs/'.length);const item=PROJECTS.find(x=>x.slug===slug);if(!item)fail(404,'Dokumentasi tidak ditemukan');return respond(res,200,{article:catalogItem(item)});}
 // QR + API
 if(method==='GET'&&(p==='/v1/qr'||p==='/v1/api/qr')){
  if(p==='/v1/api/qr'&&site!=='api'||p==='/v1/qr'&&!['qr','verify'].includes(site))fail(404,'Endpoint tidak tersedia');
  rate(req,'qr',45,60000);const opts={text:String(u.searchParams.get('text')||''),format:u.searchParams.get('format')||'png',width:Number(u.searchParams.get('width')||u.searchParams.get('size')||360),dark:u.searchParams.get('dark')||'#182837',light:u.searchParams.get('light')||'#ffffff'};
  if(opts.text.length>1600||!opts.text)fail(400,'Masukkan teks hingga 1600 karakter');
  const qr=await renderQr(opts);return bytes(res,200,Buffer.isBuffer(qr.data)?qr.data:Buffer.from(qr.data),qr.type,u.searchParams.get('download')==='1'?`qr-by-febro.${qr.ext}`:null);
 }
 if(method==='GET'&&p==='/v1/api/uuid'){if(site!=='api')fail(404,'Endpoint tidak tersedia');rate(req,'uuid',100,60000);return respond(res,200,{uuid:randomUUID(),by:'Febro Herdyanto'});}
 // URL shortener user owned, no anonymous creation.
 if(method==='POST'&&(p==='/v1/links'||p==='/v1/api/short')){
  let user;
  if(p==='/v1/api/short'){if(site!=='api')fail(404,'Endpoint tidak tersedia');user=apiKeyUser(req);}else{if(site!=='short')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);user=loginRequired(req);}
  if(!config.shortening)fail(403,'URL shortener sedang dinonaktifkan');rate(req,'make-link',20,3600000);
  if(store.dailyLinkCount(user.id)>=30)fail(429,'Batas 30 URL per hari per akun');
  const b=await json(req);const target=normalizeUrl(b.url);let alias=b.alias?String(b.alias):null;
  if(alias&&!validAlias(alias))fail(400,'Alias 4–32 karakter (a-z, 0-9, - dan _)');
  const days=b.days===undefined?30:Number(b.days);if(!Number.isInteger(days)||days<1||days>365)fail(400,'Masa aktif 1–365 hari');
  const link=store.makeLink(user.id,target,alias,days);return respond(res,201,{...link,shortUrl:`${base('short')}/${link.code}`});
 }
 if(method==='GET'&&p==='/v1/links'){if(site!=='short')fail(404,'Endpoint tidak tersedia');return respond(res,200,{links:store.listLinks(loginRequired(req).id)});}
 const linkDisable=p.match(/^\/v1\/links\/([a-zA-Z0-9_-]{4,32})$/);
 if(method==='DELETE'&&linkDisable){if(site!=='short')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);const user=loginRequired(req);if(!store.disableLink(user.id,linkDisable[1]))fail(404,'Link tidak ditemukan');return respond(res,200,{ok:true});}
 // Snippets
 if(method==='GET'&&p==='/v1/snippets'){if(site!=='snip')fail(404,'Endpoint tidak tersedia');return respond(res,200,{snippets:store.snippets(loginRequired(req).id)});}
 if(method==='POST'&&p==='/v1/snippets'){if(site!=='snip')fail(404,'Endpoint tidak tersedia');
  guardOrigin(req,site);const user=loginRequired(req),b=await json(req,52000);rate(req,'snips',30,3600000);
  const d=sanitizeSnippet(b);const s=store.createSnippet(user.id,d);return respond(res,201,{...s,publicUrl:`${base('snip')}/s/${s.id}`});
 }
 const snipMatch=p.match(/^\/v1\/snippets\/([a-f0-9-]{36})$/);
 if(snipMatch){if(site!=='snip')fail(404,'Endpoint tidak tersedia');const id=snipMatch[1];const row=store.snippet(id);if(!row)fail(404,'Snippet tidak ditemukan');const current=getUser(req);const owned=current?.id===row.user_id;
  if(method==='GET'){if(!owned&&row.visibility!=='public')fail(404,'Snippet tidak ditemukan');return respond(res,200,{snippet:{id:row.id,title:row.title,language:row.language,content:row.content,visibility:row.visibility,updatedAt:row.updated_at,isOwner:owned}});}
  if(method==='PUT'||method==='DELETE'){guardOrigin(req,site);const user=loginRequired(req);if(!owned||user.id!==row.user_id)fail(403,'Bukan milik akunmu');if(method==='DELETE'){store.deleteSnippet(user.id,id);return respond(res,200,{ok:true});}const b=await json(req,52000);store.updateSnippet(user.id,id,sanitizeSnippet(b));return respond(res,200,{ok:true});}
 }
 // API key management
 if(method==='GET'&&p==='/v1/account/keys')return respond(res,200,{keys:store.keys(loginRequired(req).id)});
 if(method==='POST'&&p==='/v1/account/keys'){guardOrigin(req,site);const user=loginRequired(req);rate(req,'keys',5,3600000);const b=await json(req);const name=String(b.name||'').trim().slice(0,50);if(name.length<2)fail(400,'Masukkan nama API key');const token=`fb_${randomString(34)}`;return respond(res,201,{key:store.createKey(user.id,name,token),notice:'Simpan token. Token tidak ditampilkan lagi.'});}
 const keyMatch=p.match(/^\/v1\/account\/keys\/([a-f0-9-]{36})$/);
 if(method==='DELETE'&&keyMatch){guardOrigin(req,site);const user=loginRequired(req);if(!store.revokeKey(user.id,keyMatch[1]))fail(404,'API key tidak ditemukan');return respond(res,200,{ok:true});}
 // Document verification registry metadata: public, never serves the underlying PDF.
 const publicDoc=p.match(/^\/v1\/verify\/public\/([a-f0-9-]{36})$/);
 if(method==='GET'&&publicDoc){rate(req,'verify-public',80,60000);const doc=store.doc(publicDoc[1]);if(!doc)fail(404,'Nomor dokumen tidak ditemukan');return respond(res,200,{document:visibleDocument(doc)});}
 if(p.startsWith('/v1/verify/documents')){
  if(site!=='verify')fail(404,'Endpoint tidak tersedia');const owner=adminRequired(req);
  if(method==='GET'&&p==='/v1/verify/documents')return respond(res,200,{documents:store.docs(owner.id)});
  if(method==='POST'&&p==='/v1/verify/documents'){
   guardOrigin(req,site);rate(req,'docupload',10,3600000);
   const form=await parseUpload(req,{maxBytes:8*1024*1024,maxFiles:1});
   if(form.files.length!==1)fail(400,'Upload tepat satu PDF');
   const f=form.files[0],title=String(form.fields.title||'').trim().slice(0,150);
   if(title.length<3)fail(400,'Judul dokumen minimal 3 karakter');
   const {pages}=await pdfInfo(f.buffer);const id=randomUUID(),filepath=privatePath(config.dataDir,id,'original');writePrivate(filepath,f.buffer);
   // Keep the ID deterministic by explicitly inserting selected ID into DB.
   store.db.prepare('INSERT INTO documents(id,owner_id,title,original_name,source_path,status,source_hash,page_count,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,owner.id,title,f.name,filepath,'draft',hashBuffer(f.buffer),pages,now());
   return respond(res,201,{document:{id,title,pages,verifyUrl:`${base('verify')}/v/${id}`}});
  }
  const docRoute=p.match(/^\/v1\/verify\/documents\/([a-f0-9-]{36})(?:\/(source|output|stamp|revoke))?$/);
  if(docRoute){const id=docRoute[1],action=docRoute[2]||'';const d=store.doc(id);if(!d||d.owner_id!==owner.id)fail(404,'Dokumen tidak ditemukan');
   if(method==='GET'&&!action)return respond(res,200,{document:{...visibleDocument(d),pages:d.page_count,verifyUrl:`${base('verify')}/v/${id}`}});
   if(method==='GET'&&['source','output'].includes(action)){
    const file=action==='source'?d.source_path:d.output_path;if(!file||!fs.existsSync(file))fail(404,'PDF belum tersedia');
    return bytes(res,200,fs.readFileSync(file),'application/pdf',action==='output'?`verified-${id}.pdf`:null);
   }
   if(method==='POST'&&action==='stamp'){
    guardOrigin(req,site);rate(req,'docstamp',20,3600000);if(d.status!=='draft')fail(409,'Dokumen sudah diterbitkan atau dicabut');
    const b=await json(req),pageIndex=Number(b.pageIndex),x=Number(b.x),y=Number(b.y),size=Number(b.size);
    const output=await stampPdf(fs.readFileSync(d.source_path),{id,verifyUrl:`${base('verify')}/v/${id}`,pageIndex,x,y,size});
    const outputPath=privatePath(config.dataDir,id,'verified');writePrivate(outputPath,output);
    store.stampDoc(id,{outputPath,outputHash:hashBuffer(output),pageIndex,x,y,size,name:owner.name,email:owner.email});
    return respond(res,200,{document:visibleDocument(store.doc(id)),downloadUrl:`/v1/verify/documents/${id}/output`});
   }
   if(method==='POST'&&action==='revoke'){
    guardOrigin(req,site);if(d.status!=='valid')fail(409,'Dokumen tidak berstatus valid');store.revokeDoc(id);return respond(res,200,{document:visibleDocument(store.doc(id))});
   }
  }
 }
 // Anonymous converter does not retain uploads: stream -> memory -> respond, never logs file contents.
 if(method==='POST'&&p==='/v1/convert'){
  if(site!=='convert')fail(404,'Endpoint tidak tersedia');guardOrigin(req,site);rate(req,'convert',8,15*60000);
  const form=await parseUpload(req,{maxBytes:8*1024*1024,maxFiles:5});const result=await convert({operation:form.fields.operation,files:form.files,pages:form.fields.pages});
  return bytes(res,200,result.buffer,result.mime,result.name);
 }
 // Short link redirect only on short host; expired/revoked links show 410.
 if(site==='short'&&method==='GET'&&/^\/[a-zA-Z0-9_-]{4,32}$/.test(p)&&!['/login','/reset','/admin'].includes(p)){
  const link=store.getLink(p.slice(1));if(!link)fail(404,'Tautan tidak ditemukan');if(link.disabled||link.expires_at<now())fail(410,'Tautan sudah tidak aktif');store.clickLink(link.code);return redirect(res,link.url,302);
 }
 if(method==='GET'&&(p==='/'||p==='/index.html'||p==='/login'||p==='/register'||p==='/reset'||p==='/forgot'||p==='/account'||p==='/app'||p==='/admin'||p.startsWith('/v/')||p.startsWith('/s/')||p.startsWith('/article/'))){return sitePage(res,site);}
 fail(404,'Endpoint tidak ditemukan');
}
function sanitizeSnippet(b){const title=String(b.title||'').trim(),language=String(b.language||'plaintext').toLowerCase().trim(),content=String(b.content||'');const visibility=b.visibility==='public'?'public':'private';if(title.length<2||title.length>120||!content.trim()||content.length>40000||!/^[a-z0-9+#_-]{1,25}$/.test(language))fail(400,'Judul, bahasa, atau kode tidak valid (maks. 40.000 karakter)');return{title,language,content,visibility};}
const server=http.createServer(async(req,res)=>{try{await context.run({unified:String(req.headers.host||'').split(':')[0].toLowerCase()===ecoHost},()=>handle(req,res));}catch(err){const status=err.status>=400&&err.status<600?err.status:500;if(!res.headersSent){console.error(status===500?'Server error:':'Request:',String(err.message));respond(res,status,{error:status===500?'Kesalahan server, coba lagi nanti.':err.message});}else res.destroy();}});
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])||process.env.RUN_SERVER==='true'){
 server.listen(config.port,config.host,()=>console.log(`Febro Space ready at http://${config.host}:${config.port}`));
}
export {server,config,store};
