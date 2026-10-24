import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export const callbacks={lamariva:'/auth/febro/callback',itinerary:'/auth/space/callback',voltlab:'/api/auth/febro/callback',files:'/auth/febro/callback',play:'/api/leaderboard/auth/callback'};
const production=new Set(['eco.febro.id','auth.febro.id','cv.febro.id','itinerary.febro.id','voltlab.febro.id','files.febro.id','play.febro.id']);
function https(value,path){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.hostname.includes('*')||production.has(u.hostname)||u.hostname.endsWith('.invalid')||u.hostname==='localhost'||u.pathname!==path)throw Error('Endpoint HTTPS staging terpisah yang disetujui wajib tersedia');return u;}
export function validateStaging(config){
 if(config.deployment!=='staging'||config.authorized!==true)throw Error('Otorisasi endpoint staging belum tersedia');
 const issuer=https(config.issuer,'/profile');
 for(const [app,path] of Object.entries(callbacks)){
  const c=config.apps?.[app];if(!c)throw Error('Registrasi aplikasi staging belum lengkap');
  const origin=https(c.origin,'/');if(c.callback!==origin.origin+path)throw Error('Callback staging harus exact dan tetap pada origin staging');
  https(c.callback,path);
  const logout=(app==='play'?'/api/leaderboard/auth/febro':path.slice(0,-9))+'/logged-out';
  if(c.postLogout!==origin.origin+logout)throw Error('Post logout staging harus exact');
 }
 if(config.google?.accepted!==true)throw Error('BLOCKED: registrasi Google staging belum diterima');
 if(!config.google.clientIdConfigured||!config.google.secretConfigured||!config.separateSecretsConfirmed)throw Error('Secret staging terpisah belum diverifikasi');
 https(config.google.callback,'/profile/auth/google/callback');
 if(new URL(config.google.callback).origin!==issuer.origin)throw Error('Callback Google staging harus pada pusat staging');
 return {status:'CONFIG_VALID_ONLY',realGoogleAuthentication:'NOT_TESTED',httpsAcceptance:'NOT_TESTED'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{console.log(JSON.stringify(validateStaging(JSON.parse(fs.readFileSync(process.argv[2],'utf8')))));}catch{console.error('BLOCKED: lengkapi dan verifikasi konfigurasi staging terpisah; tidak ada aktivasi dilakukan');process.exitCode=1;}}
