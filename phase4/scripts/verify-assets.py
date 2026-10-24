import pathlib,sqlite3,tarfile,json,hashlib
backup=pathlib.Path('phase4/evidence/backup-path').read_text().strip();base=pathlib.Path(backup);results={}
with tarfile.open(base/'assets-and-private-config.tar.gz') as archive:
 members={m.name:m for m in archive.getmembers() if m.isfile()}
 for app in ['files','central']:
  db=sqlite3.connect('file:'+str(base/(app+'.sqlite'))+'?mode=ro',uri=True);expected=[]
  if app=='files':
   for key,checksum in db.execute("SELECT storage_key,sha256 FROM nodes WHERE storage_key IS NOT NULL"):expected.append(('opt/febro-files/data/vault/'+key[:2]+'/'+key,checksum))
  else:
   for row in db.execute('SELECT source_path,source_hash,output_path,output_hash FROM documents'):
    for name,checksum in [(row[0],row[1]),(row[2],row[3])]:
     if name:expected.append((name.lstrip('/'),checksum))
  missing=0;mismatch=0
  for name,checksum in expected:
   if name not in members:missing+=1;continue
   if checksum:
    with archive.extractfile(members[name]) as f:
     if hashlib.file_digest(f,'sha256').hexdigest()!=checksum:mismatch+=1
  results[app]={'referencedAssets':len(expected),'missing':missing,'checksumMismatches':mismatch};db.close()
pathlib.Path('phase4/evidence/assets-verification.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results));assert all(v['missing']==0 and v['checksumMismatches']==0 for v in results.values())
