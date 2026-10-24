import {Pool} from 'pg';
const pool=new Pool({connectionString:process.env.DATABASE_URL});try{await pool.query('DELETE FROM sessions WHERE expires_at<now()');await pool.query('DELETE FROM rate_limits WHERE reset_at<now()');console.log('Expired sessions and rate limits removed.');}finally{await pool.end();}
