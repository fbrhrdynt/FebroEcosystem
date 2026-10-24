import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const dir=fs.readFileSync(new URL('../evidence/backup-path',import.meta.url),'utf8');const results={};
for(const [app,root] of Object.entries({lamariva:'/opt/lamariva',itinerary:'/opt/ls_itinerary',voltlab:'/opt/voltlab'})){
 const env={};for(const line of fs.readFileSync(root+'/.env','utf8').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^(["'])(.*)\1$/,'$2');}
 if(!env.DATABASE_URL){results[app]='blocked: alternate DB configuration';continue;}
 const u=new URL(env.DATABASE_URL);const file=dir+'/'+app+'.dump';if(fs.existsSync(file))throw Error('Backup exists');
 const childEnv={...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGCONNECT_TIMEOUT:'5'};
 const r=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl','--file='+file],{env:childEnv,encoding:'utf8',timeout:120000});
 if(r.status!==0){results[app]='blocked: pg_dump failed (details withheld)';continue;}fs.chmodSync(file,0o600);
 const v=spawnSync('pg_restore',['--list',file],{encoding:'utf8'});results[app]=v.status===0?'archive catalog verified; isolated restoration pending':'catalog verification failed';
}
fs.writeFileSync(new URL('../evidence/postgres-backups.json',import.meta.url),JSON.stringify(results,null,2));console.log(results);
