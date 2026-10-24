import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync,randomBytes,createHash} from 'node:crypto';
import {createProvider} from '../provider/provider.mjs';
import {createClient,sqliteFlows} from '../adapters/client.mjs';
const random=()=>randomBytes(32).toString('base64url');

test('isolated provider discovery and real code/PKCE exchange, replay, revocation and redirect controls',async t=>{
 const db=new DatabaseSync(':memory:');
 const key=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'jwk'});Object.assign(key,{kid:'test-key',use:'sig',alg:'RS256'});
 const clientSecret=random();let provider;
 const server=http.createServer((req,res)=>{
  // Test-only synthetic login. Never mounted by the provider factory.
  if(req.url.startsWith('/interaction/')){
   (async()=>{
    const details=await provider.interactionDetails(req,res);
    if(details.prompt.name==='login')return provider.interactionFinished(req,res,{login:{accountId:'synthetic-user'}},{mergeWithLastSubmission:false});
    const grant=new provider.Grant({accountId:'synthetic-user',clientId:'test-client'});
    grant.addOIDCScope('openid email profile');const grantId=await grant.save();
    return provider.interactionFinished(req,res,{consent:{grantId}},{mergeWithLastSubmission:true});
   })().catch(()=>{res.writeHead(500);res.end();});return;
  }
  provider.callback()(req,res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>{server.closeAllConnections();server.close();db.close();});
 const issuer=`http://127.0.0.1:${server.address().port}`;
 provider=createProvider({issuer,db,jwks:{keys:[key]},cookieKeys:[random()+random()],testOnly:true,
  clients:[{client_id:'test-client',client_secret:clientSecret,redirect_uris:['https://rp.invalid/callback'],grant_types:['authorization_code'],response_types:['code'],token_endpoint_auth_method:'client_secret_basic'}],
  findIdentity:async id=>({id,email:'synthetic@example.invalid',email_verified:true,name:'Synthetic'}),allowApp:async()=>true});
 const meta=await (await fetch(issuer+'/.well-known/openid-configuration')).json();
 assert.equal(meta.issuer,issuer);assert.ok(meta.revocation_endpoint);assert.ok(meta.end_session_endpoint);assert.deepEqual(meta.code_challenge_methods_supported,['S256']);
 assert.equal((await (await fetch(meta.jwks_uri)).json()).keys[0].d,undefined);
 const rp=await createClient({issuer,clientId:'test-client',clientSecret,redirectUri:'https://rp.invalid/callback',flowStore:sqliteFlows(db),testOnly:true});
 const cookieJar=new Map();
 async function browser(url){
  for(let i=0;i<12;i++){
   if(url.startsWith('https://rp.invalid/'))return new URL(url);
   const r=await fetch(url,{redirect:'manual',headers:{cookie:[...cookieJar].map(([k,v])=>`${k}=${v}`).join('; ')}});
   for(const c of r.headers.getSetCookie()){const [name,...parts]=c.split(';')[0].split('=');cookieJar.set(name,parts.join('='));}
   if(!r.headers.get('location'))return r;
   url=new URL(r.headers.get('location'),url).href;
  }
  throw Error('Redirect loop');
 }
 const verifier=random(),nonce=random(),state=random();
 function auth(overrides={}){const u=new URL(meta.authorization_endpoint);u.search=new URLSearchParams({client_id:'test-client',redirect_uri:'https://rp.invalid/callback',response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',...overrides});return u.href;}
 const invalid=await fetch(auth({redirect_uri:'https://evil.invalid/callback'}),{redirect:'manual'});assert.equal(invalid.status,400);assert.equal(invalid.headers.get('location'),null);
 const noPkce=await browser(auth({code_challenge:'',code_challenge_method:''}));assert.ok(noPkce instanceof URL);assert.ok(noPkce.searchParams.get('error'));
 const callback=await browser(auth());assert.ok(callback instanceof URL);assert.equal(callback.searchParams.get('state'),state);assert.ok(callback.searchParams.get('code'));
 const credentials='Basic '+Buffer.from('test-client:'+clientSecret).toString('base64');
 const exchange=(code,v=verifier)=>fetch(meta.token_endpoint,{method:'POST',headers:{authorization:credentials},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:'https://rp.invalid/callback',code_verifier:v})});
 const code=callback.searchParams.get('code');const response=await exchange(code);assert.equal(response.status,200);const tokens=await response.json();
 const claims=JSON.parse(Buffer.from(tokens.id_token.split('.')[1],'base64url'));assert.equal(claims.sub,'synthetic-user');assert.equal(claims.nonce,nonce);assert.equal(claims.aud,'test-client');assert.ok(claims.exp>claims.iat);
 const userinfo=await fetch(meta.userinfo_endpoint,{headers:{authorization:'Bearer '+tokens.access_token}});assert.equal(userinfo.status,200);assert.equal((await userinfo.json()).sub,'synthetic-user');
 assert.equal((await exchange(code)).status,400);
 const revoked=await fetch(meta.revocation_endpoint,{method:'POST',headers:{authorization:credentials},body:new URLSearchParams({token:tokens.access_token,token_type_hint:'access_token'})});assert.equal(revoked.status,200);
 assert.equal((await fetch(meta.userinfo_endpoint,{headers:{authorization:'Bearer '+tokens.access_token}})).status,401);
 const rpStart=await rp.start({browserSession:'synthetic-browser',destination:'/documents/original'});
 const rpCallback=await browser(rpStart);
 const identity=await rp.callback({url:rpCallback.href,browserSession:'synthetic-browser'});
 assert.equal(identity.identity.subject,'synthetic-user');assert.equal(identity.destination,'/documents/original');assert.equal(identity.access_token,undefined);
 await assert.rejects(()=>rp.callback({url:rpCallback.href,browserSession:'synthetic-browser'}));
 const wrongBrowser=await browser(await rp.start({browserSession:'browser-a'}));
 await assert.rejects(()=>rp.callback({url:wrongBrowser.href,browserSession:'browser-b'}));
 const second=await browser(auth());assert.equal((await exchange(second.searchParams.get('code'),random())).status,400);
});
