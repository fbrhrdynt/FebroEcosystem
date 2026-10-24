import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createRequire} from 'node:module';
import {repository,sqliteConnection,migration} from '../runtime/repository.mjs';
const require=createRequire('/opt/lamariva/package.json');const {PGlite}=require('@electric-sql/pglite');
for(const app of ['lamariva','itinerary','voltlab','files','play'])test(app+': idempotent additive migrations, exact subject mapping, conflicts, ownership and permission preservation',async()=>{
 let db,conn;const ida=app==='voltlab'?'11111111-1111-4111-8111-111111111111':app==='itinerary'?'1':'original-a',idb=app==='voltlab'?'22222222-2222-4222-8222-222222222222':app==='itinerary'?'2':'original-b';
 if(['files','play'].includes(app)){db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');conn=sqliteConnection(db);await conn.query(app==='files'?'CREATE TABLE accounts(sub TEXT PRIMARY KEY,blocked INTEGER DEFAULT 0,role TEXT)':'CREATE TABLE players(id TEXT PRIMARY KEY,role TEXT)');}
 else{db=new PGlite();await db.waitReady;conn={query:(...a)=>db.query(...a),transaction:fn=>db.transaction(c=>fn(c))};await db.exec(app==='lamariva'?'CREATE TABLE "user"(id TEXT PRIMARY KEY,suspended BOOLEAN DEFAULT false,role TEXT)':`CREATE TABLE users(id ${app==='itinerary'?'bigint':'uuid'} PRIMARY KEY,status TEXT DEFAULT 'active',role TEXT)`);}
 const table=app==='lamariva'?'"user"':app==='files'?'accounts':app==='play'?'players':'users',id=app==='files'?'sub':'id';
 await conn.query(`INSERT INTO ${table}(${id},role) VALUES($1,'Administrator'),($2,'User')`,[ida,idb]);
 await conn.query(`CREATE TABLE owned_content(id TEXT PRIMARY KEY,owner ${app==='voltlab'?'uuid':app==='itinerary'?'bigint':'TEXT'} REFERENCES ${table}(${id}),payload TEXT)`);await conn.query("INSERT INTO owned_content VALUES('asset-a',$1,'private A'),('asset-b',$2,'private B')",[ida,idb]);
 const repo=repository(conn,app);await repo.migrate();await repo.migrate();assert.equal(await repo.resolve('https://eco.febro.id/profile','central-a'),undefined);
 await repo.link({issuer:'https://eco.febro.id/profile',subject:'central-a',localId:ida});const u=await repo.resolve('https://eco.febro.id/profile','central-a');assert.equal(String(u[id]),ida);assert.equal(u.role,'Administrator');assert.equal(await repo.resolve('https://auth.febro.id','central-a'),undefined);
 await assert.rejects(()=>repo.link({issuer:'https://eco.febro.id/profile',subject:'central-a',localId:idb}));await assert.rejects(()=>repo.link({issuer:'https://eco.febro.id/profile',subject:'different',localId:ida}));await assert.rejects(()=>repo.link({issuer:'https://eco.febro.id/profile',subject:'missing',localId:app==='voltlab'?'33333333-3333-4333-8333-333333333333':app==='itinerary'?'99':'missing'}));
 assert.equal((await conn.query('SELECT payload FROM owned_content WHERE owner=$1',[ida])).rows[0].payload,'private A');assert.equal((await conn.query('SELECT * FROM owned_content WHERE owner=$1 AND id=$2',[idb,'asset-a'])).rows.length,0);
 await repo.save('one-use',{safe:true});assert.deepEqual(await repo.take('one-use'),{safe:true});assert.equal(await repo.take('one-use'),undefined);await repo.save('expired',{bad:true},Date.now()-1);assert.equal(await repo.take('expired'),undefined);
 if(app!=='play'){await conn.query(`UPDATE ${table} SET ${app==='lamariva'?'suspended=true':app==='files'?'blocked=1':"status='blocked'"} WHERE ${id}=$1`,[ida]);assert.equal(await repo.resolve('https://eco.febro.id/profile','central-a'),undefined);}
 await db.close();
});
