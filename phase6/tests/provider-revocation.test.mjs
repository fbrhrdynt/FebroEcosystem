import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {sqliteAdapter} from '../runtime/provider/sqlite-adapter.mjs';import {revokeProviderAccount} from '../src/central/src/provider-revocation.mjs';
test('central logout account revocation removes provider sessions, grants and token family; preserves other accounts',async()=>{
 const db=new DatabaseSync(':memory:');const Adapter=sqliteAdapter(db);
 db.exec('CREATE TABLE fresh_auth(session_hash TEXT PRIMARY KEY,user_id TEXT,authenticated_at INTEGER);CREATE TABLE fresh_interactions(uid TEXT PRIMARY KEY,session_hash TEXT,created_at INTEGER)');
 for(const user of ['owner','other']){
  await new Adapter('Grant').upsert('grant-'+user,{accountId:user},300);
  await new Adapter('Session').upsert('session-'+user,{accountId:user},300);
  await new Adapter('RefreshToken').upsert('refresh-'+user,{grantId:'grant-'+user},300);
  await new Adapter('AccessToken').upsert('access-'+user,{accountId:user,grantId:'grant-'+user},300);
  db.prepare('INSERT INTO fresh_auth VALUES(?,?,?)').run('hash-'+user,user,Date.now());db.prepare('INSERT INTO fresh_interactions VALUES(?,?,?)').run('interaction-'+user,'hash-'+user,Date.now());
 }
 revokeProviderAccount(db,'owner');revokeProviderAccount(db,'owner');
 assert.equal(db.prepare('SELECT count(*) n FROM oidc_objects').get().n,4);
 assert.equal(await new Adapter('Session').find('session-owner'),undefined);assert.equal(await new Adapter('RefreshToken').find('refresh-owner'),undefined);assert.ok(await new Adapter('Session').find('session-other'));
 assert.deepEqual(db.prepare('SELECT user_id FROM fresh_auth').all().map(r=>r.user_id),['other']);assert.equal(db.prepare('SELECT count(*) n FROM fresh_interactions').get().n,1);db.close();
});
