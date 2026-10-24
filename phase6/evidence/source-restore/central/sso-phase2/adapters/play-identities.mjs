import {randomBytes,createHash} from 'node:crypto';
const token=()=>randomBytes(32).toString('base64url');
const hash=s=>createHash('sha256').update(s).digest('hex');
// Additive schema. players/runs/bests are never rewritten by this repository.
export function playIdentities(db,now=Date.now){
 db.exec(`CREATE TABLE IF NOT EXISTS play_identities(issuer TEXT NOT NULL,subject TEXT NOT NULL,player_id TEXT NOT NULL REFERENCES players(id),PRIMARY KEY(issuer,subject),UNIQUE(issuer,player_id));
 CREATE TABLE IF NOT EXISTS play_auth_sessions(hash TEXT PRIMARY KEY,issuer TEXT NOT NULL,subject TEXT NOT NULL,expires INTEGER NOT NULL);`);
 return {
  login({issuer,subject,guestPlayerId,claimGuest=false}){
   if(!issuer||!subject)throw Error('Validated identity required');
   db.exec('BEGIN IMMEDIATE');
   try{
    let player=db.prepare('SELECT player_id FROM play_identities WHERE issuer=? AND subject=?').get(issuer,subject)?.player_id;
    if(!player){
     if(claimGuest){
      // Caller must require current HttpOnly guest cookie, CSRF and fresh SSO proof.
      if(!guestPlayerId||!db.prepare('SELECT id FROM players WHERE id=?').get(guestPlayerId))throw Error('Guest ownership required');
      player=guestPlayerId;
     }else{
      player=randomBytes(16).toString('hex');
      db.prepare('INSERT INTO players(id,nickname,created_ms,name_set) VALUES(?,?,?,0)').run(player,'Player '+player.slice(0,4).toUpperCase(),now());
     }
     db.prepare('INSERT INTO play_identities VALUES(?,?,?)').run(issuer,subject,player);
    }
    // If identity already has a player, preserve both sets of scores unchanged.
    const session=token();db.prepare('INSERT INTO play_auth_sessions VALUES(?,?,?,?)').run(hash(session),issuer,subject,now()+8*3600000);
    db.exec('COMMIT');return {session,playerId:player};
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
  player(session){if(!session)return undefined;return db.prepare('SELECT i.player_id FROM play_auth_sessions s JOIN play_identities i ON i.issuer=s.issuer AND i.subject=s.subject WHERE s.hash=? AND s.expires>?').get(hash(session),now())?.player_id;},
  logout(session){if(session)db.prepare('DELETE FROM play_auth_sessions WHERE hash=?').run(hash(session));}
 };
}
