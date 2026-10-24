import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';
import {createStore} from '../src/store.mjs';import {initOidc,sha256b64} from '../src/oidc.mjs';import {initControlPlane} from '../src/control-plane.mjs';
test('genuine authentication time, max_age, prompt, code binding, logout allowlist and browser action replay',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'febro-fix-'));const store=createStore(dir);initControlPlane(store.db,dir);
 try{const user=store.createUser({email:'synthetic@example.invalid',name:'Synthetic',verified:true});store.saveSession('legacy',user.id);assert.equal(store.sessionUser('legacy').auth_time,null);
 const at=Math.floor(Date.now()/1000)-120;store.saveSession('password',user.id,at);assert.equal(store.sessionUser('password').auth_time,at);
 const c={client_id:'synthetic',client_secret:randomBytes(32).toString('hex'),redirect_uris:['https://rp.invalid/callback'],post_logout_redirect_uris:['https://rp.invalid/logout']};fs.writeFileSync(path.join(dir,'oidc-clients.json'),JSON.stringify([c]),{mode:0o600});
 const op=initOidc(store.db,dir);assert.equal(op.discovery().end_session_endpoint,undefined);
 const verifier=randomBytes(32).toString('base64url'),q={client_id:c.client_id,redirect_uri:c.redirect_uris[0],response_type:'code',scope:'openid',code_challenge:sha256b64(verifier),code_challenge_method:'S256',state:randomBytes(24).toString('base64url'),nonce:randomBytes(24).toString('base64url')};
 const exchange=url=>op.token({grant_type:'authorization_code',client_id:c.client_id,client_secret:c.client_secret,redirect_uri:q.redirect_uri,code:new URL(url).searchParams.get('code'),code_verifier:verifier});
 let tokens=exchange(op.authorize(q,store.sessionUser('legacy')));assert.equal(op.verifyToken(tokens.id_token).auth_time,undefined);
 tokens=exchange(op.authorize(q,store.sessionUser('password')));assert.equal(op.verifyToken(tokens.id_token).auth_time,at);
 for(const request of [{...q,prompt:'login'},{...q,max_age:'0'},{...q,max_age:'60'}])assert.throws(()=>op.authorize(request,store.sessionUser('password')),/login_required/);
 assert.throws(()=>op.authorize({...q,max_age:'300'},store.sessionUser('legacy')),/login_required/);
 assert.ok(op.authorize({...q,max_age:'300'},store.sessionUser('password')));
 for(const max_age of ['-1','1.5','NaN',''])assert.throws(()=>op.authorize({...q,max_age},user),/Invalid prompt/);
 assert.throws(()=>op.authorize({...q,prompt:'none login'},user),/Invalid prompt/);
 const now=Math.floor(Date.now()/1000);tokens=exchange(op.authorize({...q,prompt:'login',max_age:'0'},{...user,auth_time:now},{reauthenticated:true}));assert.equal(op.verifyToken(tokens.id_token).auth_time,now);
 const ticket=op.saveAction('reauth','browser-a',q);assert.throws(()=>op.takeAction('reauth','browser-b',ticket));assert.deepEqual(op.takeAction('reauth','browser-a',ticket),q);assert.throws(()=>op.takeAction('reauth','browser-a',ticket));
 assert.throws(()=>op.logoutTarget({client_id:c.client_id,post_logout_redirect_uri:c.post_logout_redirect_uris[0]+'/'}));assert.throws(()=>op.logoutTarget({client_id:'other',post_logout_redirect_uri:c.post_logout_redirect_uris[0]}));assert.equal(new URL(op.logoutTarget({client_id:c.client_id,post_logout_redirect_uri:c.post_logout_redirect_uris[0],state:'abc'})).searchParams.get('state'),'abc');
 store.endSession('password');assert.equal(store.sessionUser('password'),undefined);assert.ok(store.sessionUser('legacy'));assert.equal(store.getUserById(user.id).email,user.email);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('additive migration preserves preexisting users and sessions without inventing authentication time',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'febro-legacy-'));let store;
 try{const db=new DatabaseSync(path.join(dir,'ecosystem.sqlite'));db.exec(`CREATE TABLE sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);`);db.close();
 store=createStore(dir);const user=store.createUser({email:'legacy@example.invalid',name:'Original',verified:true});store.saveSession('original-session',user.id);const before=store.db.prepare('SELECT hash,user_id,expires_at FROM sessions').get();store.close();store=null;
 const legacy=new DatabaseSync(path.join(dir,'ecosystem.sqlite'));legacy.exec('ALTER TABLE sessions DROP COLUMN auth_time');legacy.close();store=createStore(dir);
 assert.deepEqual(store.db.prepare('SELECT hash,user_id,expires_at FROM sessions').get(),before);assert.equal(store.sessionUser('original-session').auth_time,null);assert.equal(store.sessionUser('original-session').id,user.id);assert.deepEqual(store.getUserById(user.id),user);
 }finally{store?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
