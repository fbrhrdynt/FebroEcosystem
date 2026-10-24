import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('persistent signing keys, non-overwrite initialization, overlapping rotation, unique confidential clients',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'febro-phase4-keys-'));try{
 const run=op=>spawnSync(process.execPath,['phase6/scripts/provider-keys.mjs',op,dir],{stdio:'ignore'});assert.equal(run('init').status,0);const a=JSON.parse(fs.readFileSync(dir+'/configuration.json'));assert.equal(fs.statSync(dir+'/configuration.json').mode&0o077,0);assert.equal(run('init').status,1);assert.equal(run('rotate').status,0);const b=JSON.parse(fs.readFileSync(dir+'/configuration.json'));assert.equal(b.jwks.keys.length,2);assert.equal(b.jwks.keys[1].kid,a.jwks.keys[0].kid);assert.notEqual(b.jwks.keys[0].kid,a.jwks.keys[0].kid);assert.deepEqual(b.clients,a.clients);assert.equal(new Set(a.clients.map(c=>c.client_secret)).size,5);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
