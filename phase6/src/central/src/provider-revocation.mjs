// Provider DB only. Revoke the account's grants and dependent tokens atomically.
// Native application sessions remain governed by their own expiry/revocation.
export function revokeProviderAccount(db,userId){
 if(typeof userId!=='string'||!userId)throw Error('Account required');
 db.exec('BEGIN IMMEDIATE');
 try{
  const grants=db.prepare("SELECT id FROM oidc_objects WHERE model='Grant' AND json_extract(payload,'$.accountId')=?").all(userId);
  for(const {id} of grants)db.prepare('DELETE FROM oidc_objects WHERE grant_id=?').run(id);
  db.prepare("DELETE FROM oidc_objects WHERE json_extract(payload,'$.accountId')=?").run(userId);
  db.prepare('DELETE FROM fresh_interactions WHERE session_hash IN (SELECT session_hash FROM fresh_auth WHERE user_id=?)').run(userId);
  db.prepare('DELETE FROM fresh_auth WHERE user_id=?').run(userId);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
