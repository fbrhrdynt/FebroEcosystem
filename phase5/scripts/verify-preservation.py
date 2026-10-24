"""Read-only backup verification and production baseline comparison; no service mutations."""
import pathlib,json,hashlib,sqlite3,subprocess,urllib.request,concurrent.futures,datetime
R=pathlib.Path('/opt/febro-ecosystem');W=R/'phase5';P=R/'phase4/evidence'
def sha(p):
 with open(p,'rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=json.loads((P/'baseline.json').read_text());before=json.loads((W/'evidence/production-checksums-before.json').read_text());report={'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceDrift':{},'backupChecksums':{},'sqlite':{},'packages':{}}
for app,v in base['apps'].items():
 root=pathlib.Path(v['root']);report['sourceDrift'][app]=[k for k,d in before[app].items() if (sha(root/k) if (root/k).is_file() else None)!=d]
 p=root/('services/leaderboard/package.json' if app=='play' else 'package.json');report['packages'][app]=json.loads(p.read_text()) if p.exists() else None
for name,v in json.loads((P/'backup-integrity.json').read_text()).items():report['backupChecksums'][name]={'match':sha(v['path'])==v['sha256'],'bytes':pathlib.Path(v['path']).stat().st_size}
for app,v in base['apps'].items():report['backupChecksums'][app+'-source']={'match':sha(v['archive'])==v['sha256']}
backup=pathlib.Path((P/'backup-path').read_text().strip())
for app in ['central','files','play']:
 db=sqlite3.connect(f'file:{backup}/{app}.sqlite?mode=ro&immutable=1',uri=True);report['sqlite'][app]={'integrity':db.execute('PRAGMA integrity_check').fetchone()[0],'foreignKeyViolations':len(db.execute('PRAGMA foreign_key_check').fetchall())};db.close()
procs=json.loads(subprocess.check_output(['pm2','jlist'],text=True));names={p['name'] for p in json.loads((W/'evidence/services-before.json').read_text())['pm2']};report['pm2']=[{'name':p['name'],'pid':p['pid'],'status':p['pm2_env']['status']} for p in procs if p['name'] in names]
report['itinerary']=subprocess.check_output(['systemctl','show','ls-itinerary.service','--property=MainPID','--property=ActiveState'],text=True).splitlines()
def health(item):
 host,v=item;route='/health' if host.startswith('files.') else '/api/leaderboard/health' if host.startswith('play.') else '/login' if host.startswith('itinerary.') else '/';out={}
 for kind,url in [('loopback',f"http://127.0.0.1:{v['port']}{route}"),('https',f'https://{host}{route}')]:
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'Host':host}),timeout=15) as res:out[kind]={'status':res.status}
  except Exception as e:out[kind]={'status':'failed','errorClass':type(e).__name__}
 return host,out
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:report['health']=dict(ex.map(health,base['health'].items()))
(W/'evidence/preservation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'sourceDrift':{a:len(v) for a,v in report['sourceDrift'].items()},'backupMatches':all(v['match'] for v in report['backupChecksums'].values()),'sqlite':report['sqlite'],'health':report['health']}))
