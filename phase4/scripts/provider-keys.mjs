import fs from 'node:fs';import path from 'node:path';import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
const [operation,root]=process.argv.slice(2);if(!['init','rotate'].includes(operation)||!root||!path.isAbsolute(root))throw Error('Usage: provider-keys.mjs init|rotate /absolute/private/directory');
if(root.includes('/public')||root.includes('/apps/'))throw Error('Keep private provider state outside web roots and artifacts');
fs.mkdirSync(root,{recursive:true,mode:0o700});if(fs.lstatSync(root).isSymbolicLink()||(fs.statSync(root).mode&0o077))throw Error('Private directory required');
const file=path.join(root,'configuration.json');const key=generateKeyPairSync('rsa',{modulusLength:3072}).privateKey.export({format:'jwk'});Object.assign(key,{kid:randomUUID(),use:'sig',alg:'RS256'});
let config;
if(operation==='init'){
 if(fs.existsSync(file))throw Error('Existing signing material must never be replaced');
 const apps={lamariva:['https://cv.febro.id','/auth/febro'],itinerary:['https://itinerary.febro.id','/auth/space'],voltlab:['https://voltlab.febro.id','/api/auth/febro'],files:['https://files.febro.id','/auth/febro'],play:['https://play.febro.id','/api/leaderboard/auth/febro']};
 config={jwks:{keys:[key]},cookieKeys:[randomBytes(64).toString('base64url')],clients:Object.entries(apps).map(([app,[origin,base]])=>({client_id:'febro-'+app+'-v2',client_secret:randomBytes(48).toString('base64url'),redirect_uris:[origin+(app==='play'?'/api/leaderboard/auth/callback':base+'/callback')],post_logout_redirect_uris:[origin+base+'/logged-out'],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'client_secret_basic'}))};
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
}else{
 const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077))throw Error('Invalid configuration permissions');
 config=JSON.parse(fs.readFileSync(file,'utf8'));const backup=file+'.before-rotation-'+randomUUID();fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);fs.chmodSync(backup,0o600);config.jwks.keys.unshift(key);
 const temp=file+'.'+randomUUID();fs.writeFileSync(temp,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temp,file);
}
console.log('Persistent signing configuration saved privately. No activation performed. Retain previous keys for at least maximum token lifetime plus clock skew.');
