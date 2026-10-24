import urllib.request,urllib.error,pathlib,json,datetime,hashlib,subprocess
root=pathlib.Path('/opt/febro-ecosystem');baseline=json.loads((root/'phase4/evidence/baseline.json').read_text());result={'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'local':{},'publicHTTPS':{},'productionSourceDrift':{}}
for host,info in baseline['health'].items():
 port=info['port'];route='/health' if host=='files.febro.id' else '/api/leaderboard/health' if host=='play.febro.id' else '/login' if host=='itinerary.febro.id' else '/'
 for section,url in [('local',f'http://127.0.0.1:{port}{route}'),('publicHTTPS',f'https://{host}{route}')]:
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'Host':host}),timeout=15) as r:result[section][host]={'status':r.status,'certificateVerified':section=='publicHTTPS'}
  except Exception as e:result[section][host]={'status':'failed','failureClass':type(e).__name__}
for app,info in baseline['apps'].items():
 changed=[]
 for relative,expected in info['sourceChecksums'].items():
  p=pathlib.Path(info['root'])/relative
  if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:changed.append(relative)
 result['productionSourceDrift'][app]=changed
j=json.loads(subprocess.check_output(['pm2','jlist'],text=True));names={'febro-ecosystem','lamariva','voltlab','febro-files','febro-arcade-api'};result['pm2']=[{'name':p['name'],'pid':p['pid'],'status':p['pm2_env']['status']} for p in j if p['name'] in names];result['itineraryService']=subprocess.check_output(['systemctl','show','ls-itinerary.service','--property=MainPID','--property=ActiveState'],text=True).splitlines()
(root/'phase4/evidence/final-health.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'local':result['local'],'publicHTTPS':result['publicHTTPS'],'sourceDriftCount':{a:len(v) for a,v in result['productionSourceDrift'].items()}},indent=2))
