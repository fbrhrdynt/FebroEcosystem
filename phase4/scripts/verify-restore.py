import pathlib,subprocess,json,os
backup=pathlib.Path('phase4/evidence/backup-path').read_text().strip(); base=pathlib.Path(backup)/'restore-validation';base.mkdir(mode=0o700);cluster=base/'cluster';sock=base/'socket';sock.mkdir(mode=0o700);bin='/usr/lib/postgresql/16/bin/'
def run(args):
 r=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=120)
 if r.returncode:raise RuntimeError('Isolated restore command failed; private diagnostics retained')
 return r.stdout
report={}
try:
 run([bin+'initdb','-D',str(cluster),'-A','trust','--no-locale','-E','UTF8']);run([bin+'pg_ctl','-D',str(cluster),'-l',str(base/'postgres.log'),'-o',"-c listen_addresses='' -c unix_socket_directories='"+str(sock)+"' -c port=55493",'-w','start'])
 for app in ['lamariva','itinerary','voltlab']:
  db='febro_phase4_restore_'+app;args=['-h',str(sock),'-p','55493','-U',os.environ.get('USER','ubuntu')]
  run([bin+'createdb',*args,db]);run([bin+'pg_restore',*args,'--no-owner','--no-acl','--exit-on-error','-d',db,str(pathlib.Path(backup)/(app+'.dump'))]);
  valid=run([bin+'psql',*args,'-d',db,'-Atc',"SELECT count(*) FROM pg_constraint WHERE contype='f' AND NOT convalidated"] ).strip();assert valid=='0'
  report[app]={'restore':'passed','unvalidatedForeignKeys':0,'target':'isolated unix-socket-only PostgreSQL 16; no production connection'}
finally:
 subprocess.run([bin+'pg_ctl','-D',str(cluster),'-m','fast','-w','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 pathlib.Path('phase4/evidence/restore-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
