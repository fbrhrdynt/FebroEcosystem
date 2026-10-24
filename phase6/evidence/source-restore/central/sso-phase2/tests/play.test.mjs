import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {playIdentities} from '../adapters/play-identities.mjs';
test('Play authentication retains guests, original player IDs and every historical score',()=>{
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE players(id TEXT PRIMARY KEY,nickname TEXT NOT NULL,created_ms INTEGER NOT NULL,name_set INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE runs(id TEXT PRIMARY KEY,player_id TEXT REFERENCES players(id),score INTEGER);
 INSERT INTO players VALUES('guest-a','Guest A',1,1),('guest-b','Guest B',1,1);
 INSERT INTO runs VALUES('old-a','guest-a',10),('old-b','guest-b',20);`);
 const snapshot=JSON.stringify(db.prepare('SELECT * FROM runs ORDER BY id').all());let now=1000;const repo=playIdentities(db,()=>now);
 assert.equal(repo.player(undefined),undefined);
 const first=repo.login({issuer:'https://eco.febro.id/profile',subject:'identity-a',guestPlayerId:'guest-a',claimGuest:true});assert.equal(first.playerId,'guest-a');assert.equal(repo.player(first.session),'guest-a');
 const next=repo.login({issuer:'https://eco.febro.id/profile',subject:'identity-a',guestPlayerId:'guest-b',claimGuest:true});assert.equal(next.playerId,'guest-a');
 assert.throws(()=>repo.login({issuer:'https://eco.febro.id/profile',subject:'different-identity',guestPlayerId:'guest-a',claimGuest:true}));
 assert.equal(JSON.stringify(db.prepare('SELECT * FROM runs ORDER BY id').all()),snapshot);
 const fresh=repo.login({issuer:'https://eco.febro.id/profile',subject:'identity-new'});assert.notEqual(fresh.playerId,'guest-a');assert.notEqual(fresh.playerId,'guest-b');
 repo.logout(first.session);assert.equal(repo.player(first.session),undefined);now+=8*3600000;assert.equal(repo.player(next.session),undefined);db.close();
});
