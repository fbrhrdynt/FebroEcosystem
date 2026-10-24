import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
// Next.js loads application secrets itself. Only read the listening port here.
const fileEnv=parseEnv(readFileSync(new URL('../.env',import.meta.url),'utf8'));
const port=Number(process.env.APP_PORT||fileEnv.APP_PORT||3025);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('APP_PORT tidak valid');
process.argv=[process.argv[0],'next','start','--hostname','127.0.0.1','--port',String(port)];
await import('next/dist/bin/next');
