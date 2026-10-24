// Minimal registered-client OpenID Connect Authorization Code + PKCE provider.
// Provides a migration bridge for existing Node.js projects. No dynamic client registration.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, randomBytes, timingSafeEqual } from 'node:crypto';

export const sha256b64 = x => createHash('sha256').update(x).digest('base64url');
const fail = (status, msg) => Object.assign(new Error(msg),{status});
const base64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
const clean = s => typeof s==='string' ? s : '';
// Existing versioned registrations share the application's access policy.
const clientApp = id => /^febro-(lamariva|itinerary|voltlab|files|play)(?:-v2)?$/.exec(String(id))?.[1]||String(id||'').replace(/^febro-/,'');
export function initOidc(db, dataDir, issuer='https://auth.febro.id', {logoutVerified=false}={}) {
  db.exec(`CREATE TABLE IF NOT EXISTS oidc_codes (
    hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL, challenge TEXT NOT NULL, nonce TEXT,
    expires_at INTEGER NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_oidc_exp ON oidc_codes(expires_at);`);
  if(!db.prepare('PRAGMA table_info(oidc_codes)').all().some(c=>c.name==='auth_time'))db.exec('ALTER TABLE oidc_codes ADD COLUMN auth_time INTEGER');
  db.exec('CREATE TABLE IF NOT EXISTS oidc_actions(hash TEXT PRIMARY KEY, binding TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL)');
  fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
  const keyFile=path.join(dataDir,'oidc-private.pem');
  if(!fs.existsSync(keyFile)) {
    const pair=generateKeyPairSync('rsa',{modulusLength:3072,publicExponent:65537,
      privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
    fs.writeFileSync(keyFile,pair.privateKey,{flag:'wx',mode:0o600});
  }
  fs.chmodSync(keyFile,0o600);
  const privateKey=createPrivateKey(fs.readFileSync(keyFile));
  const jwk=createPublicKey(privateKey).export({format:'jwk'});
  const kid=sha256b64(jwk.n).slice(0,20);
  const clientsFile=path.join(dataDir,'oidc-clients.json');
  const clients=()=>{
    if(!fs.existsSync(clientsFile))return [];
    const doc=JSON.parse(fs.readFileSync(clientsFile,'utf8'));
    return Array.isArray(doc)?doc:[];
  };
  const client=(id,uri)=> {
    const row=clients().find(c=>c.client_id===id && Array.isArray(c.redirect_uris) && c.redirect_uris.includes(uri));
    if(!row)throw fail(400,'Unknown OIDC client or unregistered redirect URI');
    const target=new URL(uri);
    if(target.protocol!=='https:' || target.username || target.password || target.hash)throw fail(400,'Invalid redirect URI');
    return row;
  };
  const issuerUrl=issuer.replace(/\/$/,'');
  function jwt(claims,seconds=300){
    const ts=Math.floor(Date.now()/1000);
    const header=base64({typ:'JWT',alg:'RS256',kid});
    const body=base64({iss:issuerUrl,iat:ts,exp:ts+seconds,...claims});
    const input=header+'.'+body;
    return input+'.'+sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
  }
  function verifyToken(token){
    if(typeof token!=='string'||token.length>8192)throw fail(401,'Invalid bearer token');
    const parts=token.split('.');if(parts.length!==3)throw fail(401,'Invalid token format');
    let head,body;
    try{head=JSON.parse(Buffer.from(parts[0],'base64url'));body=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{throw fail(401,'Invalid token');}
    if(head.alg!=='RS256'||head.kid!==kid||body.iss!==issuerUrl||body.exp<=Date.now()/1000||body.iat>Date.now()/1000+30||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey(privateKey),Buffer.from(parts[2],'base64url')))throw fail(401,'Invalid signature or expired token');
    return body;
  }
  function authorize(q,user,{reauthenticated=false}={}){
    const {client_id,redirect_uri,response_type,scope,code_challenge,code_challenge_method,state,nonce}=q;
    client(client_id,redirect_uri);
    if(response_type!=='code'||!scope?.split(/\s+/).includes('openid')||code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(clean(code_challenge))||!/^[A-Za-z0-9_-]{16,256}$/.test(clean(state))||!/^[A-Za-z0-9_.~-]{16,256}$/.test(clean(nonce)))throw fail(400,'Invalid OIDC authorization request');
    const prompts=clean(q.prompt).split(/\s+/).filter(Boolean);
    if(prompts.some(p=>!['login','none','consent','select_account'].includes(p))||(prompts.includes('none')&&prompts.length>1)||q.max_age!==undefined&&!/^(0|[1-9][0-9]{0,9})$/.test(clean(q.max_age)))throw fail(400,'Invalid prompt or max_age');
    if(!user?.email_verified)throw fail(401,'login_required');
    const ts=Math.floor(Date.now()/1000),at=user?.auth_time;
    const known=Number.isSafeInteger(at)&&at>0&&at<=ts;
    const stale=q.max_age!==undefined&&(!known||(Number(q.max_age)===0?!reauthenticated:ts-at>Number(q.max_age)));
    if((prompts.includes('login')&&!reauthenticated)||stale)throw fail(401,'login_required');
    if(!user?.email_verified||user?.disabled)throw fail(403,'Verified active email required for single sign-on');
    const app=clientApp(client_id);
    const grant=db.prepare('SELECT enabled FROM sso_user_apps WHERE user_id=? AND app=?').get(user.id,app);
    if(grant?.enabled===0)throw fail(403,'Application access revoked');
    const code=randomBytes(40).toString('base64url');
    db.prepare('INSERT INTO oidc_codes(hash,client_id,user_id,redirect_uri,challenge,nonce,expires_at,auth_time) VALUES (?,?,?,?,?,?,?,?)').run(sha256b64(code),client_id,user.id,redirect_uri,code_challenge,nonce,Date.now()+60000,known?at:null);
    const redirect=new URL(redirect_uri);redirect.searchParams.set('code',code);redirect.searchParams.set('state',state);
    return redirect.toString();
  }
  function token(grant){
    const {grant_type,code,client_id,client_secret,redirect_uri,code_verifier}=grant;
    if(grant_type!=='authorization_code'||!code||!/^[A-Za-z0-9_-]{43,128}$/.test(clean(code_verifier)))throw fail(400,'Invalid token request');
    const c=client(client_id,redirect_uri);
    if(!c.client_secret||typeof client_secret!=='string')throw fail(401,'Client authentication required');
    const a=Buffer.from(sha256b64(client_secret));const b=Buffer.from(sha256b64(c.client_secret));
    if(a.length!==b.length||!timingSafeEqual(a,b))throw fail(401,'Invalid client credentials');
    const row=db.prepare('SELECT * FROM oidc_codes WHERE hash=?').get(sha256b64(code));
    // Burn the code on first exchange attempt, including invalid verifier attempts.
    db.prepare('DELETE FROM oidc_codes WHERE hash=?').run(sha256b64(code));
    if(!row||row.expires_at<Date.now()||row.client_id!==client_id||row.redirect_uri!==redirect_uri||sha256b64(code_verifier)!==row.challenge)throw fail(401,'Authorization code invalid or already consumed');
    const user=db.prepare('SELECT * FROM users WHERE id=?').get(row.user_id);
    if(!user?.email_verified||user.disabled)throw fail(401,'User account inactive');
    const app=clientApp(client_id);
    if(db.prepare('SELECT enabled FROM sso_user_apps WHERE user_id=? AND app=?').get(user.id,app)?.enabled===0)throw fail(403,'Application access revoked');
    return {token_type:'Bearer',expires_in:300,
      id_token:jwt({sub:user.id,aud:client_id,nonce:row.nonce,...(row.auth_time?{auth_time:row.auth_time}:{}),email:user.email,email_verified:true,name:user.name,token_use:'id'},300),
      access_token:jwt({sub:user.id,aud:client_id,scope:'openid email profile',token_use:'access'},300)};
  }
  function userinfo(tokenValue){
    const t=verifyToken(tokenValue);
    if(t.token_use!=='access')throw fail(401,'Not an access token');
    const u=db.prepare('SELECT * FROM users WHERE id=?').get(t.sub);
    if(!u?.email_verified||u.disabled)throw fail(401,'Account unavailable');
    const app=clientApp(t.aud);
    if(db.prepare('SELECT enabled FROM sso_user_apps WHERE user_id=? AND app=?').get(u.id,app)?.enabled===0)throw fail(403,'Application access revoked');
    return {sub:u.id,email:u.email,email_verified:true,name:u.name};
  }
  function saveAction(kind,binding,payload){
    const value=randomBytes(32).toString('base64url');
    db.prepare('DELETE FROM oidc_actions WHERE expires<?').run(Date.now());
    db.prepare('INSERT INTO oidc_actions VALUES(?,?,?,?,?)').run(sha256b64(value),sha256b64(binding),kind,JSON.stringify(payload),Date.now()+300000);return value;
  }
  function takeAction(kind,binding,value){
    const row=db.prepare('DELETE FROM oidc_actions WHERE hash=? AND binding=? AND kind=? RETURNING *').get(sha256b64(clean(value)),sha256b64(binding),kind);
    if(!row||row.expires<Date.now())throw fail(403,'Invalid or expired browser action');return JSON.parse(row.payload);
  }
  function logoutTarget(q){
    const c=clients().find(c=>c.client_id===q.client_id);
    if(!c||!c.post_logout_redirect_uris?.includes(q.post_logout_redirect_uri))throw fail(400,'Unregistered logout redirect');
    const target=new URL(q.post_logout_redirect_uri);
    if(target.protocol!=='https:'||target.username||target.password||target.hash)throw fail(400,'Invalid logout redirect');
    if(q.state!==undefined){if(typeof q.state!=='string'||q.state.length>512)throw fail(400,'Invalid logout state');target.searchParams.set('state',q.state);}
    return target.href;
  }
  return {
    saveAction,takeAction,logoutTarget,
    authorize,token,userinfo,verifyToken,
    jwks:()=>({keys:[{...jwk,use:'sig',alg:'RS256',kid}]}),
    discovery:()=>({issuer:issuerUrl,authorization_endpoint:issuerUrl+'/oauth/authorize',token_endpoint:issuerUrl+'/oauth/token',userinfo_endpoint:issuerUrl+'/oauth/userinfo',jwks_uri:issuerUrl+'/oauth/jwks',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],scopes_supported:['openid','profile','email'],...(logoutVerified?{end_session_endpoint:issuerUrl+'/oauth/logout'}:{}),claims_supported:['auth_time','sub','email','email_verified','name','nonce'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['client_secret_post']})
  };
}
