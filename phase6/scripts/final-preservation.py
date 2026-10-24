import json,pathlib,hashlib,subprocess,sqlite3,shutil,os
w=pathlib.Path('/opt/febro-ecosystem/phase6');i=json.loads((w/'evidence/inventory.json').read_text());b=pathlib.Path(i['backup']);results={'sourceDrift':{},'pidChanged':{},'sqliteRestore':{},'backupChecksums':{}}
current={a['name']:a['pid'] for a in json.loads(subprocess.run(['pm2','jlist'],capture_output=True,text=True,check=True).stdout)}
for app,a in i['apps'].items():
 results['sourceDrift'][app]=[rel for rel,h in a['checksums'].items() if not (p:=pathlib.Path(a['root'])/rel).is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=h]
 pid=int(subprocess.run(['systemctl','show','ls-itinerary.service','-p','MainPID','--value'],capture_output=True,text=True,check=True).stdout) if app=='itinerary' else current[a['service']]
 results['pidChanged'][app]=pid!=a['pid']
import datetime
restore=w/'evidence'/('sqlite-restore-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S'));restore.mkdir(mode=0o700,exist_ok=False)
for app in ['central','files','play']:
 target=restore/(app+'.sqlite');shutil.copy2(b/(app+'.sqlite'),target);target.chmod(0o600)
 with sqlite3.connect(target) as db:
  assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not db.execute('PRAGMA foreign_key_check').fetchall();results['sqliteRestore'][app]='PASS'
for p in b.iterdir():
 if p.is_file() and p.name not in {'manifest.json','checksums.json'}:results['backupChecksums'][p.name]=hashlib.sha256(p.read_bytes()).hexdigest();p.chmod(0o600)
(w/'evidence/preservation.json').write_text(json.dumps(results,indent=2)+'\n');(b/'checksums.json').write_text(json.dumps(results['backupChecksums'],indent=2)+'\n')
assert not any(results['sourceDrift'].values());assert not any(results['pidChanged'].values())
print('Production source/PIDs unchanged; three SQLite restores verified; backup checksums recorded')
