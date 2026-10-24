// Febro Account SSO Control Plane v0.1 — by Febro Herdyanto
import fs from 'node:fs';
import path from 'node:path';
// No application-business data is read or modified by this component.
export const TARGETS=Object.freeze([
 ['api','API','https://api.febro.id'],
 ['auth','Febro Account','https://auth.febro.id'],
 ['convert','Document Converter','https://convert.febro.id'],
 ['docs','Documentation','https://docs.febro.id'],
 ['files','Febro Files','https://files.febro.id'],
 ['itinerary','Itinerary','https://itinerary.febro.id'],
 ['lamariva','Lamariva','https://cv.febro.id'],
 ['play','Play','https://play.febro.id'],
 ['lab','Febro Labs','https://lab.febro.id'],
 ['qr','QR Studio','https://qr.febro.id'],
 ['receipt','Receipt Generator','https://receipt.febro.id'],
 ['short','URL Shortener','https://short.febro.id'],
 ['snip','Snippets','https://snip.febro.id'],
 ['tools','Tools','https://tools.febro.id'],
 ['voltlab','VoltLab','https://voltlab.febro.id']
]);
const ID=/^[a-z0-9][a-z0-9_-]{0,63}$/;
const UID=/^[0-9a-fA-F-]{36}$/;
const ADMINS=new Set(['febroherdyanto@outlook.com','febroherdyanto98@gmail.com']);
const error=(code,message)=>Object.assign(new Error(message),{status:code});
export const isCentralAdmin = user=>!!user&&!!user.email_verified&&!user.disabled&&ADMINS.has(String(user.email||'').trim().toLowerCase());
export function initControlPlane(db, dataDir=''){
 function integrated(app){
  if(!['voltlab','itinerary','receipt'].includes(app))return true;
  if(!dataDir)return false;
  try{
   const rows=JSON.parse(fs.readFileSync(path.join(dataDir,'oidc-clients.json'),'utf8'));
   return Array.isArray(rows)&&rows.some(c=>c.client_id==='febro-'+app&&Array.isArray(c.redirect_uris)&&c.redirect_uris.length>0);
  }catch{return false;}
 }
 const cols=new Set(db.prepare('PRAGMA table_info(users)').all().map(x=>x.name));
 if(!cols.has('disabled'))db.exec('ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0');
 db.exec(`CREATE TABLE IF NOT EXISTS sso_user_apps (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  updated_at INTEGER NOT NULL, updated_by TEXT,
  PRIMARY KEY(user_id,app));
 CREATE TABLE IF NOT EXISTS sso_control_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL,
  action TEXT NOT NULL,target_id TEXT,app TEXT,
  event_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sso_control_audit_time ON sso_control_audit(event_at DESC);`);
 const apps=new Set(TARGETS.map(a=>a[0]));
 function isEnabled(userId,app){
  if(!apps.has(app))return app==='verify';
  const u=db.prepare('SELECT email_verified,disabled FROM users WHERE id=?').get(userId);
  if(!u?.email_verified||u.disabled)return false;
  const record=db.prepare('SELECT enabled FROM sso_user_apps WHERE user_id=? AND app=?').get(userId,app);
  return record ? record.enabled===1 : true;
 }
 function userList(offset=0){
  const o=Math.min(100000,Math.max(0,Number.isInteger(offset)?offset:0));
  const rows=db.prepare(`SELECT id,name,email,email_verified,google_sub IS NOT NULL AS google_linked,disabled,created_at FROM users ORDER BY created_at DESC LIMIT 50 OFFSET ?`).all(o);
  const total=db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  return {total,offset,users:rows.map(({id,name,email,email_verified,google_linked,disabled,created_at})=>({id,name,email,verified:!!email_verified,googleLinked:!!google_linked,disabled:!!disabled,isAdmin:ADMINS.has(email.toLowerCase()),createdAt:created_at}))};
 }
 function detail(userId){
  if(!UID.test(userId))throw error(400,'Invalid user ID');
  const user=db.prepare('SELECT id,email,name,disabled,email_verified FROM users WHERE id=?').get(userId);
  if(!user)throw error(404,'User not found');
  const overrides=db.prepare('SELECT app,enabled FROM sso_user_apps WHERE user_id=?').all(userId);
  const map=new Map(overrides.map(r=>[r.app,!!r.enabled]));
  return {user:{id:user.id,email:user.email,name:user.name,disabled:!!user.disabled,verified:!!user.email_verified,isAdmin:ADMINS.has(user.email.toLowerCase())},apps:TARGETS.map(([id,name,url])=>({id,name,url,enabled:!user.disabled&&(map.get(id)??true),override:map.has(id),integrated:integrated(id)}))};
 }
 function audit(actor,action,userId,app=null){db.prepare('INSERT INTO sso_control_audit(actor_id,action,target_id,app,event_at) VALUES(?,?,?,?,?)').run(actor,action,userId,app,Date.now());}
 function setBlocked(actor,target,blocked){
  const u=detail(target).user;
  if(u.isAdmin)throw error(403,'Akun administrator tidak boleh diblokir dari dashboard');
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE users SET disabled=? WHERE id=?').run(blocked?1:0,target);
   if(blocked){
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(target);
    db.prepare('DELETE FROM handoff_tickets WHERE user_id=?').run(target);
    db.prepare('UPDATE api_keys SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(Date.now(),target);
   }
   audit(actor,blocked?'user.block':'user.unblock',target);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {ok:true};
 }
 function setAccess(actor,target,app,enabled){
  const u=detail(target).user;
  if(!apps.has(app)||!ID.test(app))throw error(400,'Unknown application');
  if(app==='auth')throw error(403,'Febro Account login is never controlled through per-app access toggles');
  if(u.isAdmin&&enabled===false)throw error(403,'Akun administrator tidak boleh dicabut aksesnya dari dashboard');
  db.prepare(`INSERT INTO sso_user_apps(user_id,app,enabled,updated_at,updated_by) VALUES(?,?,?,?,?)
    ON CONFLICT(user_id,app) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).run(target,app,enabled?1:0,Date.now(),actor);
  audit(actor,enabled?'app.grant':'app.revoke',target,app);
  return {ok:true,enabled};
 }
 function revokeSessions(actor,target){
  const u=detail(target).user;
  if(u.isAdmin&&target!==actor)throw error(403,'Sesi administrator lain tidak dapat dicabut');
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(target);
  audit(actor,'sessions.revoke',target);return {ok:true};
 }
 function log(){return db.prepare('SELECT id,actor_id AS actorId,action,target_id AS targetId,app,event_at AS at FROM sso_control_audit ORDER BY id DESC LIMIT 75').all();}
 return {isEnabled,userList,detail,setBlocked,setAccess,revokeSessions,log,appList:()=>TARGETS.map(([id,name,url])=>({id,name,url,integrated:integrated(id)}))};
}
