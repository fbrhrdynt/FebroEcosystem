import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256, newCode } from './security.mjs';

export function createStore(dir) {
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const db = new DatabaseSync(path.join(dir,'ecosystem.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT,email_verified INTEGER NOT NULL DEFAULT 0,google_sub TEXT UNIQUE,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_tokens (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS oauth_states (hash TEXT PRIMARY KEY,user_id TEXT,return_to TEXT NOT NULL,verifier TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS handoff_tickets (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),site TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS links (code TEXT PRIMARY KEY,url TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,clicks INTEGER NOT NULL DEFAULT 0,disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS snippets (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,language TEXT NOT NULL,content TEXT NOT NULL,visibility TEXT NOT NULL DEFAULT 'private',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,prefix TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,revoked_at INTEGER);
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,original_name TEXT NOT NULL,source_path TEXT NOT NULL,output_path TEXT,status TEXT NOT NULL,source_hash TEXT NOT NULL,output_hash TEXT,page_count INTEGER NOT NULL,page_index INTEGER,x REAL,y REAL,size REAL,validator_name TEXT,validator_email TEXT,validated_at INTEGER,revoked_at INTEGER,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS account_preferences (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,theme TEXT NOT NULL CHECK(theme IN ('light','dark','system')));
CREATE TABLE IF NOT EXISTS session_authentication (session_hash TEXT PRIMARY KEY REFERENCES sessions(hash) ON DELETE CASCADE,authenticated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_exp ON auth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_links ON links(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_user_snips ON snippets(user_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_user_docs ON documents(owner_id,created_at);`);
  // Non-sensitive, optional profile fields. Migration does not rewrite existing user rows.
  const columns=new Set(db.prepare('PRAGMA table_info(users)').all().map(c=>c.name));
  for(const col of ['headline','city','website','bio'])if(!columns.has(col))db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
  const getUserById = db.prepare('SELECT * FROM users WHERE id=?');
  const getUserByEmail = db.prepare('SELECT * FROM users WHERE email=?');
  return {
    db,
    getUserById: id => getUserById.get(id),
    getUserByEmail: email => getUserByEmail.get(email),
    getUserByGoogle: sub => db.prepare('SELECT * FROM users WHERE google_sub=?').get(sub),
    createUser({email,name,passwordHash=null,verified=false,googleSub=null}) {
      const id=randomUUID();db.prepare('INSERT INTO users(id,email,name,password_hash,email_verified,google_sub,created_at) VALUES (?,?,?,?,?,?,?)').run(id,email,name,passwordHash,verified?1:0,googleSub,Date.now());return getUserById.get(id);
    },
    updateProfile(id,profile){
      db.prepare('UPDATE users SET name=?,headline=?,city=?,website=?,bio=? WHERE id=?').run(profile.name,profile.headline,profile.city,profile.website,profile.bio,id);
      return getUserById.get(id);
    },
    verifyUser(id) { db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(id); },
    updatePassword(id,hash) { db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,id); db.prepare('DELETE FROM sessions WHERE user_id=?').run(id); },
    linkGoogle(id,sub) {db.prepare('UPDATE users SET google_sub=? WHERE id=? AND google_sub IS NULL').run(sub,id);},
    saveSession(token,userId) {db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(sha256(token),userId,Date.now()+7*86400000);},
    sessionUser(token) { if(!token) return null; return db.prepare('SELECT users.* FROM sessions JOIN users ON sessions.user_id=users.id WHERE sessions.hash=? AND sessions.expires_at>?').get(sha256(token),Date.now());},
    endSession(token) {if(token)db.prepare('DELETE FROM sessions WHERE hash=?').run(sha256(token));},
    markAuthenticated(token) {db.prepare('INSERT OR REPLACE INTO session_authentication VALUES(?,?)').run(sha256(token),Date.now());},
    recentlyAuthenticated(token) {const row=db.prepare('SELECT authenticated_at FROM session_authentication WHERE session_hash=?').get(sha256(token||''));return !!row&&row.authenticated_at<=Date.now()&&Date.now()-row.authenticated_at<300000;},
    preferences(userId) {return db.prepare('SELECT theme FROM account_preferences WHERE user_id=?').get(userId)||{theme:'system'};},
    savePreferences(userId,theme) {if(!['light','dark','system'].includes(theme))throw Error('Invalid theme');db.prepare('INSERT INTO account_preferences VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme').run(userId,theme);return {theme};},
    activeSessions(userId,currentToken) {
      const current=sha256(currentToken||'');
      return db.prepare('SELECT hash,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY expires_at DESC').all(userId,Date.now()).map(row=>({current:row.hash===current,expiresAt:row.expires_at}));
    },
    endOtherSessions(userId,currentToken) {
      return db.prepare('DELETE FROM sessions WHERE user_id=? AND hash<>?').run(userId,sha256(currentToken||'')).changes;
    },
    endAllSessions(userId) {db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);},
    saveHandoff(token,userId,site){db.prepare('INSERT INTO handoff_tickets VALUES (?,?,?,?)').run(sha256(token),userId,site,Date.now()+60000);},
    takeHandoff(token,site){const hash=sha256(token);const row=db.prepare('SELECT user_id FROM handoff_tickets WHERE hash=? AND site=? AND expires_at>?').get(hash,site,Date.now());if(row)db.prepare('DELETE FROM handoff_tickets WHERE hash=?').run(hash);return row?.user_id||null;},
    saveToken(token,userId,kind,ttl) {db.prepare('INSERT INTO auth_tokens VALUES (?,?,?,?)').run(sha256(token),userId,kind,Date.now()+ttl);},
    consumeToken(token,kind) {
      const hash=sha256(token); const row=db.prepare('SELECT user_id FROM auth_tokens WHERE hash=? AND kind=? AND expires_at>?').get(hash,kind,Date.now());
      if(!row) return null;
      db.prepare('DELETE FROM auth_tokens WHERE hash=?').run(hash);
      return row.user_id;
    },
    saveOAuth(state, verifier, returnTo, userId=null) {db.prepare('INSERT INTO oauth_states VALUES (?,?,?,?,?)').run(sha256(state),userId,returnTo,verifier,Date.now()+10*60000);},
    takeOAuth(state) {const hash=sha256(state);const row=db.prepare('SELECT * FROM oauth_states WHERE hash=? AND expires_at>?').get(hash,Date.now());db.prepare('DELETE FROM oauth_states WHERE hash=?').run(hash);return row;},
    makeLink(userId,url,requestedCode,expiresDays) {
      const expires=Date.now()+expiresDays*86400000;
      for(let i=0;i<8;i++){
        const code=requestedCode||newCode(7);
        try {db.prepare('INSERT INTO links(code,url,user_id,created_at,expires_at) VALUES(?,?,?,?,?)').run(code,url,userId,Date.now(),expires);return {code,url,expiresAt:expires};}
        catch(e){ if(!String(e).includes('UNIQUE'))throw e; if(requestedCode) throw Object.assign(new Error('Alias sudah digunakan'),{status:409}); }
      }
      throw new Error('Gagal membuat tautan unik');
    },
    getLink: code => db.prepare('SELECT * FROM links WHERE code=?').get(code),
    clickLink: code => db.prepare('UPDATE links SET clicks=clicks+1 WHERE code=?').run(code),
    listLinks: userId => db.prepare('SELECT code,url,created_at AS createdAt,expires_at AS expiresAt,clicks,disabled FROM links WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(userId),
    disableLink: (userId,code) => db.prepare('UPDATE links SET disabled=1 WHERE user_id=? AND code=?').run(userId,code).changes,
    dailyLinkCount: userId => db.prepare('SELECT count(*) as n FROM links WHERE user_id=? AND created_at>?').get(userId,Date.now()-86400000).n,
    createSnippet(userId,{title,language,content,visibility}) { const id=randomUUID();const now=Date.now();db.prepare('INSERT INTO snippets VALUES(?,?,?,?,?,?,?,?)').run(id,userId,title,language,content,visibility,now,now);return {id};},
    snippets: userId => db.prepare('SELECT id,title,language,visibility,created_at AS createdAt,updated_at AS updatedAt FROM snippets WHERE user_id=? ORDER BY updated_at DESC LIMIT 150').all(userId),
    snippet: id => db.prepare('SELECT * FROM snippets WHERE id=?').get(id),
    updateSnippet(userId,id,{title,language,content,visibility}) {return db.prepare('UPDATE snippets SET title=?,language=?,content=?,visibility=?,updated_at=? WHERE id=? AND user_id=?').run(title,language,content,visibility,Date.now(),id,userId).changes;},
    deleteSnippet(userId,id) {return db.prepare('DELETE FROM snippets WHERE id=? AND user_id=?').run(id,userId).changes;},
    createKey(userId,name,token) {let id=randomUUID();db.prepare('INSERT INTO api_keys VALUES (?,?,?,?,?,?,NULL)').run(id,userId,name,token.slice(0,10),sha256(token),Date.now());return {id,name,prefix:token.slice(0,10),token};},
    keyUser(token) {const row=db.prepare('SELECT users.* FROM api_keys JOIN users ON users.id=api_keys.user_id WHERE token_hash=? AND revoked_at IS NULL').get(sha256(token));return row?.email_verified&&!row?.disabled?row:null;},
    keys(userId) {return db.prepare('SELECT id,name,prefix,created_at AS createdAt,revoked_at AS revokedAt FROM api_keys WHERE user_id=? ORDER BY created_at DESC').all(userId);},
    revokeKey(userId,id) {return db.prepare('UPDATE api_keys SET revoked_at=? WHERE id=? AND user_id=?').run(Date.now(),id,userId).changes;},
    createDoc({ownerId,title,originalName,sourcePath,sourceHash,pageCount}) {const id=randomUUID();db.prepare('INSERT INTO documents(id,owner_id,title,original_name,source_path,status,source_hash,page_count,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,ownerId,title,originalName,sourcePath,'draft',sourceHash,pageCount,Date.now());return id;},
    doc: id => db.prepare('SELECT * FROM documents WHERE id=?').get(id),
    docs: ownerId => db.prepare('SELECT id,title,status,source_hash,output_hash,validated_at,revoked_at,created_at FROM documents WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').all(ownerId),
    stampDoc(id,{outputPath,outputHash,pageIndex,x,y,size,name,email}) {return db.prepare("UPDATE documents SET status='valid',output_path=?,output_hash=?,page_index=?,x=?,y=?,size=?,validator_name=?,validator_email=?,validated_at=? WHERE id=? AND status='draft'").run(outputPath,outputHash,pageIndex,x,y,size,name,email,Date.now(),id).changes;},
    revokeDoc(id) {return db.prepare("UPDATE documents SET status='revoked',revoked_at=? WHERE id=? AND status='valid'").run(Date.now(),id).changes;},
    cleanup() { db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());db.prepare('DELETE FROM auth_tokens WHERE expires_at<?').run(Date.now());db.prepare('DELETE FROM oauth_states WHERE expires_at<?').run(Date.now());db.prepare('DELETE FROM handoff_tickets WHERE expires_at<?').run(Date.now()); },
    close(){db.close();}
  };
}
