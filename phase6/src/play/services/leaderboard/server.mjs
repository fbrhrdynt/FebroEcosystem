import http from 'node:http';
import {playSSO} from './febro-sso.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3488);
const DATA_DIR = process.env.DATA_DIR || '/opt/play/storage/leaderboard';
const ORIGIN = process.env.PUBLIC_ORIGIN || 'https://play.febro.id';
const PROD = process.env.NODE_ENV === 'production';
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o750 });
const db = new DatabaseSync(path.join(DATA_DIR, 'arcade.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, created_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), game TEXT NOT NULL, mode TEXT NOT NULL, created_ms INTEGER NOT NULL, finished_ms INTEGER);
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), game TEXT NOT NULL, mode TEXT NOT NULL, score INTEGER NOT NULL, finished_ms INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS runs_leaderboard ON runs(game,mode,finished_ms,score);
CREATE TABLE IF NOT EXISTS bests (player_id TEXT NOT NULL REFERENCES players(id), game TEXT NOT NULL, mode TEXT NOT NULL, score INTEGER NOT NULL, achieved_ms INTEGER NOT NULL, PRIMARY KEY(player_id,game,mode));
CREATE INDEX IF NOT EXISTS bests_leaderboard ON bests(game,mode,score DESC,achieved_ms ASC);
`);
// Migrate legacy players without destroying existing scores.
const playerCols = db.prepare('PRAGMA table_info(players)').all().map(c=>c.name);
if (!playerCols.includes('name_set')) {
  db.exec('ALTER TABLE players ADD COLUMN name_set INTEGER NOT NULL DEFAULT 0');
  db.exec("UPDATE players SET name_set=1 WHERE nickname NOT GLOB 'Player [0-9A-F][0-9A-F][0-9A-F][0-9A-F]'");
}
const findPlayer = db.prepare('SELECT id,nickname,name_set FROM players WHERE id=?');
const addPlayer = db.prepare('INSERT INTO players(id,nickname,created_ms,name_set) VALUES (?,?,?,0)');
const updatePlayer = db.prepare('UPDATE players SET nickname=?,name_set=1 WHERE id=?');
const addSession = db.prepare('INSERT INTO sessions(id,player_id,game,mode,created_ms) VALUES (?,?,?,?,?)');
const getSession = db.prepare('SELECT * FROM sessions WHERE id=? AND player_id=?');
const useSession = db.prepare('UPDATE sessions SET finished_ms=? WHERE id=? AND finished_ms IS NULL');
const addRun = db.prepare('INSERT INTO runs(id,player_id,game,mode,score,finished_ms) VALUES (?,?,?,?,?,?)');
const upsertBestHigh = db.prepare(`INSERT INTO bests(player_id,game,mode,score,achieved_ms) VALUES (?,?,?,?,?)
 ON CONFLICT(player_id,game,mode) DO UPDATE SET score=excluded.score, achieved_ms=excluded.achieved_ms WHERE excluded.score>bests.score`);
const upsertBestTime = db.prepare(`INSERT INTO bests(player_id,game,mode,score,achieved_ms) VALUES (?,?,?,?,?)
 ON CONFLICT(player_id,game,mode) DO UPDATE SET score=excluded.score, achieved_ms=excluded.achieved_ms WHERE excluded.score<bests.score`);
const countRunToday = db.prepare('SELECT COUNT(*) AS n FROM runs WHERE player_id=? AND finished_ms>=?');

const GAME_MODES={snake:['chill','classic','turbo'],orbit:['standard'],skyhop:['world-1','world-2','world-3'],hoof:['sandbox','race50'],octopus:['freeclimb','climb8']};
const GAME_LABEL={snake:'Neon Snake',orbit:'Orbit Run',skyhop:'SKYHOP',hoof:'Hoof Hustle',octopus:'Octo Ascent'};
const timeGame = (game,mode) => (game === 'hoof' && mode === 'race50') || (game === 'octopus' && mode === 'climb8');
const rate=new Map();
function send(res,status,body,extra={}){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});
 res.end(JSON.stringify(body));
}
function parseCookies(value='') {return Object.fromEntries(value.split(';').map(x=>x.trim().split('=').slice(0,2)).filter(a=>a.length===2));}
function getPlayer(req,res){
 const signed=febroSSO.player(req);if(signed)return signed;
 const id = parseCookies(req.headers.cookie).fa_player;
 if(id && /^[a-f0-9]{32}$/.test(id)) {const p=findPlayer.get(id);if(p)return p;}
 const token=crypto.randomBytes(16).toString('hex');
 const player={id:token,nickname:`Player ${token.slice(0,4).toUpperCase()}`,name_set:0};
 addPlayer.run(player.id,player.nickname,Date.now());
 res.setHeader('Set-Cookie',`fa_player=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${PROD?'; Secure':''}`);
 return player;
}
function getIP(req) {const addr=req.socket.remoteAddress || '?';return (addr==='127.0.0.1'||addr==='::1') ? String(req.headers['x-real-ip']||addr).slice(0,64) : addr;}
function checkRate(ip,weight){const now=Date.now();let item=rate.get(ip);if(!item || now-item.since>60_000)item={since:now,count:0};item.count+=weight;rate.set(ip,item);if(rate.size>3000)for(const [k,v] of rate)if(now-v.since>60_000)rate.delete(k);return item.count<=100;}
function validMode(game,mode){return !!GAME_MODES[game]?.includes(mode);}
function readBody(req){return new Promise((resolve,reject)=>{
  let buffer='',size=0; req.on('data',c=>{size+=c.length;if(size>4096){reject(new Error('Payload terlalu besar'));req.destroy();return;}buffer+=c;});
  req.on('end',()=>{try{resolve(JSON.parse(buffer||'{}'));}catch{reject(new Error('JSON tidak valid'));}});req.on('error',reject);
 });}
function cleanName(name){
 if(typeof name!=='string')return null;
 let v=name.normalize('NFKC').replace(/[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e]/g,'').replace(/\s+/g,' ').trim();
 // Allow letters, digits and a few safe separators. No email addresses or contact handles.
 if(v.length<2 || v.length>18 || !/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(v))return null;
 return v;
}
function verifyScore(game,mode,score,seconds){
 if(!Number.isSafeInteger(score) || score<=0)return 'Skor harus bilangan bulat positif';
 if(seconds<1.5)return 'Ronde terlalu singkat';
 if(game==='snake'){
  if(score>3970 || score%10!==0)return 'Format skor Snake tidak valid';
  const fastest=mode==='turbo'?.058:mode==='classic'?.082:.112;
  if(score/10>Math.floor((seconds+1)/(fastest*2)))return 'Skor terlalu tinggi untuk durasi permainan';
 } else if(game==='orbit'){
  if(score>Math.ceil(seconds*73)+3)return 'Jarak melebihi batas mekanik permainan';
 } else if(game==='skyhop'){
  const max={'world-1':30,'world-2':36,'world-3':42}[mode];
  if(score>max || seconds<5)return 'Skor atau durasi world tidak valid';
 } else if(game==='hoof'&&mode==='sandbox') {
  if(score>100000||score>Math.ceil(seconds*700)+160)return 'Jarak kuda melebihi batas permainan';
 } else if(game==='octopus'&&mode==='freeclimb') {
  if(score>50000||score>Math.ceil(seconds*180)+160)return 'Ketinggian melebihi batas permainan';
 } else if(timeGame(game,mode)) {
  if(score < 4000 || score > 90000 || score > seconds*1000+1500) return 'Waktu finis tidak masuk akal';
 }
 return null;
}
function queryTop(game,mode,period,limit){
 if(period==='7d'){
  const cutoff=Date.now()-7*86400_000;
  const dir=timeGame(game,mode)?'ASC':'DESC';
  return db.prepare(`WITH ranked AS (
      SELECT player_id, score, finished_ms AS achieved_ms,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY score ${dir},finished_ms ASC) AS rn
      FROM runs WHERE game=? AND mode=? AND finished_ms>=?
    ) SELECT r.player_id,p.nickname,r.score,r.achieved_ms FROM ranked r
      JOIN players p ON p.id=r.player_id WHERE r.rn=1
      ORDER BY r.score ${dir},r.achieved_ms ASC LIMIT ?`).all(game,mode,cutoff,limit);
 }
 const dir=timeGame(game,mode)?'ASC':'DESC';
 return db.prepare(`SELECT b.player_id,p.nickname,b.score,b.achieved_ms FROM bests b JOIN players p ON p.id=b.player_id
    WHERE b.game=? AND b.mode=? ORDER BY b.score ${dir},b.achieved_ms ASC LIMIT ?`).all(game,mode,limit);
}
function queryMyRank(playerId,game,mode,period){
 const dir=timeGame(game,mode)?'ASC':'DESC';
 const data=period==='7d'
  ? db.prepare(`WITH ranked AS (SELECT player_id,score,finished_ms,ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY score ${dir},finished_ms ASC) AS rn FROM runs WHERE game=? AND mode=? AND finished_ms>=?) SELECT player_id,score FROM ranked WHERE rn=1 ORDER BY score ${dir},finished_ms ASC`).all(game,mode,Date.now()-7*86400_000)
  : db.prepare(`SELECT player_id,score FROM bests WHERE game=? AND mode=? ORDER BY score ${dir},achieved_ms ASC`).all(game,mode);
 const idx=data.findIndex(r=>r.player_id===playerId);
 return idx<0?{rank:null,score:null}:{rank:idx+1,score:data[idx].score};
}
const febroSSO=await playSSO({db,origin:ORIGIN,secure:PROD,findPlayer});
const server=http.createServer(async(req,res)=>{
 const ip=getIP(req);
 if(!checkRate(ip,req.method==='POST'?5:1))return send(res,429,{error:'Terlalu banyak permintaan; coba lagi nanti.'});
 let u;try{u=new URL(req.url,ORIGIN);}catch{return send(res,400,{error:'URL invalid'});}
 if(!u.pathname.startsWith('/api/leaderboard/'))return send(res,404,{error:'Not found'});
 if(req.method==='GET' && u.pathname==='/api/leaderboard/health')return send(res,200,{status:'ok',service:'Febro Arcade Leaderboard',games:Object.keys(GAME_LABEL)});
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method tidak didukung'});
 if(u.pathname.startsWith('/api/leaderboard/auth/')){try{if(await febroSSO.handle(req,res))return;}catch{return send(res,503,{error:'SSO sementara tidak tersedia'});}}
 if(req.method==='POST'){
  if(req.headers.origin && req.headers.origin!==ORIGIN)return send(res,403,{error:'Origin tidak diizinkan'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'Content-Type harus application/json'});
 }
 try{
  const player=getPlayer(req,res);
  if(req.method==='GET'&&u.pathname==='/api/leaderboard/me')return send(res,200,{id:player.id.slice(0,8),nickname:player.nickname,nameSet:!!player.name_set,authenticated:!!febroSSO.player(req),febroSSO:process.env.FEBRO_SSO_ENABLED==='true'});
  if(req.method==='GET'&&['/api/leaderboard/top','/api/leaderboard/mine'].includes(u.pathname)){
   const game=u.searchParams.get('game')||'snake',mode=u.searchParams.get('mode')||GAME_MODES[game]?.[0],period=u.searchParams.get('period')==='7d'?'7d':'all';
   if(!validMode(game,mode))return send(res,400,{error:'Pilihan game/mode tidak valid'});
   if(u.pathname.endsWith('/mine'))return send(res,200,queryMyRank(player.id,game,mode,period));
   const limit=Math.min(50,Math.max(1,Number(u.searchParams.get('limit'))||20));
   const top=queryTop(game,mode,period,limit).map((r,i)=>({rank:i+1,nickname:r.nickname,score:r.score,isMe:r.player_id===player.id,achievedAt:new Date(r.achieved_ms).toISOString()}));
   return send(res,200,{game,mode,period,unit:timeGame(game,mode)?'ms':(game==='hoof'||game==='octopus')?'cm':game==='orbit'?'m':game==='snake'?'pts':'koin',items:top});
  }
  if(req.method!=='POST')return send(res,404,{error:'Rute tidak ditemukan'});
  const body=await readBody(req);
  if(u.pathname==='/api/leaderboard/profile'){
   const name=cleanName(body.nickname);
   if(!name)return send(res,400,{error:'Nama 2–18 karakter; gunakan huruf, angka, spasi, titik, atau tanda hubung.'});
   updatePlayer.run(name,player.id);return send(res,200,{nickname:name,nameSet:true});
  }
  if(u.pathname==='/api/leaderboard/start'){
   const {game,mode}=body;
   if(!validMode(game,mode))return send(res,400,{error:'Game atau mode tidak dikenal'});
   const runId=crypto.randomBytes(18).toString('hex');
   addSession.run(runId,player.id,game,mode,Date.now());
   return send(res,201,{runId,game,mode});
  }
  if(u.pathname==='/api/leaderboard/finish'){
   const runId=body.runId;
   if(typeof runId!=='string'||!/^[a-f0-9]{36}$/.test(runId))return send(res,400,{error:'Token ronde tidak valid'});
   const sess=getSession.get(runId,player.id);
   if(!sess)return send(res,404,{error:'Sesi ronde tidak ditemukan'});
   if(sess.finished_ms)return send(res,409,{error:'Skor ronde ini sudah dikirim'});
   const now=Date.now(),seconds=(now-sess.created_ms)/1000;
   if(seconds>10800)return send(res,410,{error:'Ronde kedaluwarsa, mulai lagi'});
   const err=verifyScore(sess.game,sess.mode,body.score,seconds);
   if(err)return send(res,422,{error:err});
   if(countRunToday.get(player.id,now-86400_000).n>=200)return send(res,429,{error:'Batas harian tercapai'});
   db.exec('BEGIN IMMEDIATE');
   try{const consumed=useSession.run(now,runId);
    if(consumed.changes!==1)throw new Error('Ronde telah dipakai');
    addRun.run(runId,player.id,sess.game,sess.mode,body.score,now);
    (timeGame(sess.game,sess.mode)?upsertBestTime:upsertBestHigh).run(player.id,sess.game,sess.mode,body.score,now);
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return send(res,201,{accepted:true,game:sess.game,mode:sess.mode,score:body.score,...queryMyRank(player.id,sess.game,sess.mode,'all')});
  }
  return send(res,404,{error:'Rute tidak ditemukan'});
 }catch(err){
  if(err instanceof SyntaxError || err.message==='Payload terlalu besar' || err.message==='JSON tidak valid')return send(res,400,{error:'Permintaan tidak valid'});
  console.error('api_error',err?.message);
  return send(res,500,{error:'Server mengalami kendala'});
 }
});
server.listen(PORT,HOST,()=>console.log(`Febro Arcade Leaderboard API listening http://${HOST}:${PORT}`));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
