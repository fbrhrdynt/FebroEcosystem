/* Safe consistent SQLite backups via VACUUM INTO, retention 14 days.
   Run with cron daily as ubuntu; do not serve the data directory publicly. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const DATA_DIR=process.env.DATA_DIR||'/opt/play/storage/tribeworld';
const folder=path.join(DATA_DIR,'backups');
fs.mkdirSync(folder,{recursive:true,mode:0o700});
const dbPath=path.join(DATA_DIR,'tribeworld.sqlite');
if(!fs.existsSync(dbPath)){console.error('Database tidak ditemukan:',dbPath);process.exit(1)}
const db=new DatabaseSync(dbPath);
const label=new Date().toISOString().replace(/[:.]/g,'-');
const file=path.join(folder,`tribeworld-${label}.sqlite`);
db.exec(`VACUUM INTO '${file.replaceAll("'","''")}'`);
db.close();
fs.chmodSync(file,0o600);
for(const f of fs.readdirSync(folder).filter(x=>/^tribeworld-\d{4}-.*\.sqlite$/.test(x)).sort().slice(0,-14))fs.rmSync(path.join(folder,f));
console.log('Backup tersimpan:',file);
