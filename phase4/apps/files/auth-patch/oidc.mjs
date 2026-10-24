// Minimal registered-client OpenID Connect Authorization Code + PKCE provider.
// Provides a migration bridge for existing Node.js projects. No dynamic client registration.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, randomBytes, timingSafeEqual } from 'node:crypto';

export const sha256b64 = x => createHash('sha256').update(x).digest('base64url');
const fail = (status, msg) => Object.assign(new Error(msg),{status});
const base64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
const clean = s => typeof s==='string' ? s : '';
export function initOidc(db, dataDir, issuer='https://auth.febro.id') {
  db.exec(`CREATE TABLE IF NOT EXISTS oidc_codes (
    hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL, challenge TEXT NOT NULL, nonce TEXT,
    expires_at INTEGER NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_oidc_exp ON oidc_codes(expires_at);`);
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
  function authorize(q,user){
    const {client_id,redirect_uri,response_type,scope,code_challenge,code_challenge_method,state,nonce}=q;
    client(client_id,redirect_uri);
    if(response_type!=='code'||!scope?.split(/\s+/).includes('openid')||code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(clean(code_challenge))||!/^[A-Za-z0-9_-]{16,256}$/.test(clean(state))||!/^[A-Za-z0-9_.~-]{16,256}$/.test(clean(nonce)))throw fail(400,'Invalid OIDC authorization request');
    if(!user?.email_verified)throw fail(403,'Verified email required for single sign-on');
    const code=randomBytes(40).toString('base64url');
    db.prepare('INSERT INTO oidc_codes VALUES (?,?,?,?,?,?,?)').run(sha256b64(code),client_id,user.id,redirect_uri,code_challenge,nonce,Date.now()+60000);
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
    if(!user?.email_verified)throw fail(401,'User account is not verified');
    return {token_type:'Bearer',expires_in:300,
      id_token:jwt({sub:user.id,aud:client_id,nonce:row.nonce,email:user.email,email_verified:true,name:user.name,token_use:'id'},300),
      access_token:jwt({sub:user.id,aud:client_id,scope:'openid email profile',token_use:'access'},300)};
  }
  function userinfo(tokenValue){
    const t=verifyToken(tokenValue);
    if(t.token_use!=='access')throw fail(401,'Not an access token');
    const u=db.prepare('SELECT * FROM users WHERE id=?').get(t.sub);
    if(!u?.email_verified)throw fail(401,'Account unavailable');
    return {sub:u.id,email:u.email,email_verified:true,name:u.name};
  }
  return {
    authorize,token,userinfo,verifyToken,
    jwks:()=>({keys:[{...jwk,use:'sig',alg:'RS256',kid}]}),
    discovery:()=>({issuer:issuerUrl,authorization_endpoint:issuerUrl+'/oauth/authorize',token_endpoint:issuerUrl+'/oauth/token',userinfo_endpoint:issuerUrl+'/oauth/userinfo',jwks_uri:issuerUrl+'/oauth/jwks',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],scopes_supported:['openid','profile','email'],claims_supported:['sub','email','email_verified','name','nonce'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['client_secret_post']})
  };
}
