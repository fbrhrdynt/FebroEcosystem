import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID,randomBytes,scryptSync,timingSafeEqual,createHash } from 'node:crypto';

const err=(message,status=400)=>Object.assign(new Error(message),{status});
export const MB=1024*1024;
export const digest=s=>createHash('sha256').update(s).digest('hex');
export function validName(raw){
 if(typeof raw!=='string')throw err('Nama tidak valid');
 const name=raw.trim().normalize('NFC');
 if(!name||name==='.'||name==='..'||name.length>180||/[\\/\x00-\x1f\x7f]/.test(name)||name.endsWith('.'))throw err('Nama tidak valid (maksimal 180 karakter, tanpa / atau \\)');
 return name;
}
export const uuid=()=>randomUUID();
export const randomToken=()=>randomBytes(36).toString('base64url');
export function hashPassword(s){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(s,salt,64).toString('hex');}
export function comparePassword(s,stored){try{const [salt,hash]=stored.split(':');const a=scryptSync(s,salt,64),b=Buffer.from(hash,'hex');return a.length===b.length&&timingSafeEqual(a,b);}catch{return false;}}
export function initDatabase(dataDir){
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(path.join(dataDir,'files.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS accounts(sub TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,quota_override INTEGER,blocked INTEGER NOT NULL DEFAULT 0,used_bytes INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,sub TEXT NOT NULL REFERENCES accounts(sub),expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY,owner_sub TEXT NOT NULL REFERENCES accounts(sub),parent_id TEXT REFERENCES nodes(id),kind TEXT NOT NULL CHECK(kind IN ('file','folder')),name TEXT NOT NULL,storage_key TEXT,size INTEGER NOT NULL DEFAULT 0,mime TEXT,sha256 TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,trashed_at INTEGER);
 CREATE TABLE IF NOT EXISTS share_links(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,owner_sub TEXT NOT NULL REFERENCES accounts(sub),node_id TEXT NOT NULL REFERENCES nodes(id),expires_at INTEGER,max_downloads INTEGER,download_count INTEGER NOT NULL DEFAULT 0,password_hash TEXT,created_at INTEGER NOT NULL,revoked_at INTEGER);
 CREATE TABLE IF NOT EXISTS user_shares(id TEXT PRIMARY KEY,owner_sub TEXT NOT NULL REFERENCES accounts(sub),node_id TEXT NOT NULL REFERENCES nodes(id),recipient_email TEXT NOT NULL,created_at INTEGER NOT NULL,revoked_at INTEGER);
 CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_sub TEXT,action TEXT NOT NULL,node_id TEXT,details TEXT,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(owner_sub,parent_id,trashed_at);
 CREATE INDEX IF NOT EXISTS idx_nodes_owner ON nodes(owner_sub);
 CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
 CREATE INDEX IF NOT EXISTS idx_share_email ON user_shares(recipient_email,revoked_at);
 CREATE INDEX IF NOT EXISTS idx_share_node ON share_links(node_id,revoked_at);
 INSERT OR IGNORE INTO settings(k,v) VALUES ('default_quota_bytes','104857600');`);
 const p={
  account:db.prepare('SELECT * FROM accounts WHERE sub=?'),node:db.prepare('SELECT * FROM nodes WHERE id=?'),
  shareLink:db.prepare('SELECT * FROM share_links WHERE token_hash=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)'),
 };
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const requireOwn=(sub,id,kind=null)=>{const n=p.node.get(id);if(!n||n.owner_sub!==sub||kind&&n.kind!==kind)throw err('File atau folder tidak ditemukan',404);return n;};
 const active=(node)=>{
  let n=node,loops=0;
  while(n){if(n.trashed_at)return false;if(!n.parent_id)return true;n=p.node.get(n.parent_id);if(++loops>120||!n)return false;}
  return false;
 };
 const requireActive=(sub,id,kind=null)=>{const n=requireOwn(sub,id,kind);if(!active(n))throw err('File/folder berada di Trash',404);return n;};
 const unique=(sub,parent,name,except=null)=>{const row=db.prepare('SELECT id FROM nodes WHERE owner_sub=? AND parent_id IS ? AND name=? AND trashed_at IS NULL').get(sub,parent,name);if(row&&row.id!==except)throw err('Nama sudah digunakan di folder tersebut',409);};
 const isDescendant=(root,id)=>{let n=p.node.get(id),i=0;while(n){if(n.id===root.id)return true; if(++i>120)return false;n=n.parent_id?p.node.get(n.parent_id):null;}return false;};
 const subtree=id=>db.prepare(`WITH RECURSIVE descendants(id) AS (SELECT id FROM nodes WHERE id=? UNION ALL SELECT n.id FROM nodes n JOIN descendants d ON n.parent_id=d.id) SELECT n.* FROM nodes n JOIN descendants d ON n.id=d.id`).all(id);
 const audit=(sub,action,id=null,details='')=>db.prepare('INSERT INTO audit_log(actor_sub,action,node_id,details,created_at) VALUES (?,?,?,?,?)').run(sub,action,id,details,Date.now());
 const quota=(sub)=>{const a=p.account.get(sub);return a.quota_override??Number(db.prepare("SELECT v FROM settings WHERE k='default_quota_bytes'").get().v);};
 return {
  db,tx,requireOwn,requireActive,isDescendant,subtree,audit,quota,
  account:sub=>p.account.get(sub),
  upsertAccount(profile){
   const now=Date.now(); db.prepare('INSERT INTO accounts(sub,email,name,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(sub) DO UPDATE SET email=excluded.email,name=excluded.name,updated_at=excluded.updated_at').run(profile.sub,profile.email.toLowerCase(),profile.name,now,now);
   return p.account.get(profile.sub);
  },
  session(token,sub){db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token),sub,Date.now()+7*86400000);},
  getSession(token){if(!token)return null;return db.prepare('SELECT a.* FROM sessions s JOIN accounts a ON s.sub=a.sub WHERE s.hash=? AND s.expires_at>?').get(digest(token),Date.now());},
  endSession(token){if(token)db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token));},
  list(sub,parent=null){if(parent)requireActive(sub,parent,'folder');return db.prepare('SELECT id,parent_id,name,kind,size,mime,created_at,updated_at,sha256 FROM nodes WHERE owner_sub=? AND parent_id IS ? AND trashed_at IS NULL ORDER BY kind ASC,name COLLATE NOCASE ASC LIMIT 1000').all(sub,parent);},
  breadcrumbs(sub,parent){let cur=parent?requireActive(sub,parent,'folder'):null,arr=[],n=0;while(cur){arr.unshift({id:cur.id,name:cur.name});cur=cur.parent_id?p.node.get(cur.parent_id):null;if(++n>100)break;}return arr;},
  createFolder(sub,parent,name){name=validName(name);if(parent)requireActive(sub,parent,'folder');return tx(()=>{unique(sub,parent,name);const id=uuid(),now=Date.now();db.prepare("INSERT INTO nodes(id,owner_sub,parent_id,kind,name,created_at,updated_at) VALUES (?,?,?,'folder',?,?,?)").run(id,sub,parent,name,now,now);audit(sub,'folder.create',id);return p.node.get(id);});},
  insertFile(sub,parent,name,key,size,sha,mime){name=validName(name);if(parent)requireActive(sub,parent,'folder');return tx(()=>{
    const user=p.account.get(sub);if(!user||user.blocked)throw err('Account unavailable',403);
    if(user.used_bytes+size>quota(sub))throw err('Storage quota exceeded',413);
    unique(sub,parent,name);
    const id=uuid(),now=Date.now();
    db.prepare("INSERT INTO nodes(id,owner_sub,parent_id,kind,name,storage_key,size,mime,sha256,created_at,updated_at) VALUES (?,?,?,'file',?,?,?,?,?,?,?)").run(id,sub,parent,name,key,size,mime,sha,now,now);
    db.prepare('UPDATE accounts SET used_bytes=used_bytes+? WHERE sub=?').run(size,sub);audit(sub,'file.upload',id,String(size));return p.node.get(id);
   });},
  rename(sub,id,name){name=validName(name);return tx(()=>{const n=requireActive(sub,id);unique(sub,n.parent_id,name,id);db.prepare('UPDATE nodes SET name=?,updated_at=? WHERE id=?').run(name,Date.now(),id);audit(sub,'node.rename',id);return p.node.get(id);});},
  move(sub,id,parent){return tx(()=>{const n=requireActive(sub,id);if(parent){const target=requireActive(sub,parent,'folder');if(isDescendant(n,target.id))throw err('Tidak bisa memindahkan folder ke dalam dirinya',400);}unique(sub,parent,n.name,id);db.prepare('UPDATE nodes SET parent_id=?,updated_at=? WHERE id=?').run(parent,Date.now(),id);audit(sub,'node.move',id);return p.node.get(id);});},
  trash(sub,id){return tx(()=>{requireActive(sub,id);db.prepare('UPDATE nodes SET trashed_at=?,updated_at=? WHERE id=?').run(Date.now(),Date.now(),id);audit(sub,'node.trash',id);});},
  trashed(sub){return db.prepare('SELECT id,parent_id,name,kind,size,trashed_at FROM nodes WHERE owner_sub=? AND trashed_at IS NOT NULL ORDER BY trashed_at DESC LIMIT 1000').all(sub);},
  restore(sub,id){return tx(()=>{const n=requireOwn(sub,id);if(!n.trashed_at)throw err('Item not in trash',409);let parent=n.parent_id;if(parent&&!active(p.node.get(parent)))parent=null;unique(sub,parent,n.name,id);db.prepare('UPDATE nodes SET trashed_at=NULL,parent_id=?,updated_at=? WHERE id=?').run(parent,Date.now(),id);audit(sub,'node.restore',id);});},
  purge(sub,id){let keys=[];tx(()=>{const root=requireOwn(sub,id);if(!root.trashed_at)throw err('Move item to Trash before permanently deleting',409);const all=subtree(id);keys=all.filter(n=>n.storage_key).map(n=>n.storage_key);const size=all.reduce((n,row)=>n+row.size,0);for(const n of all){db.prepare('DELETE FROM share_links WHERE node_id=?').run(n.id);db.prepare('DELETE FROM user_shares WHERE node_id=?').run(n.id);}for(const n of all.reverse())db.prepare('DELETE FROM nodes WHERE id=?').run(n.id);db.prepare('UPDATE accounts SET used_bytes=MAX(0,used_bytes-?) WHERE sub=?').run(size,sub);audit(sub,'node.purge',id);});return keys;},
  makePublicShare(sub,nodeId,opts){return tx(()=>{requireActive(sub,nodeId);const token=randomToken(),id=uuid();db.prepare('INSERT INTO share_links(id,token_hash,owner_sub,node_id,expires_at,max_downloads,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,digest(token),sub,nodeId,opts.expiresAt||null,opts.maxDownloads||null,opts.password?hashPassword(opts.password):null,Date.now());audit(sub,'share.public.create',nodeId);return {id,token};});},
  getPublic(token){if(!/^[a-zA-Z0-9_-]{40,120}$/.test(token))return null;const s=p.shareLink.get(digest(token),Date.now());const n=s&&p.node.get(s.node_id);return n&&active(n)?{...s,node:n}:null;},
  incDownload(shareId){return tx(()=>{const s=db.prepare('SELECT * FROM share_links WHERE id=?').get(shareId);if(!s||s.revoked_at||s.expires_at&&s.expires_at<=Date.now()||s.max_downloads!==null&&s.download_count>=s.max_downloads)throw err('Download limit reached',410);db.prepare('UPDATE share_links SET download_count=download_count+1 WHERE id=?').run(shareId);});},
  publicShares(sub){return db.prepare('SELECT l.id,l.node_id,n.name,n.kind,l.expires_at,l.max_downloads,l.download_count,l.password_hash IS NOT NULL AS passwordProtected,l.revoked_at FROM share_links l JOIN nodes n ON n.id=l.node_id WHERE l.owner_sub=? ORDER BY l.created_at DESC LIMIT 1000').all(sub);},
  revokePublic(sub,id){return db.prepare('UPDATE share_links SET revoked_at=? WHERE id=? AND owner_sub=?').run(Date.now(),id,sub).changes;},
  makeUserShare(sub,nodeId,email){return tx(()=>{requireActive(sub,nodeId);const e=email.trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)||e.length>254)throw err('Email tidak valid');const id=uuid();db.prepare('INSERT INTO user_shares(id,owner_sub,node_id,recipient_email,created_at) VALUES (?,?,?,?,?)').run(id,sub,nodeId,e,Date.now());audit(sub,'share.user.create',nodeId);return id;});},
  myShares(sub){return db.prepare('SELECT s.id,n.name,n.kind,s.recipient_email,s.node_id,s.created_at FROM user_shares s JOIN nodes n ON n.id=s.node_id WHERE s.owner_sub=? AND s.revoked_at IS NULL ORDER BY s.created_at DESC LIMIT 1000').all(sub);},
  sharedWith(email){return db.prepare('SELECT s.id,n.name,n.kind,s.node_id,s.owner_sub,a.name AS owner_name FROM user_shares s JOIN nodes n ON n.id=s.node_id JOIN accounts a ON a.sub=s.owner_sub WHERE s.recipient_email=? AND s.revoked_at IS NULL AND n.trashed_at IS NULL ORDER BY s.created_at DESC LIMIT 1000').all(email.toLowerCase());},
  getIncoming(email,id){const s=db.prepare('SELECT * FROM user_shares WHERE id=? AND recipient_email=? AND revoked_at IS NULL').get(id,email.toLowerCase());const n=s&&p.node.get(s.node_id);return n&&active(n)?{...s,node:n}:null;},
  sharedChildren(share,folder){const target=folder?p.node.get(folder):share.node;if(!target||target.kind!=='folder'||!isDescendant(share.node,target.id)||!active(target))throw err('Folder not available',404);return db.prepare('SELECT id,name,kind,size,mime FROM nodes WHERE parent_id=? AND trashed_at IS NULL ORDER BY kind,name LIMIT 1000').all(target.id);},
  revokeUserShare(sub,id){return db.prepare('UPDATE user_shares SET revoked_at=? WHERE owner_sub=? AND id=?').run(Date.now(),sub,id).changes;},
  setQuota(sub,quotaBytes){if(!Number.isSafeInteger(quotaBytes)||quotaBytes<0||quotaBytes>10*1024*MB)throw err('Quota out of bounds');return db.prepare('UPDATE accounts SET quota_override=? WHERE sub=?').run(quotaBytes,sub).changes;},
  clearQuota(sub){return db.prepare('UPDATE accounts SET quota_override=NULL WHERE sub=?').run(sub).changes;},
  setDefaultQuota(bytes){if(!Number.isSafeInteger(bytes)||bytes<MB||bytes>10*1024*MB)throw err('Default quota must be 1 MB to 10 GB');db.prepare("UPDATE settings SET v=? WHERE k='default_quota_bytes'").run(String(bytes));},
  setBlocked(sub,blocked){return db.prepare('UPDATE accounts SET blocked=? WHERE sub=?').run(blocked?1:0,sub).changes;},
  users(){return db.prepare('SELECT sub,email,name,quota_override,used_bytes,blocked,created_at FROM accounts ORDER BY created_at DESC LIMIT 5000').all();},
  logs(){return db.prepare('SELECT id,actor_sub,action,node_id,created_at FROM audit_log ORDER BY id DESC LIMIT 200').all();},
  cleanup(){db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());},
  close(){db.close();}
 };
}
