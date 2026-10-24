import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
const input=process.argv[2];if(!input){console.error('Usage: node scripts/setup-env.mjs https://voltlab.your-domain');process.exit(1);}
const url=new URL(input);if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password){console.error('Masukkan origin HTTPS tanpa path atau kredensial.');process.exit(1);}
if(existsSync('.env')){console.error('.env sudah ada; file tidak ditimpa. Edit dengan nano .env.');process.exit(1);}
const password=randomBytes(32).toString('hex');
writeFileSync('.env',`APP_URL=${url.origin}\nAPP_PORT=3025\nAUTH_SECRET=${randomBytes(32).toString('hex')}\nDB_PASSWORD=${password}\nDATABASE_URL=postgresql://voltlab:${password}@127.0.0.1:5432/voltlab\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n`,{mode:0o600});
console.log('.env dibuat. Isi Google OAuth credentials dengan nano .env.');
