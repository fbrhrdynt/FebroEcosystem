import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.env.ECOSYSTEM_ROOT||'/opt/febro-ecosystem';
const file=path.join(root,'src','server.mjs'),oidc=path.join(root,'src','oidc.mjs');
const here=path.resolve(import.meta.dirname,'..');
if(!fs.existsSync(file))throw Error('Existing Febro Space not found at '+file);
const old=fs.readFileSync(file,'utf8');
if(old.includes('initOidc')&&old.includes('/oauth/authorize')){console.log('OIDC bridge already installed; no source changes.');process.exit(0);}
const replacements=[
 ["import { renderQr } from './qr.mjs';", "import { renderQr } from './qr.mjs';\nimport { initOidc } from './oidc.mjs';"],
 ["const store=createStore(config.dataDir);", "const store=createStore(config.dataDir);\nconst oidc=initOidc(store.db,config.dataDir,`https://auth.${config.domain}`);"],
 [" rate(req,'all',300,60000);", " rate(req,'all',300,60000);"+fs.readFileSync(path.join(here,'auth-patch','oidc-routing.inc'),'utf8')]
];
let out=old;
for(const [search,change] of replacements){const n=out.split(search).length-1;if(n!==1)throw Error('Unexpected source version: cannot safely patch marker: '+search.slice(0,48));out=out.replace(search,change);}
const backup=file+'.before-files-oidc.'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'.bak';
fs.copyFileSync(file,backup);
if(!fs.existsSync(oidc))fs.copyFileSync(path.join(here,'auth-patch','oidc.mjs'),oidc);
fs.writeFileSync(file,out);
const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
if(check.status!==0){fs.copyFileSync(backup,file);throw Error('Syntax check failed; reverted source. '+check.stderr);}
console.log('Febro auth patched safely. Backup:',backup);
