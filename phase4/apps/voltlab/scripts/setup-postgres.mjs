import {spawnSync} from 'node:child_process';
// Run under the same user as PM2, after setup-env. sudo only applies to psql.
const password=process.env.DB_PASSWORD;
if(!/^[a-f0-9]{64}$/.test(password||''))throw new Error('DB_PASSWORD harus 64 hex dari setup-env.mjs.');
const url=new URL(process.env.DATABASE_URL||'');
if(url.protocol!=='postgresql:'||(url.port&&url.port!=='5432')||url.username!=='voltlab'||url.pathname!=='/voltlab'||url.hostname!=='127.0.0.1'||decodeURIComponent(url.password)!==password)throw new Error('Gunakan konfigurasi default setup-env untuk bootstrap; database custom harus dibuat manual.');
function sql(input){const r=spawnSync('sudo',['-u','postgres','psql','--no-psqlrc','--dbname=postgres','--tuples-only','--no-align','--quiet','--set=ON_ERROR_STOP=1'],{input,encoding:'utf8'});if(r.error||r.status!==0)throw new Error('Setup PostgreSQL gagal. Pastikan PostgreSQL aktif dan user mempunyai akses sudo.');return r.stdout.trim();}
if(sql("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='voltlab') OR EXISTS(SELECT 1 FROM pg_database WHERE datname='voltlab');")!=='f')throw new Error('Role/database voltlab sudah ada. Tidak diubah. Cocokkan DATABASE_URL dengan database tersebut lalu jalankan db:migrate.');
sql(`CREATE ROLE voltlab LOGIN PASSWORD '${password}';\nCREATE DATABASE voltlab OWNER voltlab;`);
console.log('Role dan database voltlab dibuat. Jalankan npm run db:migrate.');
