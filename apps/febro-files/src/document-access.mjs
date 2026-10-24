import {createHash} from 'node:crypto';
const digest=s=>createHash('sha256').update(s).digest('hex');
// Read-only authority: grants remain centrally controlled by the CMS.
export function createDocumentAccess({repo,config,origin,readJson,parseCookies,limit,response,streamPreview,streamFile,err}){
 const cookieName=config.production?'__Secure-fb_document_access':'fb_document_access';
 async function grant(tokenHash){
  if(!/^[a-f0-9]{64}$/.test(tokenHash||''))throw err('Access link unavailable, expired or revoked. Request a new link at febro.id.',410);
  const secret=process.env.FILES_CMS_SERVICE_TOKEN||'';
  const base=new URL(process.env.FEBRO_CMS_API_URL||'http://127.0.0.1:3090');
  // Configuration is never derived from request input. Cleartext is loopback only.
  if(secret.length<48||base.username||base.password||!['http:','https:'].includes(base.protocol)||
   (base.protocol==='http:'&&!['127.0.0.1','[::1]','localhost'].includes(base.hostname)))throw err('Document authority unavailable',503);
  let response;
  try{response=await fetch(new URL('/api/integrations/files/v1/grant',base),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({tokenHash}),signal:AbortSignal.timeout(8000)});}catch{throw err('Document authority unavailable. Please try again.',503);}
  if([404,410].includes(response.status))throw err('Access link unavailable, expired or revoked. Request a new link at febro.id.',410);
  if(!response.ok)throw err('Document authority unavailable. Please try again.',503);
  const r=await response.json();
  if(!Number.isSafeInteger(r.id)||!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=Date.now()||!Array.isArray(r.files))throw err('Access link unavailable, expired or revoked.',410);
  return {...r,expires_at:r.expiresAt};
 }
 function files(r){return r.files.filter(f=>Number.isSafeInteger(f.id)&&typeof f.remoteId==='string').map(f=>({...f,remote_id:f.remoteId,original_name:f.name,allow_preview:f.preview===true,allow_download:f.download===true})).filter(f=>{try{repo.requireActive('service:febro-profile',f.remote_id,'file');return true;}catch{return false;}});}
 return async(req,res,u)=>{
  const p=u.pathname;if(!p.startsWith('/access'))return false;
  limit(req,'document-access',120,60000);
  if(p==='/access'&&req.method==='GET'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Approved documents · Febro Files</title><link rel="stylesheet" href="/access/style.css"><script src="/access/app.js" defer></script></head><body><main><a href="https://febro.id">← febro.id</a><p class="eyebrow">FEBRO FILES / PRIVATE ACCESS</p><h1>Your approved documents</h1><p id="status" role="status" aria-live="polite">Validating access…</p><section id="files"></section><p>This temporary folder contains only approved files. Your link is private; please do not share it.</p><a href="https://febro.id/access-request">Request document access</a></main></body></html>`);return true;
  }
  if(p==='/access/style.css'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/css'});res.end(`*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#182238;font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}main{max-width:800px;padding:32px 20px;margin:auto}a{color:#355ee8;overflow-wrap:anywhere}h1{font-size:clamp(28px,6vw,40px);letter-spacing:-.04em}.eyebrow{font-size:12px;letter-spacing:.12em;color:#6175a5}article{background:white;border:1px solid #e0e6f0;border-radius:18px;padding:20px;margin:16px 0}article a{display:inline-block;min-height:44px;padding:10px 16px;border-radius:10px;background:#edf2ff;margin:4px}h2{font-size:18px;overflow-wrap:anywhere}.error{color:#b32940}`);return true;}
  if(p==='/access/app.js'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(`'use strict';(async()=>{const status=document.querySelector('#status'),list=document.querySelector('#files');try{const token=location.hash.slice(1);history.replaceState(null,'','/access');if(token){const r=await fetch('/access/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(!r.ok)throw Error((await r.json()).error);}const r=await fetch('/access/files');const data=await r.json();if(!r.ok)throw Error(data.error);status.textContent='Access expires '+new Date(data.expiresAt).toLocaleString();for(const f of data.files){const card=document.createElement('article'),title=document.createElement('h2');title.textContent=f.caption||f.name;card.append(title);for(const action of ['preview','download'])if(f[action]){const a=document.createElement('a');a.href='/access/files/'+f.id+'/'+action;a.textContent=action==='preview'?'Preview':'Download';if(action==='preview'){a.target='_blank';a.rel='noopener';}card.append(a);}list.append(card);}if(!data.files.length)status.textContent+=' · No files are currently available.';}catch(e){status.className='error';status.textContent=e.message||'Unable to load documents. Please try again.';}})();`);return true;}
  if(p==='/access/session'&&req.method==='POST'){
   if(req.headers.origin!==origin)throw err('Invalid Origin',403);const b=await readJson(req,1024);if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))throw err('Invalid access link',410);
   const h=digest(b.token),r=await grant(h);res.setHeader('Set-Cookie',`${cookieName}=${b.token}; HttpOnly; SameSite=Strict; Path=/access; Max-Age=${Math.max(1,Math.floor((r.expires_at-Date.now())/1000))}${config.production?'; Secure':''}`);response(res,200,{ok:true});return true;
  }
  const cookie=parseCookies(req)[cookieName];const r=await grant(typeof cookie==='string'&&/^[a-f0-9]{64}$/.test(cookie)?digest(cookie):'');
  if(p==='/access/files'&&req.method==='GET'){response(res,200,{expiresAt:r.expires_at,files:files(r).map(f=>({id:f.id,name:f.original_name,caption:f.caption,preview:!!f.allow_preview,download:!!f.allow_download}))});return true;}
  const m=p.match(/^\/access\/files\/(\d+)\/(preview|download)$/);
  if(m&&['GET','HEAD'].includes(req.method)){
   const f=files(r).find(f=>f.id===Number(m[1]));if(!f||!f[m[2]==='preview'?'allow_preview':'allow_download'])throw err('File unavailable',404);
   const node=repo.requireActive('service:febro-profile',f.remote_id,'file');repo.audit('cms-access:'+r.id,'document.'+m[2],node.id);if(m[2]==='preview')streamPreview(req,res,node);else if(req.method==='GET')streamFile(res,node,f.original_name);else throw err('Method not allowed',405);return true;
  }
  throw err('File unavailable',404);
 };
}
