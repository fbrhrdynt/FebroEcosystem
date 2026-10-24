import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync,randomBytes,createHash} from 'node:crypto';
import {createProvider} from '../runtime/provider/provider.mjs';
import {interactions} from '../runtime/provider/interactions.mjs';
import {mountedProvider} from '../runtime/provider/mount.mjs';
import {httpGuard} from '../runtime/provider/http-guard.mjs';
const random=()=>randomBytes(48).toString('base64url');
test('path issuer interaction requires real central session, consent and origin-bound CSRF',async t=>{
 const db=new DatabaseSync(':memory:');const key=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'jwk'});Object.assign(key,{kid:'test',use:'sig',alg:'RS256'});
 let provider,handle,mounted,active=true,permitted=true;
 const user={id:'synthetic-owner',name:'Synthetic',email:'test@example.invalid',email_verified:true};
 const server=http.createServer(async(req,res)=>{try{if(await handle(req,res))return;mounted(req,res);}catch{res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();db.close();});
 const origin=`http://127.0.0.1:${server.address().port}`,issuer=origin+'/profile';
 provider=createProvider({issuer,db,jwks:{keys:[key]},cookieKeys:[random()],testOnly:true,clients:[{client_id:'test',client_secret:random(),redirect_uris:['https://app.invalid/cb'],grant_types:['authorization_code'],response_types:['code'],token_endpoint_auth_method:'client_secret_basic'}],findIdentity:async()=>user,allowApp:async()=>permitted});
 mounted=mountedProvider(provider,issuer);
 handle=interactions({provider,issuer,db,authenticate:async()=>active?user:undefined,allowApp:async()=>permitted});
 const metadata=await(await fetch(issuer+'/.well-known/openid-configuration')).json();assert.equal(metadata.issuer,issuer);
 const jar=new Map();async function request(url,options={}){
  const response=await fetch(url,{redirect:'manual',...options,headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...options.headers}});
  for(const cookie of response.headers.getSetCookie()){const [k,...v]=cookie.split(';')[0].split('=');jar.set(k,v.join('='));}return response;
 }
 const url=new URL(metadata.authorization_endpoint);url.search=new URLSearchParams({client_id:'test',redirect_uri:'https://app.invalid/cb',response_type:'code',scope:'openid email profile',state:random(),nonce:random(),code_challenge:createHash('sha256').update(random()).digest('base64url'),code_challenge_method:'S256'});
 let response=await request(url);assert.equal(response.status,303);let location=new URL(response.headers.get('location'),origin);
 active=false;response=await request(location);assert.equal(response.status,303);assert.ok(response.headers.get('location').startsWith(issuer+'/?reauth=1&next='));active=true;
 response=await request(location);assert.equal(response.status,200);let html=await response.text();let csrf=html.match(/name="csrf" value="([^"]+)"/)[1];
 response=await request(location,{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf,action:'continue'})});assert.equal(response.status,400);
 response=await request(location,{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:'wrong',action:'continue'})});assert.equal(response.status,400);
 // Re-render yields a fresh one-use token after a failed CSRF request.
 response=await request(location);html=await response.text();csrf=html.match(/name="csrf" value="([^"]+)"/)[1];
 response=await request(location,{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf,action:'continue'})});assert.equal(response.status,303);
 // Follow resume and consent until authorization code reaches the exact RP.
 location=new URL(response.headers.get('location'),origin);
 for(let i=0;i<8&&!location.href.startsWith('https://app.invalid/');i++){
  response=await request(location);
  if(response.status===200){html=await response.text();csrf=html.match(/name="csrf" value="([^"]+)"/)[1];response=await request(location,{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf,action:'continue'})});}
  assert.ok(response.headers.get('location'));location=new URL(response.headers.get('location'),origin);
 }
 assert.equal(location.origin,'https://app.invalid');assert.ok(location.searchParams.get('code'));
});
test('rate limiter rejects excess and expires without logging request material',()=>{
 let now=0,status;const guard=httpGuard({limit:1,period:10,now:()=>now});const req={socket:{remoteAddress:'synthetic'}};const res={setHeader(){},writeHead(code){status=code;},end(){}};
 assert.equal(guard(req,res),true);assert.equal(guard(req,res),false);assert.equal(status,429);now=10;assert.equal(guard(req,res),true);
});
test('only explicitly trusted loopback proxy can supply rate-limit client address',()=>{
 const guard=httpGuard({limit:1,trustLoopbackProxy:true});const res={setHeader(){},writeHead(){},end(){}};
 const req=(peer,ip)=>({socket:{remoteAddress:peer},headers:{'x-real-ip':ip}});
 assert.equal(guard(req('127.0.0.1','192.0.2.1'),res),true);assert.equal(guard(req('127.0.0.1','192.0.2.2'),res),true);assert.equal(guard(req('127.0.0.1','192.0.2.1'),res),false);
 assert.equal(guard(req('198.51.100.1','192.0.2.7'),res),true);assert.equal(guard(req('198.51.100.1','192.0.2.8'),res),false);
});
