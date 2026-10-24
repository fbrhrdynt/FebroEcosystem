import fs from 'node:fs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
import {createProvider} from '../sso/provider/provider.mjs';import {mountedProvider} from '../sso/provider/mount.mjs';import {interactions} from '../sso/provider/interactions.mjs';import {httpGuard} from '../sso/provider/http-guard.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
function privateJSON(file){const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077))throw Error('SSO configuration must be a private regular file');return JSON.parse(fs.readFileSync(file,'utf8'));}
export function mountFebroProvider({store,control,getUser,secure}){
 if(process.env.FEBRO_PROVIDER_ENABLED!=='true')return {handle:async()=>false,record:()=>{}};
 const deployment=process.env.FEBRO_DEPLOYMENT_ENV==='staging'?'staging':'production';
 const issuer=deployment==='staging'?process.env.FEBRO_PROVIDER_ISSUER:'https://eco.febro.id/profile',dir=process.env.FEBRO_PROVIDER_DATA_DIR;
 if(new URL(issuer).hostname!==`eco.${process.env.BASE_DOMAIN||'febro.id'}`)throw Error('Provider issuer must match central host');
 if(!dir||!path.isAbsolute(dir)||path.resolve(dir)===path.dirname(store.filename||''))throw Error('Dedicated provider directory required');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});if(fs.lstatSync(dir).isSymbolicLink()||!fs.lstatSync(dir).isDirectory()||(fs.statSync(dir).mode&0o077))throw Error('Provider directory must be private');
 const {jwks,cookieKeys,clients}=privateJSON(path.join(dir,'configuration.json'));
 const map={'febro-lamariva-v2':'lamariva','febro-itinerary-v2':'itinerary','febro-voltlab-v2':'voltlab','febro-files-v2':'files','febro-play-v2':'play'};
 for(const c of clients)if(!map[c.client_id])throw Error('Unknown client mapping');
 const db=new DatabaseSync(path.join(dir,'provider.sqlite'));fs.chmodSync(path.join(dir,'provider.sqlite'),0o600);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS fresh_auth(session_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,authenticated_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS fresh_interactions(uid TEXT PRIMARY KEY,session_hash TEXT NOT NULL,created_at INTEGER NOT NULL);');
 const session=req=>String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith((secure?'__Host-fb_session':'fb_session_dev')+'='))?.split('=')[1]||'';
 const audit=({event})=>{fs.appendFileSync(path.join(dir,'audit.jsonl'),JSON.stringify({at:new Date().toISOString(),event})+'\n',{mode:0o600});};
 const allowApp=async(id,client)=>!!map[client]&&control.isEnabled(id,map[client]);
 const provider=createProvider({issuer,deployment,db,jwks,cookieKeys,clients,findIdentity:async id=>{const u=store.getUserById(id);return u?{...u,email_verified:!!u.email_verified}:null;},allowApp,audit});
 // Only loopback Nginx may supply forwarded proto; direct public ingress is denied.
 provider.proxy=true;
 const interaction=interactions({provider,issuer,db,allowApp,audit,authenticate:async(req,{freshRequired,interactionCreatedAt,interactionUID})=>{
  let need;
  if(freshRequired){
   db.prepare('DELETE FROM fresh_interactions WHERE created_at<?').run(Date.now()-600000);
   need=db.prepare('SELECT * FROM fresh_interactions WHERE uid=?').get(interactionUID);
   if(!need){db.prepare('INSERT INTO fresh_interactions VALUES(?,?,?)').run(interactionUID,digest(session(req)),Date.now());return null;}
   if(need.session_hash===digest(session(req)))return null;
  }
  const user=getUser(req);if(!user)return null;
  const proof=db.prepare('SELECT authenticated_at FROM fresh_auth WHERE session_hash=? AND user_id=?').get(digest(session(req)),user.id);
  if(!proof||freshRequired&&proof.authenticated_at<need.created_at)return null;
  return {...user,email_verified:!!user.email_verified,authenticatedAt:proof.authenticated_at};
 }}),mount=mountedProvider(provider,issuer),guard=httpGuard({limit:120,trustLoopbackProxy:true});
 const routes=/^\/profile\/(?:\.well-known\/openid-configuration|auth(?:\/[A-Za-z0-9_-]{20,})?|token(?:\/(?:revocation|introspection))?|jwks|me|session(?:\/.*)?|interaction\/[A-Za-z0-9_-]+)$/;
 return {record(token,id){db.prepare('DELETE FROM fresh_auth WHERE authenticated_at<?').run(Date.now()-7*86400000);db.prepare('INSERT OR REPLACE INTO fresh_auth VALUES(?,?,?)').run(digest(token),id,Date.now());},async handle(req,res){
  const pathname=req.url.split('?')[0];if(!routes.test(pathname))return false;
  if(req.headers.host!==new URL(issuer).host||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers['x-forwarded-proto']!=='https'){res.writeHead(421);res.end();return true;}
  if(!guard(req,res))return true;
  if(await interaction(req,res))return true;return mount(req,res);
 }};
}
