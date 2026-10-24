import pathlib,subprocess,json,datetime,tarfile,sqlite3,hashlib,os,urllib.request
os.umask(0o077)
w=pathlib.Path('/opt/febro-ecosystem/phase6'); stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'); b=pathlib.Path('/home/ubuntu/febro-phase6/backups')/stamp;b.mkdir(parents=True,mode=0o700)
def run(args):return subprocess.run(args,capture_output=True,text=True,timeout=120)
names={'febro-ecosystem':'central','lamariva':'lamariva','voltlab':'voltlab','febro-files':'files','febro-arcade-api':'play'}
apps={}
for a in json.loads(run(['pm2','jlist']).stdout):
 if a['name'] in names:
  e=a['pm2_env'];app=names[a['name']];base=e['pm_cwd'];base=str(pathlib.Path(base).parents[1]) if app=='play' else base
  apps[app]={'root':base,'manager':'PM2','service':a['name'],'pid':a['pid'],'status':e['status'],'entrypoint':e['pm_exec_path']}
s=dict(line.split('=',1) for line in run(['systemctl','show','ls-itinerary.service','--property=ActiveState,MainPID,FragmentPath,WorkingDirectory']).stdout.splitlines() if '=' in line)
apps['itinerary']={'root':s['WorkingDirectory'],'manager':'systemd','service':'ls-itinerary.service','pid':int(s['MainPID']),'status':s['ActiveState'],'unit':s['FragmentPath']}
manifest={'created':stamp,'backup':str(b),'apps':apps,'sqlite':{},'nginx':{},'credentials':{},'health':{}}
skip={'node_modules','.next','.git','data','storage','backups','phase4','phase5','phase6','project-docs','uploads','exports','.cache','dist','build'}
for app,a in apps.items():
 base=pathlib.Path(a['root']);files=[]
 for folder,dirs,names_ in os.walk(base):
  dirs[:]=[x for x in dirs if x not in skip]
  files.extend(p for name in names_ if (p:=pathlib.Path(folder)/name).is_file() and not p.is_symlink())
 with tarfile.open(b/(app+'-source.tar.gz'),'x:gz') as t:
  for p in files:t.add(p,arcname=str(p.relative_to(base)),recursive=False)
 a['checksums']={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if not p.name.startswith('.env')}
 env={}
 for p in base.glob('.env*'):
  if p.is_file():
   for line in p.read_text().splitlines():
    k,sep,v=line.partition('=')
    if sep and any(x in k.upper() for x in ['GOOGLE','OAUTH','DATABASE_URL','FEBRO_PROVIDER']):env[k.strip()]=bool(v.strip().strip('"\''))
 manifest['credentials'][app]=env
for app,rel in {'central':'data/ecosystem.sqlite','files':'data/files.sqlite','play':'storage/leaderboard/arcade.sqlite'}.items():
 source=pathlib.Path(apps[app]['root'])/rel
 with sqlite3.connect('file:'+str(source)+'?mode=ro',uri=True) as src,sqlite3.connect(b/(app+'.sqlite')) as dst:src.backup(dst)
 with sqlite3.connect(b/(app+'.sqlite')) as dst:
  assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not dst.execute('PRAGMA foreign_key_check').fetchall()
 manifest['sqlite'][app]={'source':str(source),'integrity':'ok','foreignKeyViolations':0}
with tarfile.open(b/'private-assets.tar.gz','x:gz') as t:
 for root in [pathlib.Path(apps['central']['root'])/'data',pathlib.Path(apps['files']['root'])/'data/vault',pathlib.Path(apps['lamariva']['root'])/'uploads',pathlib.Path(apps['lamariva']['root'])/'storage']:
  if root.exists():
   for p in root.rglob('*'):
    if p.is_file() and not p.is_symlink() and not any(str(p).endswith(x) for x in ['.sqlite','.sqlite-wal','.sqlite-shm','.db']):t.add(p,arcname=str(p).lstrip('/'),recursive=False)
with tarfile.open(b/'service-config.tar.gz','x:gz') as t:
 for p in pathlib.Path('/etc/nginx/conf.d').glob('*.conf'):
  text=p.read_text()
  if any(host in text for host in ['eco.febro.id','cv.febro.id','itinerary.febro.id','voltlab.febro.id','files.febro.id','play.febro.id']):
   t.add(p,arcname=str(p).lstrip('/'));manifest['nginx'][str(p)]=[l.strip() for l in text.splitlines() if any(k in l for k in ['server_name','proxy_pass','ssl_certificate '])]
 t.add(s['FragmentPath'],arcname='systemd/ls-itinerary.service')
for host in ['eco.febro.id','cv.febro.id','itinerary.febro.id','voltlab.febro.id','files.febro.id','play.febro.id']:
 try:
  with urllib.request.urlopen('https://'+host,timeout=15) as response:manifest['health'][host]={'status':response.status,'scope':'existing production only'}
 except Exception:manifest['health'][host]={'status':'failed'}
checks={}
for p in b.iterdir():
 if p.suffix=='.gz':
  with tarfile.open(p) as t:
   for member in t:
    assert not pathlib.PurePosixPath(member.name).is_absolute() and '..' not in pathlib.PurePosixPath(member.name).parts
    if member.isfile():
     f=t.extractfile(member)
     while f.read(1024*1024):pass
 checks[p.name]=hashlib.sha256(p.read_bytes()).hexdigest();p.chmod(0o600)
manifest['backupChecksums']=checks
(w/'evidence/inventory.json').write_text(json.dumps(manifest,indent=2)+'\n');(w/'evidence/backup-path').write_text(str(b));(b/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'backup':str(b),'sqlite':manifest['sqlite'],'health':manifest['health']}))
