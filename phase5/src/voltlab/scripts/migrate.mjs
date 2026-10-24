import {Pool} from 'pg';
import {readdir,readFile} from 'node:fs/promises';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const c=await pool.connect();
try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtext('voltlab-migrations'))");await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){const check=await c.query('SELECT name FROM schema_migrations WHERE name=$1',[name]);if(check.rowCount)continue;await c.query(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));await c.query('INSERT INTO schema_migrations (name) VALUES ($1)',[name]);console.log('Applied',name);}await c.query('COMMIT');console.log('Database ready.');}catch(e){await c.query('ROLLBACK');console.error(e.message);process.exitCode=1;}finally{c.release();await pool.end();}
