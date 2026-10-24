import {test} from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'febro-space-access-'));
Object.assign(process.env,{NODE_ENV:'production',DATA_DIR:folder,APP_SECRET:randomBytes(64).toString('base64url')});
const {server,store}=await import('../src/server.mjs');
test('Space preserves Control Center authorization and account/icon deep links',async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const get=(route,cookie='')=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:route,headers:{Host:'eco.febro.id',Cookie:cookie}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end();});
 try{
  assert.equal((await get('/profile/console')).status,302);
  assert.equal((await get('/v1/control/users')).status,403);
  const user=store.createUser({name:'Member',email:'member@example.com',verified:true});
  const memberToken=randomBytes(48).toString('base64url');store.saveSession(memberToken,user.id);
  const memberCookie=`__Host-fb_session=${memberToken}`;
  assert.equal((await get('/profile/console',memberCookie)).status,302);
  assert.equal((await get('/v1/control/users',memberCookie)).status,403);
  assert.equal((await (await get('/v1/auth/me',memberCookie)).json()).user.id,user.id);
  const admin=store.createUser({name:'Isolated administrator',email:'febroherdyanto@outlook.com',verified:true});
  const adminToken=randomBytes(48).toString('base64url');store.saveSession(adminToken,admin.id);
  const adminCookie=`__Host-fb_session=${adminToken}`;
  assert.equal((await get('/profile/console',adminCookie)).status,200);
  for(const route of ['/v1/control/users','/v1/control/audit',`/v1/control/users/${user.id}`])assert.equal((await get(route,adminCookie)).status,200,route);
  for(const route of ['/profile','/profile/account','/profile/register','/assets/shell.js','/assets/app-icon.svg','/assets/app-icon-192.png','/assets/app-icon-512.png','/assets/apple-touch-icon.png'])assert.equal((await get(route)).status,200,route);
 }finally{await new Promise(r=>server.close(r));store.close();fs.rmSync(folder,{recursive:true,force:true});}
});
