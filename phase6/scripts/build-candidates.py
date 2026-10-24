import pathlib,os,secrets,subprocess,json,time
w=pathlib.Path('/opt/febro-ecosystem/phase6');results=[]
for app in ['lamariva','voltlab']:
 env={k:os.environ[k] for k in ['PATH','HOME','USER','LANG'] if k in os.environ};secret=secrets.token_urlsafe(48)
 env.update(NODE_ENV='production',NODE_OPTIONS='--max-old-space-size=768',NEXT_TELEMETRY_DISABLED='1',AUTH_SECRET=secret,BETTER_AUTH_SECRET=secret,SESSION_SECRET=secret,APP_URL='https://build.example.invalid',DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:1/febro_phase6_build')
 start=time.time()
 with (w/'evidence'/('build-'+app+'.log')).open('w') as out:r=subprocess.run(['npm','run','build'],cwd=w/'src'/app,env=env,stdout=out,stderr=out)
 results.append({'app':app,'exitCode':r.returncode,'seconds':round(time.time()-start,2),'environment':'synthetic only'})
 (w/'evidence/build-results.json').write_text(json.dumps(results,indent=2));print(app,r.returncode,flush=True)
assert all(r['exitCode']==0 for r in results)
