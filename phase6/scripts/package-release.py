import pathlib,os,tarfile,json,hashlib
w=pathlib.Path('/opt/febro-ecosystem/phase6');release=w/'releases';release.mkdir(exist_ok=False)
ignored={'node_modules','.next','.git','data','storage','uploads','exports','__pycache__'}
result={}
for app in ['central','lamariva','itinerary','voltlab','files','play']:
 root=w/'src'/app;out=release/app;out.mkdir();files=[]
 for folder,dirs,names in os.walk(root):
  dirs[:]=[d for d in dirs if d not in ignored]
  for name in names:
   p=pathlib.Path(folder)/name
   if p.is_file() and not p.is_symlink() and not name.startswith('.env') and not name.endswith(('.sqlite','.db','.log','.tsbuildinfo','.orig','.bak')) and '.bak.' not in name:files.append(p)
 manifest={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
 archive=out/'source.tar.gz'
 with tarfile.open(archive,'x:gz') as t:
  for p in sorted(files):t.add(p,arcname=str(p.relative_to(root)),recursive=False)
 with tarfile.open(archive) as t:
  assert set(t.getnames())==set(manifest)
  for member in t:
   with t.extractfile(member) as f:assert hashlib.file_digest(f,'sha256').hexdigest()==manifest[member.name]
 doc={'application':app,'source':str(root),'archiveSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':manifest,'activated':False,'credentialsIncluded':False}
 (out/'manifest.json').write_text(json.dumps(doc,indent=2)+'\n');result[app]={'files':len(files),'verified':True,'archiveSHA256':doc['archiveSHA256']}
(w/'evidence/release-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
