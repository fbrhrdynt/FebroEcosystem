"""Synthetic rollback exercise; rejects all paths outside its own temporary fixture."""
import tempfile,pathlib,hashlib,json
with tempfile.TemporaryDirectory(prefix='febro-phase5-rollback-') as tmp:
 root=pathlib.Path(tmp);source=root/'server.mjs';data=root/'users.sqlite';scores=root/'leaderboard-history.json';source.write_text('original source');data.write_bytes(b'synthetic existing user IDs and ownership');scores.write_text('[{"score":100,"player":"original"}]');before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [source,data,scores]};backup=source.read_bytes();source.write_text('candidate source');new=root/'sso.mjs';new.write_text('new candidate');candidateDigest=hashlib.sha256(new.read_bytes()).hexdigest()
 # Source-only restoration: user data/score files are deliberately untouched.
 source.write_bytes(backup)
 if hashlib.sha256(new.read_bytes()).hexdigest()==candidateDigest:new.unlink()
 assert all(hashlib.sha256((root/name).read_bytes()).hexdigest()==v for name,v in before.items());assert not new.exists()
 print(json.dumps({'sourceRestored':True,'existingUserIdsAndOwnershipPreserved':True,'historicalScoresPreserved':True,'productionRollback':'NOT_EXECUTED','scope':'synthetic source-only rehearsal; not Phase 4 deploy runner'}))
