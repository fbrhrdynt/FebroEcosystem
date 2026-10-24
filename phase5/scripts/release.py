#!/usr/bin/env python3
"""Prepare releases freely; all production mutations require a separate reviewed approval record."""
import pathlib,json,hashlib,tarfile,datetime,os,subprocess,tempfile,shutil,sys,fcntl,urllib.request
ROOT=pathlib.Path('/opt/febro-ecosystem');WORK=ROOT/'phase4';BASE=json.loads((WORK/'evidence/baseline.json').read_text());APPS={a:v['root'] for a,v in BASE['apps'].items()};PM2={'central':'febro-ecosystem','lamariva':'lamariva','voltlab':'voltlab','files':'febro-files','play':'febro-arcade-api'};HEALTH={'central':'https://eco.febro.id/','lamariva':'https://cv.febro.id/','itinerary':'https://itinerary.febro.id/login','voltlab':'https://voltlab.febro.id/','files':'https://files.febro.id/health','play':'https://play.febro.id/api/leaderboard/health'}
SKIP={'node_modules','.next','.git','data','storage','backups','test-results','playwright-report','__pycache__'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def selected(app):
 stage=WORK/'apps'/app;out={};baseline=BASE['apps'][app]['sourceChecksums']
 for folder,dirs,names in os.walk(stage):
  dirs[:]=[d for d in dirs if d not in SKIP]
  for name in names:
   p=pathlib.Path(folder)/name;rel=str(p.relative_to(stage))
   if p.is_symlink() or name.startswith('.env') or name.endswith('.tsbuildinfo') or name=='next-env.d.ts':continue
   digest=sha(p)
   if digest!=baseline.get(rel):out[rel]={'sha256':digest,'before':baseline.get(rel)}
 return out
def backups():
 for info in json.loads((WORK/'evidence/backup-integrity.json').read_text()).values():
  if sha(pathlib.Path(info['path']))!=info['sha256']:raise RuntimeError('Backup archive/database checksum failed')
 assets=json.loads((WORK/'evidence/assets-verification.json').read_text())
 if any(v['missing'] or v['checksumMismatches'] for v in assets.values()):raise RuntimeError('Asset snapshot consistency failed')
 for info in BASE['apps'].values():
  if sha(pathlib.Path(info['archive']))!=info['sha256']:raise RuntimeError('Original backup checksum failed')
 restores=json.loads((WORK/'evidence/restore-results.json').read_text())
 if len(restores)!=3 or any(v['restore']!='passed' for v in restores.values()):raise RuntimeError('Isolated backup restoration required')
def health(app):
 with urllib.request.urlopen(HEALTH[app],timeout=15) as response:
  if response.status!=200:raise RuntimeError('Public HTTPS health failed')
def command(args,cwd,env=None):
 # Capture private diagnostics; callback URLs/credentials are never emitted to reports.
 log=WORK/'evidence'/('release-command-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')+'.log')
 fd=os.open(log,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
 with os.fdopen(fd,'wb') as output:
  r=subprocess.run(args,cwd=cwd,env=env,stdout=output,stderr=output)
 if r.returncode:raise RuntimeError('Release command failed; private diagnostic log retained')
def restore_changed(target,archive,manifest):
 with tarfile.open(archive) as tar:
  for rel,info in manifest.items():
   p=target/rel
   if info['before'] is None:
    if p.exists() and sha(p)==info['sha256']:p.unlink()
   else:
    member=tar.getmember(rel);p.parent.mkdir(parents=True,exist_ok=True)
    with tar.extractfile(member) as source:p.write_bytes(source.read())
    os.chmod(p,member.mode);os.chown(p,member.uid,member.gid)
def main():
 if len(sys.argv)<3:raise RuntimeError('Usage: release.py prepare|verify|deploy|rollback APP [approval.json]')
 op,app=sys.argv[1:3]
 if app not in APPS:raise RuntimeError('Unknown application')
 release=WORK/'releases'/app
 if op=='prepare':
  release.mkdir(parents=True,exist_ok=False);files=selected(app)
  with tarfile.open(release/'source.tar.gz','x:gz') as tar:
   for rel in files:tar.add(WORK/'apps'/app/rel,arcname=rel,recursive=False)
  (release/'manifest.json').write_text(json.dumps({'app':app,'artifact_sha256':sha(release/'source.tar.gz'),'files':files},indent=2)+'\n');print('Prepared',app,release);return
 manifest=json.loads((release/'manifest.json').read_text());artifact=release/'source.tar.gz'
 if sha(artifact)!=manifest['artifact_sha256']:raise RuntimeError('Artifact checksum failed')
 backups()
 if op=='verify':print('Artifact and backups verified:',app);return
 if op not in ['deploy','rollback'] or len(sys.argv)!=4:raise RuntimeError('Explicit deployment/rollback approval record required')
 approval_path=pathlib.Path(sys.argv[3]).resolve();approval=json.loads(approval_path.read_text());at=datetime.datetime.fromisoformat(approval.get('approved_at','').replace('Z','+00:00'))
 if approval.get('app')!=app or approval.get('operation')!=op or approval.get('artifact_sha256')!=manifest['artifact_sha256'] or approval.get('https_acceptance') is not True or not approval.get('approved_by') or not 0<=(datetime.datetime.now(datetime.timezone.utc)-at).total_seconds()<86400:raise RuntimeError('Approval/staging gate failed')
 audit_name='play-services-leaderboard' if app=='play' else app
 vulnerabilities=json.loads((WORK/'evidence'/('audit-final-'+audit_name+'.json')).read_text()).get('metadata',{}).get('vulnerabilities',{})
 if op=='deploy' and (vulnerabilities.get('high',0) or vulnerabilities.get('critical',0)):raise RuntimeError('High/critical dependency vulnerabilities block activation')
 if app not in PM2:raise RuntimeError('Itinerary uses ls-itinerary.service; activation requires an explicitly authorized systemd operator')
 target=pathlib.Path(APPS[app]);
 if op=='deploy':health(app)
 lock=open(WORK/'release.lock','w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 before=release/'deployment-before.tar.gz';receipt=release/'deployment-receipt.json'
 if op=='deploy':
  if before.exists() or receipt.exists():raise RuntimeError('Existing deployment receipt; never overwrite backups')
  for rel,info in manifest['files'].items():
   p=target/rel
   if (sha(p) if p.exists() else None)!=info['before']:raise RuntimeError('Production source drift: '+rel)
  with tarfile.open(before,'x:gz') as tar:
   for rel,info in manifest['files'].items():
    if info['before'] is not None:tar.add(target/rel,arcname=rel,recursive=False)
  os.chmod(before,0o600)
  receipt.write_text(json.dumps({'app':app,'backup_sha256':sha(before),'artifact_sha256':manifest['artifact_sha256']}));os.chmod(receipt,0o600)
 else:
  rec=json.loads(receipt.read_text())
  if sha(before)!=rec['backup_sha256']:raise RuntimeError('Rollback backup failed integrity')
 if op=='deploy':
  args=['node']
  if (target/'.env').exists():args+=['--env-file=.env']
  command(args+[str(WORK/'apps'/app/'sso/preflight.mjs'),app],target)
 command(['pm2','stop',PM2[app]],target)
 try:
  if op=='deploy':
   with tarfile.open(artifact) as tar:
    for rel,info in manifest['files'].items():
     p=target/rel;p.parent.mkdir(parents=True,exist_ok=True)
     with tar.extractfile(rel) as source:
      temp=p.with_name(p.name+'.phase4-tmp');temp.write_bytes(source.read());os.chmod(temp,tar.getmember(rel).mode)
      if p.exists():
       st=p.stat();os.chown(temp,st.st_uid,st.st_gid)
      os.replace(temp,p)
  else:restore_changed(target,before,manifest['files'])
  
  if (target/'sso/package.json').exists():command(['npm','ci','--ignore-scripts','--omit=dev'],target/'sso')
  dependency_root=target/'services/leaderboard' if app=='play' else target
  if (dependency_root/'package-lock.json').exists():command(['npm','ci','--ignore-scripts'],dependency_root)
  elif json.loads((dependency_root/'package.json').read_text()).get('dependencies'):raise RuntimeError('Dependency lockfile required')
  if app in ['lamariva','voltlab']:command(['npm','run','build'],target)
  else:command(['node','--check',str(target/({'central':'src/server.mjs','files':'src/server.mjs','play':'services/leaderboard/server.mjs'}[app]))],target)
  if op=='deploy' and app!='central':
   env={**os.environ,'FEBRO_APPROVAL_FILE':str(approval_path)};args=['node']
   if (target/'.env').exists():args+=['--env-file=.env']
   command(args+['sso/migrate-approved.mjs',app,'--apply-approved'],target,env)
  command(['pm2','restart',PM2[app],'--update-env'],target);health(app)
 except Exception:
  # Restore source only. Never restore a database or newly created user content.
  try:command(['pm2','stop',PM2[app]],target)
  except Exception:pass
  restore_changed(target,before,manifest['files'])
  raise RuntimeError('Deployment stopped; source restored. Service remains subject to manual recovery with original dependencies/build. User data was not reverted.')
 print(op,'completed:',app)
if __name__=='__main__':
 try:main()
 except Exception as e:print(str(e),file=sys.stderr);sys.exit(1)
