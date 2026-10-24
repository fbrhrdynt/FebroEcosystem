import subprocess,pathlib,json,os,time
root=pathlib.Path('/opt/febro-ecosystem');work=root/'phase6';env={k:os.environ[k] for k in ['PATH','HOME','USER','LANG'] if k in os.environ};env.update(NEXT_TELEMETRY_DISABLED='1',NODE_ENV='test')
checks=[('central-syntax','central',['npm','run','check']),('central-regression','central',['npm','test']),('files-syntax','files',['npm','run','check']),('files-regression','files',['npm','test']),('itinerary-syntax','itinerary',['npm','run','check']),('itinerary-regression','itinerary',['npm','test']),('lamariva-types','lamariva',['npm','run','typecheck']),('lamariva-regression','lamariva',['npm','test']),('voltlab-types','voltlab',['npm','run','check']),('voltlab-regression','voltlab',['npm','test']),('voltlab-native-api','voltlab',['npm','run','test:api']),('play-syntax','play/services/leaderboard',['npm','run','check'])]
results=[]
for name,app,args in checks:
 start=time.time();log=work/'evidence'/('final-'+name+'.log')
 with log.open('w') as out:r=subprocess.run(args,cwd=work/'src'/app,env=env,stdout=out,stderr=out)
 item={'check':name,'exitCode':r.returncode,'seconds':round(time.time()-start,2),'log':str(log)};results.append(item);(work/'evidence/final-validation.json').write_text(json.dumps(results,indent=2)+'\n');print(name,':',r.returncode,flush=True)
if any(r['exitCode'] for r in results):raise SystemExit(1)
