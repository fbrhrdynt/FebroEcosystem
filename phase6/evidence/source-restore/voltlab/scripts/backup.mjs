import {spawn} from 'node:child_process';
import {mkdirSync,createWriteStream,unlinkSync} from 'node:fs';
import {createGzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
const u=new URL(process.env.DATABASE_URL||'');
mkdirSync('backups',{recursive:true,mode:0o700});
const file=`backups/voltlab-${new Date().toISOString().replace(/[:.]/g,'-')}.sql.gz`;
const dump=spawn('pg_dump',['--host',u.hostname,'--port',u.port||'5432','--username',decodeURIComponent(u.username),'--dbname',decodeURIComponent(u.pathname.slice(1)),'--no-password'],{env:{...process.env,PGPASSWORD:decodeURIComponent(u.password)},stdio:['ignore','pipe','inherit']});
const complete=new Promise((resolve,reject)=>{dump.on('error',reject);dump.on('close',code=>code===0?resolve():reject(new Error('pg_dump gagal')));});
try{await Promise.all([pipeline(dump.stdout,createGzip(),createWriteStream(file,{mode:0o600})),complete]);console.log(`Backup: ${file}`);}catch(e){try{unlinkSync(file);}catch{}throw e;}
