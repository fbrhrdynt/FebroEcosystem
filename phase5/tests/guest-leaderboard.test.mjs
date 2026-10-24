import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {DatabaseSync} from 'node:sqlite';

test('actual existing Play API: anonymous play, score bounds, save, replay and expired round using isolated data',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'febro-sso-guest-'));
 const reservation=net.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['/opt/febro-ecosystem/phase5/src/play/services/leaderboard/server.mjs'],{env:{PATH:process.env.PATH,HOME:directory,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:directory,PUBLIC_ORIGIN:origin,NODE_ENV:'test'},stdio:'ignore'});
 t.after(async()=>{if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await rm(directory,{recursive:true,force:true});});
 let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch(origin+'/api/leaderboard/health')).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready,'isolated API ready');
 const me=await fetch(origin+'/api/leaderboard/me');assert.equal(me.status,200);const cookie=me.headers.get('set-cookie').split(';')[0];assert.ok(cookie.startsWith('fa_player='));
 const post=(p,body,extra={})=>fetch(origin+'/api/leaderboard/'+p,{method:'POST',headers:{cookie,origin,'content-type':'application/json',...extra},body:JSON.stringify(body)});
 assert.equal((await post('start',{game:'snake',mode:'classic'},{origin:'https://evil.invalid'})).status,403);
 const started=await post('start',{game:'snake',mode:'classic'});assert.equal(started.status,201);const {runId}=await started.json();
 const db=new DatabaseSync(path.join(directory,'arcade.sqlite'));t.after(()=>db.close());db.prepare('UPDATE sessions SET created_ms=? WHERE id=?').run(Date.now()-10000,runId);
 assert.equal((await post('finish',{runId,score:99999999})).status,422);
 assert.equal((await post('finish',{runId,score:10})).status,201);
 assert.equal((await post('finish',{runId,score:10})).status,409);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM runs').get().n,1);
 const next=await(await post('start',{game:'snake',mode:'classic'})).json();db.prepare('UPDATE sessions SET created_ms=? WHERE id=?').run(Date.now()-10801000,next.runId);
 assert.equal((await post('finish',{runId:next.runId,score:10})).status,410);
});
