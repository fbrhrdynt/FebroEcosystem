import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,createPublicKey,verify,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {initDatabase,MB,digest,uuid,randomToken,comparePassword} from './db.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(fs.existsSync(path.join(ROOT,'.env')))process.loadEnvFile(path.join(ROOT,'.env'));
const config={
 host:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||3480),
 appUrl:process.env.APP_URL||'https://files.febro.id',issuer:process.env.OIDC_ISSUER||'https://auth.febro.id',
 clientId:process.env.OIDC_CLIENT_ID||'febro-files',clientSecret:process.env.OIDC_CLIENT_SECRET||'',
 sessionSecret:process.env.SESSION_SECRET||'',
 dataDir:path.resolve(ROOT,process.env.DATA_DIR||'data'),
 admins:process.env.NODE_ENV==='production'?['febroherdyanto@outlook.com','febroherdyanto98@gmail.com']:(process.env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean),
 maxUploadMb:Math.min(512,Math.max(1,Number(process.env.MAX_UPLOAD_MB||512))),
 production:process.env.NODE_ENV==='production',
};
if(config.production&&(!config.clientSecret||config.sessionSecret.length<48||!config.admins.length||!config.appUrl.startsWith('https://')||!config.issuer.startsWith('https://')))throw Error('Configure OIDC_CLIENT_SECRET, SESSION_SECRET, ADMIN_EMAILS and HTTPS URLs first');
fs.mkdirSync(config.dataDir,{recursive:true,mode:0o700});
const tmpDir=path.join(config.dataDir,'tmp'),vaultDir=path.join(config.dataDir,'vault');
for(const dir of [tmpDir,vaultDir])fs.mkdirSync(dir,{recursive:true,mode:0o700});
const repo=initDatabase(config.dataDir);
repo.db.exec('CREATE TABLE IF NOT EXISTS oauth_flows(state_hash TEXT PRIMARY KEY,verifier TEXT NOT NULL,nonce TEXT NOT NULL,expires_at INTEGER NOT NULL)');
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const origin=new URL(config.appUrl).origin;
const issuer=new URL(config.issuer).origin;
const sessionsCookie=config.production?'__Host-fb_files':'fb_files_dev';
const oauthCookie=config.production?'__Host-fb_files_oauth':'fb_files_oauth_dev';
const shareCookie=config.production?'__Host-fb_files_share':'fb_files_share_dev';
const uid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ipLimits=new Map(),uploadCounts=new Map();let totalUploads=0;
function limit(req,key,max,period){
 const addr=String(req.headers['x-real-ip']||req.socket.remoteAddress||'unknown').slice(0,64);const k=addr+':'+key;const n=Date.now(),prev=ipLimits.get(k);if(!prev||prev.reset<=n){ipLimits.set(k,{count:1,reset:n+period});return;}
 if(++prev.count>max)throw err('Too many requests',429);
 if(ipLimits.size>15000){for(const [k,v] of ipLimits)if(v.reset<n)ipLimits.delete(k);}
}
function response(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function redirect(res,dest){res.writeHead(302,{'Location':dest,'Cache-Control':'no-store'});res.end();}
function parseCookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s).slice(0,2)).filter(x=>x[0]));}
function setCookie(res,name,value,age){const c=`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${config.production?'; Secure':''}`;const old=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...(old?Array.isArray(old)?old:[old]:[]),c]);}
function security(res){for(const [k,v] of Object.entries({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cache-Control':'no-store','Permissions-Policy':'camera=(),microphone=(),geolocation=()','Content-Security-Policy':"default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; frame-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; form-action 'self'; font-src 'self'"}))res.setHeader(k,v);if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');}
function guardOrigin(req){if(req.headers.origin!==origin)throw err('Invalid Origin',403);}
function needUser(req){const session=parseCookies(req)[sessionsCookie];const a=repo.getSession(session);if(!a||a.blocked)throw err('Sign in required',401);return a;}
function needAdmin(req){const user=needUser(req);if(!config.admins.includes(user.email))throw err('Administrator only',403);return user;}
function normId(v){if(v===null||v===undefined||v==='')return null;if(typeof v!=='string'||!uid.test(v))throw err('Invalid item identifier');return v;}
function readJson(req,max=16384){return new Promise(async(resolve,reject)=>{try{if(!String(req.headers['content-type']||'').startsWith('application/json'))throw err('JSON body required',415);let bufs=[],size=0;for await(const c of req){size+=c.length;if(size>max)throw err('Request too large',413);bufs.push(c);}const obj=JSON.parse(Buffer.concat(bufs).toString('utf8'));if(!obj||Array.isArray(obj)||typeof obj!=='object')throw err('Invalid JSON');resolve(obj);}catch(e){reject(e);}});}
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const b64sha=s=>createHash('sha256').update(s).digest('base64url');
async function verifyIdToken(token,nonce){
 const parts=String(token).split('.');if(parts.length!==3)throw err('Malformed ID token',401);
 let head,body;try{head=JSON.parse(Buffer.from(parts[0],'base64url'));body=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{throw err('Invalid token',401);}
 if(head.alg!=='RS256'||body.iss!==issuer||body.aud!==config.clientId||body.nonce!==nonce||body.email_verified!==true||!body.sub||!body.email||body.exp<=Date.now()/1000||body.iat>Date.now()/1000+30)throw err('Invalid identity token claims',401);
 const r=await fetch(issuer+'/oauth/jwks',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw err('Identity provider unavailable',502);
 const {keys=[]}=await r.json();const key=keys.find(k=>k.kid===head.kid&&k.alg==='RS256');if(!key)throw err('Unknown signing key',401);
 const keyObj=createPublicKey({key,format:'jwk'});
 if(!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),keyObj,Buffer.from(parts[2],'base64url')))throw err('Invalid token signature',401);
 return {sub:body.sub,email:body.email,name:body.name||body.email};
}
function hmac(data){return createHmac('sha256',config.sessionSecret).update(data).digest('base64url');}
function shareUnlocked(req,token){const c=parseCookies(req)[shareCookie];if(!c)return false;const [hash,expiry,mac]=c.split('.');const payload=hash+'.'+expiry;const expected=hmac(payload);if(!mac||mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return false;return hash===b64sha(token)&&Number(expiry)>Date.now();}
function shareAccess(req,token){const share=repo.getPublic(token);if(!share)throw err('Share not found or expired',404);if(share.password_hash&&!shareUnlocked(req,token))throw err('PASSWORD_REQUIRED',401);return share;}
function filePath(key){if(!uid.test(key))throw err('Invalid stored file key',500);return path.join(vaultDir,key.slice(0,2),key);}
function streamFile(res,item,filename){
 if(item.kind!=='file'||!item.storage_key)throw err('Not a file',400);const filepath=filePath(item.storage_key);
 if(!fs.existsSync(filepath))throw err('File data missing',404);
 const safe=String(filename||item.name).replace(/[\r\n"\\]/g,'_').slice(0,140);
 res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':item.size,'Content-Disposition':`attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(item.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
 fs.createReadStream(filepath).on('error',()=>res.destroy()).pipe(res);
}

// Inline preview is deliberately limited to inert types whose signatures are checked.
// Never return uploaded HTML, SVG or unknown formats as browser-renderable content.
function previewType(item){
 if(item.kind!=='file'||!item.storage_key)return null;
 const ext=path.extname(item.name||'').toLowerCase(),fd=fs.openSync(filePath(item.storage_key),'r');
 const head=Buffer.alloc(512);let len=0;
 try{len=fs.readSync(fd,head,0,head.length,0);}finally{fs.closeSync(fd);}
 const b=head.subarray(0,len);
 if(ext==='.pdf'&&b.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
 if(ext==='.png'&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(['.jpg','.jpeg'].includes(ext)&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'image/jpeg';
 if(ext==='.gif'&&['GIF89a','GIF87a'].includes(b.subarray(0,6).toString('ascii')))return 'image/gif';
 if(ext==='.webp'&&b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP')return 'image/webp';
 if(['.txt','.md','.csv','.log','.json'].includes(ext)&&item.size<=1024*1024&& !b.includes(0))return 'text/plain; charset=utf-8';
 return null;
}
function streamPreview(req,res,item){
 const mime=previewType(item);if(!mime)throw err('Preview not available for this format',415);
 const name=String(item.name||'document').replace(/[\\"\r\n]/g,'_').slice(0,140);
 const total=item.size,range=String(req.headers.range||'');
 let start=0,end=total-1,status=200;
 if(range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!m||(!m[1]&&!m[2]))throw err('Invalid Range',416);
  if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<1)throw err('Invalid Range',416);start=Math.max(0,total-suffix);}
  else{start=Number(m[1]);end=m[2]?Number(m[2]):end;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=total||end<start)throw err('Invalid Range',416);
  end=Math.min(total-1,end);status=206;
 }
 // Same-origin PDF viewer is allowed without weakening the app shell's frame policy.
 res.setHeader('X-Frame-Options','SAMEORIGIN');
 res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'self'");
 const headers={'Content-Type':mime,'Content-Disposition':`inline; filename="${name}"`,
  'Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Length':end-start+1,
  ...(status===206?{'Content-Range':`bytes ${start}-${end}/${total}`}:{})};
 res.writeHead(status,headers);
 if(req.method==='HEAD')return res.end();
 fs.createReadStream(filePath(item.storage_key),{start,end}).on('error',()=>res.destroy()).pipe(res);
}

function diskHasRoom(bytes){if(typeof fs.statfsSync==='function'){const stat=fs.statfsSync(config.dataDir),free=Number(stat.bavail)*Number(stat.bsize);return free>bytes+Math.max(128*MB,free*0.05);}return true;}
async function upload(req,res,user,folder,name){
 limit(req,'upload',35,3600000);
 if(totalUploads>=8||(uploadCounts.get(user.sub)||0)>=2)throw err('Too many uploads, try again',429);
 if(!/^application\/octet-stream(?:;|$)/i.test(String(req.headers['content-type']||'')))throw err('Binary upload required',415);
 const max=config.maxUploadMb*MB,declared=Number(req.headers['content-length']);
 if(!Number.isFinite(declared)||declared<0||declared>max)throw err('File too large or unknown Content-Length',413);
 if(!diskHasRoom(declared))throw err('Insufficient server disk space',507);
 if(folder)repo.requireActive(user.sub,folder,'folder');
 if(user.used_bytes+declared>repo.quota(user.sub))throw err('Quota exceeded',413);
 totalUploads++;uploadCounts.set(user.sub,(uploadCounts.get(user.sub)||0)+1);
 const tmp=path.join(tmpDir,uuid());let size=0,committed=false;
 const hash=createHash('sha256');
 try{
  const meter=new Transform({transform(chunk,enc,cb){size+=chunk.length;if(size>max)return cb(err('File exceeds upload limit',413));hash.update(chunk);cb(null,chunk);}});
  await pipeline(req,meter,fs.createWriteStream(tmp,{flags:'wx',mode:0o600}));
  if(size!==declared||size<1)throw err('Empty or incomplete file upload',400);
  if(!diskHasRoom(0))throw err('Insufficient disk space',507);
  const key=uuid(),target=filePath(key);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  fs.renameSync(tmp,target);
  try{const item=repo.insertFile(user.sub,folder,name,key,size,hash.digest('hex'),'application/octet-stream');committed=true;return response(res,201,{item:{id:item.id,name:item.name,size:item.size,kind:item.kind}});}
  finally{if(!committed)fs.rmSync(target,{force:true});}
 }finally{fs.rmSync(tmp,{force:true});totalUploads--;uploadCounts.set(user.sub,(uploadCounts.get(user.sub)||1)-1);}
}
function serveAsset(res,p){
 const m={'/':'public/index.html','/index.html':'public/index.html','/app.js':'public/app.js','/app.css':'public/app.css','/favicon.svg':'public/favicon.svg'};
 const f=m[p];if(!f)return false;const file=path.join(ROOT,f);
 const type=f.endsWith('.js')?'text/javascript; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':f.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8';
 const content=fs.readFileSync(file);res.writeHead(200,{'Content-Type':type,'Content-Length':content.length});res.end(res.req?.method==='HEAD'?undefined:content);return true;
}

// Service-to-service bridge for febro.id. Independent of browser sessions and CSRF.
// This identity owns only its own folder tree, never a personal user's files.
const bridgeSub='service:febro-profile';
function bridgeUser(req){
 const secret=process.env.FEBRO_PROFILE_SERVICE_TOKEN||'';
 const header=String(req.headers.authorization||'');
 const supplied=header.startsWith('Bearer ')?header.slice(7):'';
 if(secret.length<48||supplied.length!==secret.length||
    !timingSafeEqual(Buffer.from(supplied),Buffer.from(secret)))throw err('Unauthorized integration',401);
 return repo.upsertAccount({sub:bridgeSub,email:'service-febro-profile@internal.invalid',name:'Febro Profile Integration'});
}
function bridgeFolder(parent,name){
 const existing=repo.list(bridgeSub,parent).find(n=>n.kind==='folder'&&n.name===name);
 return existing||repo.createFolder(bridgeSub,parent,name);
}
async function handleBridge(req,res,u){
 const user=bridgeUser(req),p=u.pathname,method=req.method;
 limit(req,'profile-bridge',150,60000);
 const root=bridgeFolder(null,'Applications');
 const app=bridgeFolder(root.id,'febro.id');
 const match=p.match(/^\/api\/integrations\/v1\/files\/([a-f0-9-]{36})(?:\/(preview|download))?$/);
 if(method==='POST'&&p==='/api/integrations/v1/files'){
  const kind=u.searchParams.get('kind'),entry=u.searchParams.get('entry'),name=u.searchParams.get('name');
  if(!['project','certification','post','experience','education','tool'].includes(kind)||
     !/^[1-9][0-9]{0,12}$/.test(entry||'')||
     !name||name.length>180||/[\\/\x00-\x1f\x7f]/.test(name))throw err('Invalid file destination',400);
  const category=bridgeFolder(app.id,kind);
  const destination=bridgeFolder(category.id,entry);
  return upload(req,res,user,destination.id,name);
 }
 if(!match)throw err('Integration route not found',404);
 const id=match[1],action=match[2];
 const node=repo.requireActive(bridgeSub,id,'file');
 // No other service or user account can access this integration's objects.
 if(method==='GET'&&!action)return response(res,200,{item:{id:node.id,name:node.name,size:node.size,sha256:node.sha256,mime:node.mime}});
 if(['GET','HEAD'].includes(method)&&action==='preview')return streamPreview(req,res,node);
 if(method==='GET'&&action==='download')return streamFile(res,node);
 if(method==='DELETE'&&!action){repo.trash(bridgeSub,id);return response(res,200,{ok:true});}
 throw err('Method not allowed',405);
}

async function handle(req,res){
 security(res);const u=new URL(req.url||'/',origin),p=u.pathname,method=req.method;
 if(p.startsWith('/api/integrations/v1/'))return handleBridge(req,res,u);
 if(['GET','HEAD'].includes(method)&&p==='/health')return response(res,200,{status:'ok',app:'febro-files',by:'Febro Herdyanto'});
 if(method==='GET'&&p==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('User-agent: *\nDisallow: /\n');}
 if(method==='GET'&&p==='/auth/start'){
  limit(req,'auth-start',20,60000);
  if(repo.getSession(parseCookies(req)[sessionsCookie]))return redirect(res,'/');
  if(!config.clientSecret)throw err('SSO configuration incomplete',503);
  const state=randomToken(),nonce=randomToken(),verifier=randomToken(),challenge=b64sha(verifier);
  repo.db.prepare('INSERT INTO oauth_flows VALUES (?,?,?,?)').run(digest(state),verifier,nonce,Date.now()+600000);
  setCookie(res,oauthCookie,state,600);
  const auth=new URL(issuer+'/oauth/authorize');for(const [k,v] of Object.entries({client_id:config.clientId,redirect_uri:origin+'/auth/callback',response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}))auth.searchParams.set(k,v);
  return redirect(res,auth.href);
 }
 if(method==='GET'&&p==='/auth/callback'){
  limit(req,'auth-callback',30,60000);
  const cookie=parseCookies(req)[oauthCookie],state=u.searchParams.get('state'),code=u.searchParams.get('code');
  setCookie(res,oauthCookie,'',0);
  if(!cookie||!state||!code||cookie!==state)throw err('OAuth callback state mismatch',403);
  const flow=repo.db.prepare('SELECT * FROM oauth_flows WHERE state_hash=?').get(digest(state));
  repo.db.prepare('DELETE FROM oauth_flows WHERE state_hash=?').run(digest(state));
  if(!flow||flow.expires_at<Date.now())throw err('Login flow expired',401);
  const form=new URLSearchParams({grant_type:'authorization_code',code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:origin+'/auth/callback',code_verifier:flow.verifier});
  const r=await fetch(issuer+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw err('Identity provider rejected login',401);
  const tokens=await r.json(),identity=await verifyIdToken(tokens.id_token,flow.nonce);
  const account=repo.upsertAccount(identity);
  if(account.blocked)throw err('Files account suspended',403);
  const token=randomToken();repo.session(token,account.sub);setCookie(res,sessionsCookie,token,604800);
  return redirect(res,'/');
 }
 if(method==='POST'&&p==='/auth/logout'){guardOrigin(req);repo.endSession(parseCookies(req)[sessionsCookie]);setCookie(res,sessionsCookie,'',0);return response(res,200,{ok:true});}
 if(method==='GET'&&p==='/api/me'){
  const user=repo.getSession(parseCookies(req)[sessionsCookie]);if(!user||user.blocked)return response(res,200,{user:null,authUrl:'/auth/start'});
  return response(res,200,{user:{sub:user.sub,email:user.email,name:user.name,isAdmin:config.admins.includes(user.email),usedBytes:user.used_bytes,quotaBytes:repo.quota(user.sub)},authUrl:'/auth/start'});
 }
 if(method==='GET'&&p==='/s')return redirect(res,'/');
 if(method==='GET'&&/^\/s\/[A-Za-z0-9_-]{40,120}$/.test(p))return serveAsset(res,'/');
 // Public sharing: no account required. Links are random, hashed and revocable.
 const pub=p.match(/^\/api\/public\/([A-Za-z0-9_-]{40,120})(?:\/(unlock|(?:download|preview)\/([a-f0-9-]{36})))?$/);
 if(pub){limit(req,'public',180,60000);const token=pub[1],action=pub[2];const share=repo.getPublic(token);if(!share)throw err('Share unavailable',404);
  if(method==='POST'&&action==='unlock'){
   guardOrigin(req);limit(req,'unlock',8,300000);const b=await readJson(req);
   if(!share.password_hash||!comparePassword(String(b.password||''),share.password_hash))throw err('Password incorrect',401);
   const expiry=Date.now()+12*3600000,payload=b64sha(token)+'.'+expiry;
   setCookie(res,shareCookie,payload+'.'+hmac(payload),43200);return response(res,200,{ok:true});
  }
  if(method==='GET'&&!action){const s=shareAccess(req,token);const folder=normId(u.searchParams.get('folder'));
   const children=s.node.kind==='folder'?repo.sharedChildren(s,folder):[];
   return response(res,200,{item:{id:s.node.id,name:s.node.name,kind:s.node.kind,size:s.node.size},children,expiresAt:s.expires_at,downloads:s.download_count,maxDownloads:s.max_downloads});
  }
  if(['GET','HEAD'].includes(method)&&action?.startsWith('preview/')){
   const s=shareAccess(req,token),node=repo.db.prepare('SELECT * FROM nodes WHERE id=?').get(pub[3]);
   if(!node||!repo.isDescendant(s.node,node.id)||node.owner_sub!==s.owner_sub||node.kind!=='file'||node.trashed_at)throw err('File unavailable',404);
   // A full preview can be saved. Protect the meaning of download-limited shares.
   if(s.max_downloads>0)throw err('Preview disabled for download-limited shares',403);
   return streamPreview(req,res,node);
  }
  if(method==='GET'&&action?.startsWith('download/')){
   const s=shareAccess(req,token),node=repo.db.prepare('SELECT * FROM nodes WHERE id=?').get(pub[3]);
   if(!node||!repo.isDescendant(s.node,node.id)||node.owner_sub!==s.owner_sub||node.kind!=='file'||node.trashed_at)throw err('File not available',404);
   repo.incDownload(s.id);return streamFile(res,node,node.name);
  }
 }
 // Private APIs require a verified SSO account. No cross-origin cookies or CORS.
 if(p.startsWith('/api/')){
  limit(req,'api',500,60000);
  if(!['GET','HEAD'].includes(method))guardOrigin(req);
  const user=needUser(req);
  if(method==='GET'&&p==='/api/list'){const parent=normId(u.searchParams.get('parent'));return response(res,200,{items:repo.list(user.sub,parent),breadcrumbs:repo.breadcrumbs(user.sub,parent)});}
  if(method==='GET'&&p==='/api/usage')return response(res,200,{usedBytes:user.used_bytes,quotaBytes:repo.quota(user.sub)});
  if(method==='GET'&&p==='/api/trash')return response(res,200,{items:repo.trashed(user.sub)});
  if(method==='GET'&&p==='/api/search'){
   const q=String(u.searchParams.get('q')||'').trim().slice(0,80);
   if(q.length<2)return response(res,200,{items:[]});
   const results=repo.db.prepare('SELECT id,name,kind,size,parent_id FROM nodes WHERE owner_sub=? AND trashed_at IS NULL AND name LIKE ? ESCAPE \'\\\' LIMIT 100').all(user.sub,'%'+q.replace(/[\\%_]/g,x=>'\\'+x)+'%');
   return response(res,200,{items:results.filter(x=>{try{repo.requireActive(user.sub,x.id);return true;}catch{return false;}})});
  }
  if(method==='POST'&&p==='/api/folders'){const b=await readJson(req);return response(res,201,{item:repo.createFolder(user.sub,normId(b.parent),b.name)});}
  if(method==='POST'&&p==='/api/upload'){
   const folder=normId(u.searchParams.get('parent'));const name=u.searchParams.get('name');return upload(req,res,user,folder,name);
  }
  const item=p.match(/^\/api\/items\/([a-f0-9-]{36})(?:\/(rename|move|trash|restore|purge|download|preview))?$/);
  if(item){const id=item[1],action=item[2];
   if(['GET','HEAD'].includes(method)&&action==='preview')return streamPreview(req,res,repo.requireActive(user.sub,id,'file'));
   if(method==='GET'&&action==='download')return streamFile(res,repo.requireActive(user.sub,id,'file'));
   if(method==='POST'&&action==='rename'){const b=await readJson(req);return response(res,200,{item:repo.rename(user.sub,id,b.name)});}
   if(method==='POST'&&action==='move'){const b=await readJson(req);return response(res,200,{item:repo.move(user.sub,id,normId(b.parent))});}
   if(method==='POST'&&action==='trash'){repo.trash(user.sub,id);return response(res,200,{ok:true});}
   if(method==='POST'&&action==='restore'){repo.restore(user.sub,id);return response(res,200,{ok:true});}
   if(method==='POST'&&action==='purge'){const keys=repo.purge(user.sub,id);for(const key of keys)try{fs.rmSync(filePath(key),{force:true});}catch(e){console.error('Physical purge pending:',key,e.message);}return response(res,200,{ok:true});}
  }
  if(method==='POST'&&p==='/api/shares/public'){
   const b=await readJson(req),id=normId(b.id),days=Number(b.days??7),max=Number(b.maxDownloads??0),password=b.password||'';
   if(!id||!Number.isInteger(days)||days<1||days>365||!Number.isInteger(max)||max<0||max>100000||typeof password!=='string'||password.length>128||password&&password.length<8)throw err('Invalid share settings');
   const s=repo.makePublicShare(user.sub,id,{expiresAt:Date.now()+days*86400000,maxDownloads:max,password});
   return response(res,201,{id:s.id,url:origin+'/s/'+s.token,notice:'Save this URL. Secret share token is shown only once.'});
  }
  if(method==='GET'&&p==='/api/shares/public')return response(res,200,{shares:repo.publicShares(user.sub)});
  const revoke=p.match(/^\/api\/shares\/public\/([a-f0-9-]{36})\/revoke$/);
  if(method==='POST'&&revoke){if(!repo.revokePublic(user.sub,revoke[1]))throw err('Share not found',404);return response(res,200,{ok:true});}
  if(method==='POST'&&p==='/api/shares/users'){const b=await readJson(req);return response(res,201,{id:repo.makeUserShare(user.sub,normId(b.id),String(b.email||''))});}
  if(method==='GET'&&p==='/api/shares/users')return response(res,200,{shares:repo.myShares(user.sub)});
  if(method==='GET'&&p==='/api/shared')return response(res,200,{shares:repo.sharedWith(user.email)});
  const shared=p.match(/^\/api\/shared\/([a-f0-9-]{36})(?:\/(download|preview)\/([a-f0-9-]{36}))?$/);
  if((method==='GET'||method==='HEAD'&&shared?.[2]==='preview')&&shared){const share=repo.getIncoming(user.email,shared[1]);if(!share)throw err('Share unavailable',404);
   if(shared[3]){const node=repo.db.prepare('SELECT * FROM nodes WHERE id=?').get(shared[3]);if(!node||!repo.isDescendant(share.node,node.id)||node.kind!=='file'||!node.storage_key||node.trashed_at)throw err('File unavailable',404);return shared[2]==='preview'?streamPreview(req,res,node):streamFile(res,node,node.name);}
   const folder=normId(u.searchParams.get('folder'));return response(res,200,{item:{id:share.node.id,name:share.node.name,kind:share.node.kind},children:share.node.kind==='folder'?repo.sharedChildren(share,folder):[]});
  }
  const shareRevoke=p.match(/^\/api\/shares\/users\/([a-f0-9-]{36})\/revoke$/);
  if(method==='POST'&&shareRevoke){if(!repo.revokeUserShare(user.sub,shareRevoke[1]))throw err('Share unavailable',404);return response(res,200,{ok:true});}
  if(p.startsWith('/api/admin/')){
   needAdmin(req);limit(req,'admin',100,60000);
   if(method==='GET'&&p==='/api/admin/users')return response(res,200,{users:repo.users().map(a=>({...a,quotaBytes:a.quota_override??repo.quota(a.sub)})),defaultQuotaBytes:Number(repo.db.prepare("SELECT v FROM settings WHERE k='default_quota_bytes'").get().v)});
   if(method==='GET'&&p==='/api/admin/logs')return response(res,200,{logs:repo.logs()});
   if(method==='POST'&&p==='/api/admin/default-quota'){const b=await readJson(req),mb=Number(b.mb);repo.setDefaultQuota(mb*MB);repo.audit(user.sub,'admin.quota.default',null,String(mb));return response(res,200,{ok:true});}
   const a=p.match(/^\/api\/admin\/users\/([a-f0-9-]{36})\/(quota|blocked)$/);
   if(method==='POST'&&a){const b=await readJson(req);if(a[2]==='quota'){if(b.mb===null)repo.clearQuota(a[1]);else repo.setQuota(a[1],Number(b.mb)*MB);}else{if(a[1]===user.sub&&b.blocked)throw err('Cannot block your own administrator account');repo.setBlocked(a[1],!!b.blocked);}repo.audit(user.sub,'admin.user.'+a[2],null,a[1]);return response(res,200,{ok:true});}
  }
  throw err('Endpoint unavailable',404);
 }
 if(['GET','HEAD'].includes(method)&&(p==='/'||p==='/index.html'||p==='/app.js'||p==='/app.css'||p==='/favicon.svg'))return serveAsset(res,p);
 throw err('Not found',404);
}
const server=http.createServer(async(req,res)=>{try{await handle(req,res);}catch(e){if(res.headersSent)return res.destroy();const status=Number.isInteger(e.status)&&e.status>=400&&e.status<600?e.status:500;if(status===500)console.error('Files error:',e.stack||e.message);response(res,status,{error:status===500?'Internal server error':e.message});}});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)||process.env.RUN_SERVER==='true')server.listen(config.port,config.host,()=>console.log(`Febro Files listening on ${config.host}:${config.port}`));
export {server,config,repo};
