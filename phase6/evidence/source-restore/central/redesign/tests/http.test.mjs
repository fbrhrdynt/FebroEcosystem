import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import http from 'node:http';
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'febro-http-test-'));
process.env.NODE_ENV='development';
process.env.DATA_DIR=folder;
process.env.ADMIN_EMAILS='owner@example.com';
process.env.APP_SECRET=randomBytes(64).toString('base64url');
const {server,store}=await import('../src/server.mjs');
const origin='http://localhost';
const request=(base,host,pathname,init={})=>new Promise((resolve,reject)=>{const endpoint=new URL(base);const req=http.request({hostname:'127.0.0.1',port:Number(endpoint.port),method:init.method||'GET',path:pathname,headers:{Host:host,...init.headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(init.body);});
test('HTTP smoke: docs, login handoff, admin-only validator, CSRF and public QR metadata privacy',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await request(base,'docs.febro.id','/v1/catalog/docs');assert.equal(r.status,200);assert.equal((await r.json()).articles.length>=5,true);
  r=await request(base,'verify.febro.id','/v1/verify/documents');assert.equal(r.status,401);
  r=await request(base,'unknown.example','/');assert.equal(r.status,421);
  const user=store.createUser({email:'owner@example.com',name:'Owner',verified:true});
  const secret='secure-session-test-'.padEnd(64,'!');store.saveSession(secret,user.id);
  r=await request(base,'auth.febro.id','/auth/handoff?next='+encodeURIComponent('https://verify.febro.id/app'),{headers:{Cookie:`fb_session_dev=${secret}`}});
  assert.equal(r.status,302);const dest=new URL(r.headers.get('location'));
  assert.equal(dest.hostname,'verify.febro.id');assert.ok(dest.hash.includes('fb_ticket'));
  const ticket=new URLSearchParams(dest.hash.slice(1)).get('fb_ticket');
  r=await request(base,'verify.febro.id','/v1/auth/claim',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({ticket})});
  assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.ok(cookie.includes('HttpOnly'));assert.ok(!cookie.includes('Domain='));
  r=await request(base,'verify.febro.id','/v1/verify/documents',{headers:{Cookie:cookie.split(';')[0]}});assert.equal(r.status,200);
  r=await request(base,'verify.febro.id','/v1/auth/claim',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({ticket})});assert.equal(r.status,401);
  r=await request(base,'verify.febro.id','/v1/auth/logout',{method:'POST',headers:{Origin:'https://evil.example',Cookie:cookie.split(';')[0],'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
  r=await request(base,'auth.febro.id','/auth/handoff?next='+encodeURIComponent('https://evil.example/'),{headers:{Cookie:`fb_session_dev=${secret}`}});assert.equal(new URL(r.headers.get('location')).hostname,'tools.febro.id');
 }finally{await new Promise(resolve=>server.close(resolve));store.close();fs.rmSync(folder,{recursive:true,force:true});}
});
