import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const appsRoot=process.env.ECOSYSTEM_ROOT||'/opt/febro-ecosystem';
const filesRoot=process.env.FILES_ROOT||'/opt/febro-files';
const target=path.join(appsRoot,'data','oidc-clients.json');
const envFile=path.join(filesRoot,'.env');
const id='febro-files',redirect='https://files.febro.id/auth/callback';
if(!fs.existsSync(path.join(appsRoot,'src','oidc.mjs')))throw Error('Apply the identity provider patch to /opt/febro-ecosystem first');
fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
let clients=[];
if(fs.existsSync(target)){const prev=JSON.parse(fs.readFileSync(target,'utf8'));if(!Array.isArray(prev))throw Error('OIDC clients configuration invalid');clients=prev;}
const existing=clients.find(c=>c.client_id===id);
let secret=existing?.client_secret;
if(!secret){secret=randomBytes(48).toString('base64url');clients.push({client_id:id,client_secret:secret,redirect_uris:[redirect],name:'Febro Files'});}
else if(!existing.redirect_uris.includes(redirect))throw Error('Files client has mismatching redirect URI: manual review required');
fs.writeFileSync(target,JSON.stringify(clients,null,2)+'\n',{mode:0o600});fs.chmodSync(target,0o600);
let env=fs.existsSync(envFile)?fs.readFileSync(envFile,'utf8'):fs.readFileSync(path.join(filesRoot,'.env.example'),'utf8');
const get=k=>env.match(new RegExp(`^${k}=(.*)$`,'m'))?.[1]?.trim();
function set(k,v){env=new RegExp(`^${k}=.*$`,'m').test(env)?env.replace(new RegExp(`^${k}=.*$`,'m'),`${k}=${v}`):env.trimEnd()+`\n${k}=${v}\n`;}
set('OIDC_CLIENT_SECRET',secret);
if(!get('SESSION_SECRET')||get('SESSION_SECRET').startsWith('SET_BY'))set('SESSION_SECRET',randomBytes(56).toString('base64url'));
if(!get('ADMIN_EMAILS'))set('ADMIN_EMAILS','febroherdyanto@outlook.com');
fs.writeFileSync(envFile,env,{mode:0o600});fs.chmodSync(envFile,0o600);
console.log('OIDC client configured without printing secrets. Existing client secret preserved.');
