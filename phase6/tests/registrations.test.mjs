import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {registrations,expectedRegistration,validateRegistrations} from '../runtime/registrations.mjs';
import {initControlPlane} from '../src/central/src/control-plane.mjs';
const clients=()=>Object.keys(registrations).map(app=>{const r=expectedRegistration(app);return {client_id:r.client_id,client_secret:app.padEnd(48,'x'),redirect_uris:[r.callback],post_logout_redirect_uris:[r.logout],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'client_secret_basic'};});
test('production registry rejects wrong issuer-era IDs, callbacks, logout targets, duplicates and shared secrets',()=>{
 assert.equal(validateRegistrations(clients()).length,5);
 for(const change of [c=>c.pop(),c=>c[0].client_id='febro-lamariva',c=>c[0].redirect_uris=['https://attacker.invalid/callback'],c=>c[0].redirect_uris.push('https://cv.febro.id/extra'),c=>c[0].post_logout_redirect_uris=[],c=>c[0].token_endpoint_auth_method='none',c=>c[0].client_secret=c[1].client_secret,c=>c[0]=c[1]]){const c=clients();change(c);assert.throws(()=>validateRegistrations(c));}
});
test('Control Center reads v2 provider registrations for all five adapters and fails closed without altering permissions',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'febro-registration-')),db=new DatabaseSync(':memory:');
 const before={enabled:process.env.FEBRO_PROVIDER_ENABLED,dir:process.env.FEBRO_PROVIDER_DATA_DIR};
 try{
 db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,email_verified INTEGER,disabled INTEGER); INSERT INTO users VALUES(\'original\',1,0)');
 process.env.FEBRO_PROVIDER_ENABLED='true';process.env.FEBRO_PROVIDER_DATA_DIR=dir;
 const control=initControlPlane(db,dir),write=c=>fs.writeFileSync(path.join(dir,'configuration.json'),JSON.stringify({clients:c}),{mode:0o600});
 write(clients());for(const app of Object.keys(registrations)){assert.equal(control.appList().find(a=>a.id===app).integrated,true,app);assert.equal(control.isEnabled('original',app),true);}
 const c=clients();c.find(c=>c.client_id==='febro-itinerary-v2').redirect_uris=['https://itinerary.febro.id/wrong'];write(c);assert.equal(control.appList().find(a=>a.id==='itinerary').integrated,false);
 fs.unlinkSync(path.join(dir,'configuration.json'));for(const app of Object.keys(registrations)){assert.equal(control.appList().find(a=>a.id===app).integrated,false);assert.equal(control.isEnabled('original',app),true);}
 assert.equal(db.prepare('SELECT count(*) n FROM sso_user_apps').get().n,0);
 }finally{for(const [key,value]of [['FEBRO_PROVIDER_ENABLED',before.enabled],['FEBRO_PROVIDER_DATA_DIR',before.dir]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
