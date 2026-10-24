import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'febro-phase6-sessions-'));
process.env.NODE_ENV='test';process.env.DATA_DIR=dir;process.env.APP_SECRET='synthetic-test-secret-'.repeat(4);
const {server,store,config}=await import('../src/server.mjs');
const {hashPassword}=await import('../src/auth.mjs');
function request(port,method,cookie,origin='https://eco.febro.id',body={},route='/profile/v1/account/sessions'){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers:{Host:'eco.febro.id',Cookie:cookie,Origin:origin,'Content-Type':'application/json'}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));});req.on('error',reject);req.end(method==='POST'?JSON.stringify(body):undefined);});}
test('account sessions: authenticated ownership, no secret disclosure, CSRF and revoke others preserve current and other users',async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 try{
  const a=store.createUser({email:'a@fixture.invalid',name:'A',verified:true,passwordHash:hashPassword('synthetic-correct-password')}),b=store.createUser({email:'b@fixture.invalid',name:'B',verified:true});
  for(const [token,id]of [['current',a.id],['other',a.id],['unrelated',b.id]])store.saveSession(token,id);
  store.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('expired',a.id,1);
  assert.equal((await request(port,'GET','')).status,401);
  const result=await request(port,'GET','fb_session_dev=current');assert.equal(result.status,200);assert.equal(result.body.sessions.length,2);assert.equal(result.body.sessions.filter(s=>s.current).length,1);
  for(const session of result.body.sessions)assert.deepEqual(Object.keys(session).sort(),['current','expiresAt']);
  assert.equal((await request(port,'POST','fb_session_dev=current','https://evil.invalid',{action:'revoke-others'})).status,403);assert.ok(store.sessionUser('other'));
  assert.equal((await request(port,'POST','fb_session_dev=current','https://eco.febro.id',{action:'unknown'})).status,400);
  const prefs='/profile/v1/account/preferences',apps='/profile/v1/account/applications',same='https://eco.febro.id';
  assert.equal((await request(port,'GET','',same,{},prefs)).status,401);
  assert.equal((await request(port,'POST','fb_session_dev=current',same,{theme:'invalid'},prefs)).status,400);
  assert.equal((await request(port,'POST','fb_session_dev=current',same,{theme:'dark'},prefs)).status,200);
  assert.equal((await request(port,'GET','fb_session_dev=current',same,{},prefs)).body.preferences.theme,'dark');
  assert.equal((await request(port,'GET','fb_session_dev=unrelated',same,{},prefs)).body.preferences.theme,'system');
  const applications=await request(port,'GET','fb_session_dev=current',same,{},apps);assert.equal(applications.body.applications.length,5);assert.ok(applications.body.applications.every(a=>a.url.startsWith('https://')));
  Object.assign(config,{googleClientId:'synthetic.apps.googleusercontent.com',googleClientSecret:'synthetic-only',googleRedirectUri:'https://eco.febro.id/profile/auth/google/callback'});
  const origin='https://eco.febro.id',cookie='fb_session_dev=current',reauth='/profile/v1/account/reauthenticate',link='/profile/auth/google/start?link=1';
  assert.equal((await request(port,'GET',cookie,origin,{},link)).status,403);
  assert.equal((await request(port,'POST',cookie,'https://evil.invalid',{password:'synthetic-correct-password'},reauth)).status,403);
  assert.equal((await request(port,'POST',cookie,origin,{password:'incorrect'},reauth)).status,401);
  assert.equal((await request(port,'POST',cookie,origin,{password:'synthetic-correct-password'},reauth)).status,200);
  assert.ok(store.recentlyAuthenticated('current'));assert.equal(store.recentlyAuthenticated('other'),false);
  store.db.prepare('UPDATE session_authentication SET authenticated_at=?').run(Date.now()-300001);assert.equal(store.recentlyAuthenticated('current'),false);
  const revoke=await request(port,'POST','fb_session_dev=current','https://eco.febro.id',{action:'revoke-others'});assert.equal(revoke.status,200);assert.ok(store.sessionUser('current'));assert.equal(store.sessionUser('other'),undefined);assert.ok(store.sessionUser('unrelated'));
  assert.equal((await request(port,'POST','fb_session_dev=current','https://eco.febro.id',{action:'revoke-others'})).body.revoked,0);
 }finally{await new Promise(r=>server.close(r));store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
