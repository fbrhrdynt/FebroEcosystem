#!/usr/bin/env python3
"""Review-only release packaging. This program has no production deployment operation."""
import pathlib,json,hashlib,tarfile,os,sys
ROOT=pathlib.Path('/opt/febro-ecosystem');WORK=ROOT/'phase5'
SKIP={'node_modules','.next','.git','data','storage','backups','uploads','vault','test-results','playwright-report','__pycache__'}
def sha(p):
 with open(p,'rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def excluded(p):return p.name.startswith('.env') or p.name.endswith(('.sqlite','.sqlite-wal','.sqlite-shm','.db','.pem','.key','.p12','.pfx','.crt','.jwk','.tsbuildinfo')) or p.is_symlink()
def prepare(app):
 source=WORK/'src'/app;release=WORK/'releases'/app;release.mkdir(exist_ok=False)
 baseline=json.loads((ROOT/'phase4/evidence/baseline.json').read_text())['apps'][app]['sourceChecksums'];files={};allfiles={}
 for folder,dirs,names in os.walk(source):
  dirs[:]=sorted(d for d in dirs if d not in SKIP and not (pathlib.Path(folder)/d).is_symlink())
  for name in sorted(names):
   p=pathlib.Path(folder)/name
   if excluded(p):continue
   rel=str(p.relative_to(source));digest=sha(p);allfiles[rel]={'sha256':digest}
   if digest!=baseline.get(rel):files[rel]={'sha256':digest,'before':baseline.get(rel)}
 with tarfile.open(release/'source.tar.gz','x:gz') as tar:
  for rel in files:tar.add(source/rel,arcname=rel,recursive=False)
 with tarfile.open(release/'candidate-source.tar.gz','x:gz') as tar:
  for rel in allfiles:tar.add(source/rel,arcname=rel,recursive=False)
 (release/'source-manifest.json').write_text(json.dumps({'app':app,'artifact_sha256':sha(release/'candidate-source.tar.gz'),'files':allfiles},indent=2)+'\n')
 manifest={'app':app,'status':'REVIEW_ONLY_NOT_DEPLOYED','artifact_sha256':sha(release/'source.tar.gz'),'files':files}
 (release/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (release/'SHA256SUMS').write_text(f"{manifest['artifact_sha256']}  source.tar.gz\n{sha(release/'manifest.json')}  manifest.json\n")
 return verify(app)
def verify(app):
 release=WORK/'releases'/app;m=json.loads((release/'manifest.json').read_text());assert sha(release/'source.tar.gz')==m['artifact_sha256']
 with tarfile.open(release/'source.tar.gz') as tar:
  assert set(tar.getnames())==set(m['files'])
  for member in tar.getmembers():
   path=pathlib.PurePosixPath(member.name);assert member.isfile() and not path.is_absolute() and '..' not in path.parts and not excluded(pathlib.Path(member.name))
   assert hashlib.sha256(tar.extractfile(member).read()).hexdigest()==m['files'][member.name]['sha256']
 full=json.loads((release/'source-manifest.json').read_text());assert sha(release/'candidate-source.tar.gz')==full['artifact_sha256']
 with tarfile.open(release/'candidate-source.tar.gz') as tar:
  assert set(tar.getnames())==set(full['files'])
  for member in tar.getmembers():
   path=pathlib.PurePosixPath(member.name);assert member.isfile() and not path.is_absolute() and '..' not in path.parts and not excluded(pathlib.Path(member.name))
   assert hashlib.sha256(tar.extractfile(member).read()).hexdigest()==full['files'][member.name]['sha256']
 return {'app':app,'changedFiles':len(m['files']),'snapshotFiles':len(full['files']),'verified':True,'productionMutation':False}
if __name__=='__main__':
 if len(sys.argv)!=3 or sys.argv[1] not in ['prepare','verify'] or sys.argv[2] not in ['central','lamariva','itinerary','voltlab','files','play']:raise SystemExit('Only prepare|verify APP supported. No deployment operation.')
 print(json.dumps((prepare if sys.argv[1]=='prepare' else verify)(sys.argv[2])))
