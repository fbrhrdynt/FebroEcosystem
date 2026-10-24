import subprocess,pathlib,json,os,time,concurrent.futures,secrets
w=pathlib.Path('/opt/febro-ecosystem/phase5')
def build(app):
 start=time.time();p=w/'evidence'/('build-'+app+'-final.log');env={k:os.environ[k] for k in ['PATH','HOME','USER','LANG'] if k in os.environ};ephemeral=secrets.token_urlsafe(48);env.update(NEXT_TELEMETRY_DISABLED='1',NODE_ENV='production',AUTH_SECRET=ephemeral,BETTER_AUTH_SECRET=ephemeral,SESSION_SECRET=ephemeral,APP_URL='https://build.example.invalid',DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:1/febro_phase5_build')
 with p.open('w') as f:r=subprocess.run(['npm','run','build'],cwd=w/'src'/app,env=env,stdout=f,stderr=f)
 return {'app':app,'exitCode':r.returncode,'seconds':round(time.time()-start,2),'log':str(p),'environment':'ephemeral synthetic build secrets; no production DB or OAuth credentials'}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:results=list(ex.map(build,['lamariva','voltlab']))
(w/'evidence/build-final-summary.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results));assert all(r['exitCode']==0 for r in results)
