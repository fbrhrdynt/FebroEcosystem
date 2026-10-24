import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {identityLinks,safeDestination} from '../adapters/identity-links.mjs';
import {sqliteAdapter} from '../provider/sqlite-adapter.mjs';
test('explicit dual proof links original local ID; conflict, expiry, CSRF and replay rejected',()=>{
 const db=new DatabaseSync(':memory:');let now=1000000;const links=identityLinks(db,()=>now);
 const proof={localId:'original-owner',issuer:'https://eco.febro.id/profile',subject:'central-123',session:'synthetic-session',csrf:'synthetic-csrf',localAuthenticatedAt:now,centralAuthenticatedAt:now};
 assert.equal(links.resolve(proof.issuer,proof.subject),undefined);
 assert.throws(()=>links.begin({...proof,localAuthenticatedAt:0}));
 const intent=links.begin(proof);const finish={intent,session:proof.session,csrf:proof.csrf,origin:'https://app.invalid',expectedOrigin:'https://app.invalid',localId:proof.localId};
 assert.throws(()=>links.finish({...finish,origin:'https://evil.invalid'}));
 assert.throws(()=>links.finish({...finish,session:'different-browser'}));
 assert.equal(links.finish(finish),'original-owner');assert.equal(links.resolve(proof.issuer,proof.subject),'original-owner');assert.throws(()=>links.finish(finish));
 const conflicting=links.begin({...proof,localId:'different-owner'});assert.throws(()=>links.finish({...finish,intent:conflicting,localId:'different-owner'}));assert.equal(links.resolve(proof.issuer,proof.subject),'original-owner');
 const expired=links.begin({...proof,subject:'other'});now+=300001;assert.throws(()=>links.finish({...finish,intent:expired}));db.close();
});
test('safe destination rejects external, backslash, control and auth-loop targets',()=>{
 for(const value of ['//evil.invalid','/\\evil.invalid','https://evil.invalid','/login','/auth/callback','/api/auth/start','/\n/evil'])assert.equal(safeDestination(value),'/');
 assert.equal(safeDestination('/documents/123?view=edit'),'/documents/123?view=edit');
});
test('provider persistence: expiry, consume, secondary indexes, grant revocation',async()=>{
 const db=new DatabaseSync(':memory:');let now=10;const Adapter=sqliteAdapter(db,()=>now);const a=new Adapter('Session');
 await a.upsert('one',{uid:'uid',userCode:'uc',grantId:'grant'},20);assert.ok(await a.findByUid('uid'));assert.ok(await a.findByUserCode('uc'));await a.consume('one');assert.equal((await a.find('one')).consumed,10);
 await new Adapter('Session').find('one').then(r=>assert.ok(r));await a.revokeByGrantId('grant');assert.equal(await a.find('one'),undefined);
 await a.upsert('two',{},1);now=11;assert.equal(await a.find('two'),undefined);db.close();
});
