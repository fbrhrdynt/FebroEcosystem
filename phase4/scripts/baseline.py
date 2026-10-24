import os, pathlib, datetime, tarfile, hashlib, sqlite3, json, subprocess, urllib.request
root=pathlib.Path('/opt/febro-ecosystem'); stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'); backup=root/'backups'/('phase4-'+stamp); backup.mkdir(mode=0o700)
apps={'central':'/opt/febro-ecosystem','lamariva':'/opt/lamariva','itinerary':'/opt/ls_itinerary','voltlab':'/opt/voltlab','files':'/opt/febro-files','play':'/opt/play'}
skip={'node_modules','.next','.git','data','storage','backups','phase4','dist','build','uploads','exports'}
manifest={'created':stamp,'backup':str(backup),'apps':{},'sqlite':{},'health':{}}
for app,base in apps.items():
 files=[]
 for path,dirs,names in os.walk(base):
  dirs[:]=[d for d in dirs if d not in skip and not d.startswith('.cache')]
  for name in names:
   p=pathlib.Path(path)/name
   if p.is_file() and not p.is_symlink(): files.append(p)
 archive=backup/(app+'-source.tar.gz')
 with tarfile.open(archive,'x:gz') as tar:
  for p in files: tar.add(p,arcname=str(p.relative_to(base)),recursive=False)
 with tarfile.open(archive) as tar: assert len(tar.getmembers())==len(files)
 manifest['apps'][app]={'root':base,'files':len(files),'archive':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'sourceChecksums':{str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if not p.name.startswith('.env')}}
 stage=root/'phase4'/'apps'/app;stage.mkdir(parents=True,exist_ok=False)
 for p in files:
  if p.name.startswith('.env'):continue
  target=stage/p.relative_to(base);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes());target.chmod(p.stat().st_mode&0o777)
 if (pathlib.Path(base)/'node_modules').is_dir(): (stage/'node_modules').symlink_to(pathlib.Path(base)/'node_modules',target_is_directory=True)
for app,file in {'central':'/opt/febro-ecosystem/data/ecosystem.sqlite','files':'/opt/febro-files/data/files.sqlite','play':'/opt/play/storage/leaderboard/arcade.sqlite'}.items():
 src=sqlite3.connect('file:'+file+'?mode=ro',uri=True);dst=sqlite3.connect(backup/(app+'.sqlite'));src.backup(dst); assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok';fk=dst.execute('PRAGMA foreign_key_check').fetchall();manifest['sqlite'][app]={'integrity':'ok','foreignKeyViolations':len(fk)};dst.close();src.close()
# Upload/key data preserved separately; DBs backed up via supported online API above.
with tarfile.open(backup/'assets-and-private-config.tar.gz','x:gz') as tar:
 for base in ['/opt/febro-files/data/vault','/opt/febro-ecosystem/data','/opt/lamariva/uploads','/opt/lamariva/storage','/opt/play/storage/leaderboard']:
  if not os.path.exists(base):continue
  for path,dirs,names in os.walk(base):
   for name in names:
    if any(name.endswith(x) for x in ['.sqlite','.sqlite-wal','.sqlite-shm','.db','.db-wal','.db-shm']):continue
    p=pathlib.Path(path)/name;tar.add(p,arcname=str(p).lstrip('/'),recursive=False)
with tarfile.open(backup/'nginx-pm2.tar.gz','x:gz') as tar:
 for name in ['eco.febro.id.conf','febro-ecosystem.conf','lamariva.conf','itinerary.febro.id.conf','voltlab.conf','febro-files.conf','play.febro.id.conf']:
  p=pathlib.Path('/etc/nginx/conf.d')/name;tar.add(p,arcname='nginx/'+name)
 dump=pathlib.Path.home()/'.pm2/dump.pm2'
 if dump.exists():tar.add(dump,arcname='pm2/dump.pm2')
for host,port,url in [('eco.febro.id',3470,'/'),('cv.febro.id',3035,'/'),('itinerary.febro.id',3015,'/login'),('voltlab.febro.id',3025,'/'),('files.febro.id',3480,'/health'),('play.febro.id',3488,'/api/leaderboard/health')]:
 try:
  req=urllib.request.Request(f'http://127.0.0.1:{port}{url}',headers={'Host':host});res=urllib.request.urlopen(req,timeout=10);manifest['health'][host]={'port':port,'status':res.status}
 except Exception:manifest['health'][host]={'port':port,'status':'failed'}
for p in backup.rglob('*'):
 if p.is_file():p.chmod(0o600)
(root/'phase4/evidence/baseline.json').write_text(json.dumps(manifest,indent=2)+'\n');(root/'phase4/evidence/backup-path').write_text(str(backup))
print(json.dumps({'backup':str(backup),'health':manifest['health'],'sqlite':manifest['sqlite']}))
