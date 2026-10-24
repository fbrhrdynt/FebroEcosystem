import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initTelemetry} from '../src/telemetry.mjs';
const uid='12345678-1234-4234-8234-123456789abc';
test('service telemetry requires credentials, verified identity and valid event',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,email_verified INTEGER,disabled INTEGER);');
 db.prepare('INSERT INTO users VALUES(?,?,?)').run(uid,1,0);
 const secret='0123456789abcdefghijklmnopqrstuvwxyzABCDEFG';
 const prior=process.env.SPACE_TELEMETRY_KEYS;
 process.env.SPACE_TELEMETRY_KEYS=JSON.stringify({itinerary:secret});
 try{
  const telemetry=initTelemetry(db);
  const req={headers:{authorization:'Bearer '+secret}};
  assert.throws(()=>telemetry.ingest({headers:{}},{userId:uid,type:'login'}),{status:401});
  assert.throws(()=>telemetry.ingest(req,{userId:'bad',type:'login'}),{status:400});
  assert.equal(telemetry.ingest(req,{userId:uid,type:'login'}).ok,true);
  assert.equal(telemetry.ingest(req,{userId:uid,type:'heartbeat'}).ok,true);
  assert.equal(telemetry.ingest(req,{userId:uid,type:'heartbeat'}).deduplicated,true);
  assert.equal(telemetry.summary().onlineUsers,1);
  assert.equal(telemetry.summary().apps[0].app,'itinerary');
  assert.equal(telemetry.ingest(req,{userId:uid,type:'logout'}).ok,true);
  assert.equal(telemetry.summary().onlineUsers,0);
 }finally{if(prior===undefined)delete process.env.SPACE_TELEMETRY_KEYS;else process.env.SPACE_TELEMETRY_KEYS=prior;db.close();}
});
