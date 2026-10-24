import {Pool,PoolClient} from 'pg';
const globalDb=globalThis as unknown as {voltlabPool?:Pool};
export function db(){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL belum dikonfigurasi.');return globalDb.voltlabPool??=(new Pool({connectionString:process.env.DATABASE_URL,max:10,idleTimeoutMillis:30000,connectionTimeoutMillis:5000}));}
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>){const client=await db().connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
