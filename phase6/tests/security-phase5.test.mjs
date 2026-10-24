import test from 'node:test';import assert from 'node:assert/strict';import net from 'node:net';import http from 'node:http';import {createRequire} from 'node:module';import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {sendMail,googleComplete} from '../src/central/src/auth.mjs';import {validateStaging,callbacks} from '../scripts/validate-staging.mjs';
const require=createRequire(new URL('../src/central/package.json',import.meta.url));
test('Nodemailer major compatibility: actual application sendMail through isolated authenticated SMTP, escaped content',async()=>{
 let body='',auth=false;const sockets=new Set();
 const server=net.createServer(s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));s.write('220 synthetic.invalid ESMTP\r\n');let buffer='',data=false,login=0;
 s.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);if(data){if(line==='.') {data=false;s.write('250 queued\r\n');}else body+=line+'\n';continue;}
 if(login){if(++login===3){auth=true;login=0;s.write('235 authenticated\r\n');}else s.write('334 UGFzc3dvcmQ6\r\n');}
 else if(/^EHLO/.test(line))s.write('250-synthetic.invalid\r\n250 AUTH PLAIN LOGIN\r\n');
 else if(/^AUTH PLAIN/.test(line)){auth=true;s.write('235 authenticated\r\n');}
 else if(/^AUTH LOGIN/.test(line)){login=1;s.write('334 VXNlcm5hbWU6\r\n');}
 else if(/^DATA/.test(line)){data=true;s.write('354 send data\r\n');}
 else if(/^QUIT/.test(line)){s.end('221 bye\r\n');}else s.write('250 ok\r\n');}});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 await sendMail({smtpHost:'127.0.0.1',smtpPort:server.address().port,smtpSecure:false,smtpUser:'fixture@example.invalid',smtpPass:'synthetic-password',smtpFrom:'fixture@example.invalid'},{to:'recipient@example.invalid',subject:'Phase5 synthetic',heading:'<script>bad</script>',text:'Synthetic',button:'Continue',url:'https://staging.example.invalid/verify'});
 assert.ok(auth);assert.match(body,/recipient@example.invalid/);assert.match(body,/&lt;script&gt;/);
 }finally{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
});
test('gaxios narrow uuid override: CJS v4 multipart boundary and HTTP request compatibility',async()=>{
 const {Gaxios}=require('gaxios');let contentType='',body='';const server=http.createServer(async(req,res)=>{contentType=req.headers['content-type'];for await(const c of req)body+=c;res.setHeader('Content-Type','application/json');res.end('{"ok":true}');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const r=await new Gaxios().request({url:`http://127.0.0.1:${server.address().port}`,method:'POST',multipart:[{headers:{'Content-Type':'text/plain'},content:'fixture-multipart'}],retry:false});assert.equal(r.data.ok,true);assert.match(contentType,/boundary=[0-9a-f-]{36}/);assert.match(body,/fixture-multipart/);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('Google verification compatibility: synthetic signature, audience, expiry and nonce rejection; no real Google claim',async()=>{
 const {OAuth2Client}=require('google-auth-library'),{privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const now=Math.floor(Date.now()/1000),verifier='synthetic-pkce-verifier',nonce=createHash('sha256').update('google-nonce:'+verifier).digest('base64url');
 const payload={iss:'https://accounts.google.com',aud:'synthetic-client',sub:'original-sub',iat:now,exp:now+300,email:'synthetic@example.invalid',email_verified:true,nonce};
 const jwt=p=>{const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'synthetic'})).toString('base64url'),b=Buffer.from(JSON.stringify(p)).toString('base64url'),v=head+'.'+b;return v+'.'+sign('RSA-SHA256',Buffer.from(v),privateKey).toString('base64url');};
 const original=OAuth2Client.prototype.getFederatedSignonCertsAsync,fetchOriginal=globalThis.fetch;
 OAuth2Client.prototype.getFederatedSignonCertsAsync=async()=>({certs:{synthetic:publicKey.export({type:'spki',format:'pem'})},format:0});
 let token=jwt(payload);globalThis.fetch=async()=>new Response(JSON.stringify({id_token:token}),{status:200});
 try{const cfg={googleClientId:'synthetic-client',googleClientSecret:'synthetic-secret',googleRedirectUri:'https://staging.example.invalid/profile/auth/google/callback'};assert.equal((await googleComplete(cfg,'synthetic-code',verifier)).sub,'original-sub');
 for(const change of [{aud:'wrong-client'},{exp:now-1000},{nonce:'wrong'}, {iss:'https://attacker.invalid'}]){token=jwt({...payload,...change});await assert.rejects(()=>googleComplete(cfg,'synthetic-code',verifier));}
 token=jwt(payload).slice(0,-8)+'aaaaaaaa';await assert.rejects(()=>googleComplete(cfg,'synthetic-code',verifier));
 }finally{OAuth2Client.prototype.getFederatedSignonCertsAsync=original;globalThis.fetch=fetchOriginal;}
});
function config(){return {deployment:'staging',authorized:true,issuer:'https://identity.staging.example.org/profile',separateSecretsConfirmed:true,google:{accepted:true,clientIdConfigured:true,secretConfigured:true,callback:'https://identity.staging.example.org/profile/auth/google/callback'},apps:Object.fromEntries(Object.entries(callbacks).map(([app,p])=>[app,{origin:`https://${app}.staging.example.org/`,callback:`https://${app}.staging.example.org${p}`,postLogout:`https://${app}.staging.example.org${app==='play'?'/api/leaderboard/auth/febro':p.slice(0,-9)}/logged-out` }]))};}
test('HTTPS staging gate rejects production callbacks, insecure origins, missing authorization/Google and callback drift',()=>{
 assert.equal(validateStaging(config()).status,'CONFIG_VALID_ONLY');
 for(const mutate of [c=>c.authorized=false,c=>c.google.accepted=false,c=>c.apps.play.callback='https://play.febro.id/api/leaderboard/auth/callback',c=>c.apps.files.origin='http://files.staging.example.org/',c=>c.issuer='https://eco.febro.id/profile',c=>c.apps.lamariva.callback+='?evil=1',c=>c.separateSecretsConfirmed=false]){const c=config();mutate(c);assert.throws(()=>validateStaging(c));}
});
test('RP refuses insecure test mode under production before discovery/network',async()=>{
 const {createClient}=await import('../runtime/adapters/client.mjs');const before=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(()=>createClient({issuer:'http://127.0.0.1:1',redirectUri:'http://127.0.0.1:2/callback',testOnly:true}),/Test mode is forbidden/);}finally{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;}
});
test('Provider rejects wildcard redirect, HTTP logout and credential-bearing logout registrations',async()=>{
 const {createProvider}=await import('../runtime/provider/provider.mjs');const key=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'jwk'});Object.assign(key,{kid:'synthetic',alg:'RS256'});
 for(const [field,value] of [['redirect_uris','https://*.example.org/callback'],['post_logout_redirect_uris','http://stage.example.org/logged-out'],['post_logout_redirect_uris','https://user:pass@stage.example.org/logged-out']]){
 const client={client_id:'synthetic',client_secret:'s'.repeat(48),redirect_uris:['https://stage.example.org/callback'],grant_types:['authorization_code'],response_types:['code'],token_endpoint_auth_method:'client_secret_basic',[field]:[value]};
 assert.throws(()=>createProvider({issuer:'https://eco.febro.id/profile',db:null,jwks:{keys:[key]},cookieKeys:['c'.repeat(64)],clients:[client]}),/Invalid redirect URI/);
 }
});
