/* TribeWorld optional cloud save service: Node 22+ built-in libraries only.
   Does not depend on the Arcade leaderboard service. */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

const scrypt=promisify(crypto.scrypt);
const HOST=process.env.HOST||'127.0.0.1';
const PORT=Number(process.env.PORT||3491);
const ORIGIN=process.env.PUBLIC_ORIGIN||'https://play.febro.id';
const DIR=process.env.DATA_DIR||'/opt/play/storage/tribeworld';
const PROD=process.env.NODE_ENV==='production';
const COOKIE='tw_sid';
const SESSION_MS=30*86400000;
const PREFIX='/api/tribeworld';
fs.mkdirSync(DIR,{recursive:true,mode:0o700});
const db=new DatabaseSync(path.join(DIR,'tribeworld.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000;
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, state TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
`);
const rate=new Map();
const q={
 findAccount:db.prepare('SELECT id,email,password_hash FROM accounts WHERE email=?'),
 addAccount:db.prepare('INSERT INTO accounts(id,email,password_hash,created_at) VALUES(?,?,?,?)'),
 findSession:db.prepare('SELECT a.id,a.email,s.expires_at FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=?'),
 addSession:db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)'),
 removeSession:db.prepare('DELETE FROM sessions WHERE token_hash=?'),
 getSave:db.prepare('SELECT revision,updated_at,state FROM saves WHERE user_id=?'),
 insertSave:db.prepare('INSERT INTO saves(user_id,revision,updated_at,state) VALUES(?,?,?,?)'),
 updateSave:db.prepare('UPDATE saves SET revision=?,updated_at=?,state=? WHERE user_id=? AND revision=?')
};
function json(res,status,obj,headers={}) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(obj));}
function cookieMap(str='') {const a={};for(const x of str.split(';')){const ix=x.indexOf('=');if(ix>0)a[x.slice(0,ix).trim()]=x.slice(ix+1).trim()}return a;}
function tokenHash(t){return crypto.createHash('sha256').update(t).digest('hex')}
function session(req){const t=cookieMap(req.headers.cookie)[COOKIE];if(!t||!/^[a-f0-9]{64}$/.test(t))return null;const user=q.findSession.get(tokenHash(t));return user&&user.expires_at>Date.now()?user:null}
function clearCookie(){return `${COOKIE}=; Path=${PREFIX}/; HttpOnly; SameSite=Lax; Max-Age=0${PROD?'; Secure':''}`;}
function newSession(userId,res){const token=crypto.randomBytes(32).toString('hex');q.addSession.run(tokenHash(token),userId,Date.now()+SESSION_MS);res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=${PREFIX}/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS/1000}${PROD?'; Secure':''}`);}
function clientIP(req){return String(req.socket.remoteAddress==='127.0.0.1'?req.headers['x-real-ip']||'localhost':req.socket.remoteAddress||'unknown').slice(0,80)}
function allowed(key,max=45){const now=Date.now();let v=rate.get(key);if(!v||now-v.start>60_000)v={start:now,n:0};v.n++;rate.set(key,v);if(rate.size>3000)for(const [k,w] of rate)if(now-w.start>60_000)rate.delete(k);return v.n<=max;}
function readJSON(req,limit){return new Promise((resolve,reject)=>{let size=0;const parts=[];req.on('data',buf=>{size+=buf.length;if(size>limit){reject(Object.assign(new Error('Payload terlalu besar'),{status:413}));req.destroy();return;}parts.push(buf)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString('utf8')||'{}'))}catch{reject(Object.assign(new Error('Format JSON tidak valid'),{status:400}))}});req.on('error',reject)})}
function validState(s){if(!s||typeof s!=='object'||s.version!==1||!s.resources||!s.hero||!s.workers||!s.upgrades||!s.stats||!Array.isArray(s.nodes)||!Array.isArray(s.buildings))return false;
 const validNum=(n,max=1e12)=>Number.isFinite(n)&&n>=0&&n<=max;
 for(const k of ['wood','stone','food'])if(!validNum(s.resources[k]))return false;
 if(!Number.isInteger(s.hero.x)||!Number.isInteger(s.hero.y)||s.hero.x<0||s.hero.x>=22||s.hero.y<0||s.hero.y>=18)return false;
 if(!Number.isInteger(s.population)||s.population<1||s.population>10000||s.nodes.length>500||s.buildings.length>500)return false;
 if(typeof s.expanded!=='boolean')return false;
 for(const b of s.buildings)if(!['hall','hut','farm','mill','quarry'].includes(b?.type)||!Number.isInteger(b.x)||!Number.isInteger(b.y)||b.x<0||b.x>=22||b.y<0||b.y>=18||typeof b.id!=='string'||b.id.length>80)return false;
 for(const n of s.nodes)if(!['wood','stone','food'].includes(n?.type)||!Number.isInteger(n.x)||!Number.isInteger(n.y)||n.x<0||n.x>=22||n.y<0||n.y>=18||!validNum(n.hp,10))return false;
 for(const k of ['wood','stone','food'])if(!validNum(s.workers[k],10000))return false;
 for(const k of ['axe','pick','basket'])if(!validNum(s.upgrades[k],3))return false;
 if(!validNum(s.questIndex,100)||!validNum(s.gathered))return false;
 return true;
}
async function handler(req,res){const pathname=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname;
 if(!pathname.startsWith(`${PREFIX}/`))return json(res,404,{error:'Endpoint tidak ditemukan'});
 const action=pathname.slice(PREFIX.length);
 if(req.method==='OPTIONS')return json(res,405,{error:'Tidak mendukung CORS'});
 if(!allowed('general:'+clientIP(req),120))return json(res,429,{error:'Terlalu banyak permintaan'});
 if(req.method!=='GET'&&req.headers.origin!==ORIGIN)return json(res,403,{error:'Origin tidak valid'});
 if(req.method==='GET'&&action==='/health')return json(res,200,{status:'ok',service:'TribeWorld Cloud Save',version:'1.1'});
 if(req.method==='GET'&&action==='/me'){const a=session(req);return json(res,200,{authenticated:!!a,account:a?{id:a.id,email:a.email}:null});}
 if(req.method==='POST'&&(action==='/register'||action==='/login')){
  const ip=clientIP(req);if(!allowed('auth:'+ip,8))return json(res,429,{error:'Terlalu sering mencoba. Tunggu sebentar.'});
  const body=await readJSON(req,2048);const email=String(body.email||'').trim().toLowerCase();const pass=body.password;
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof pass!=='string'||pass.length<10||pass.length>128)return json(res,400,{error:'Email harus valid dan password 10–128 karakter.'});
  if(action==='/register'){
   if(q.findAccount.get(email))return json(res,409,{error:'Email sudah terdaftar. Silakan login.'});
   const salt=crypto.randomBytes(16).toString('hex');const pw=(await scrypt(pass,salt,64)).toString('hex');const id=crypto.randomUUID();
   try{q.addAccount.run(id,email,`scrypt:${salt}:${pw}`,Date.now())}catch{return json(res,409,{error:'Email sudah digunakan.'});}
   newSession(id,res);return json(res,201,{account:{id,email}});
  }
  const a=q.findAccount.get(email);const stored=a?.password_hash||`scrypt:${crypto.randomBytes(16).toString('hex')}:${'0'.repeat(128)}`;
  const [,salt,hash]=stored.split(':');const derived=await scrypt(pass,salt,64);const expected=Buffer.from(hash,'hex');
  if(!a||expected.length!==derived.length||!crypto.timingSafeEqual(derived,expected))return json(res,401,{error:'Email atau password tidak cocok.'});
  newSession(a.id,res);return json(res,200,{account:{id:a.id,email:a.email}});
 }
 if(req.method==='POST'&&action==='/logout'){
  const token=cookieMap(req.headers.cookie)[COOKIE];if(token&&/^[a-f0-9]{64}$/.test(token))q.removeSession.run(tokenHash(token));
  return json(res,200,{ok:true},{'Set-Cookie':clearCookie()});
 }
 const a=session(req);if(!a)return json(res,401,{error:'Silakan login untuk Cloud Save.'});
 if(req.method==='GET'&&action==='/save'){
  const saved=q.getSave.get(a.id);return json(res,200,{save:saved?{revision:saved.revision,updatedAt:saved.updated_at,state:JSON.parse(saved.state)}:null});
 }
 if(req.method==='PUT'&&action==='/save'){
  if(!allowed('save:'+a.id,30))return json(res,429,{error:'Terlalu banyak penyimpanan. Coba beberapa saat lagi.'});
  const input=await readJSON(req,250000);
  if(!Number.isInteger(input.revision)||input.revision<0||!validState(input.state))return json(res,400,{error:'Data simpan tidak valid.'});
  const content=JSON.stringify(input.state);const current=q.getSave.get(a.id);
  if(current&&current.revision!==input.revision)return json(res,409,{error:'Save cloud lebih baru. Pilih data yang ingin digunakan.',revision:current.revision});
  if(!current&&input.revision!==0)return json(res,409,{error:'Cloud kosong; silakan hubungkan ulang.',revision:0});
  const now=Date.now(),revision=input.revision+1;
  if(!current)q.insertSave.run(a.id,revision,now,content);else {const r=q.updateSave.run(revision,now,content,a.id,input.revision);if(r.changes!==1)return json(res,409,{error:'Save diubah dari perangkat lain.'});}
  return json(res,200,{ok:true,revision,updatedAt:now});
 }
 return json(res,404,{error:'Endpoint tidak ditemukan'});
}
const server=http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(err=>{console.error('[tribeworld-api]',err.message);if(!res.headersSent)json(res,err.status||500,{error:err.status?err.message:'Kesalahan server'});else res.end()}));
server.listen(PORT,HOST,()=>console.log(`TribeWorld Cloud Save on ${HOST}:${PORT}`));
