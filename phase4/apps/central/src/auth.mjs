import { randomString, sha256, hashPassword, verifyPassword } from './security.mjs';
import { createHash } from 'node:crypto';

const emailValid = email => typeof email==='string' && /^[^\s@]{1,64}@[^\s@]{1,180}\.[^\s@]{2,}$/.test(email) && email.length<=254;
export const normalizeEmail = value => String(value||'').trim().toLowerCase();
export function publicUser(user, admins) {if(!user)return null;return {id:user.id,name:user.name,email:user.email,verified:!!user.email_verified,isAdmin:!!user.email_verified&&admins.includes(user.email),googleLinked:!!user.google_sub};}
export function passwordCheck(p) {return typeof p==='string'&&p.length>=12&&p.length<=128;}
export function displayName(n) {return String(n||'').trim().slice(0,90);}
export function isEmail(email){return emailValid(email);}
export async function sendMail(cfg,{to,subject,heading,text,button,url}){
 if (!cfg.smtpUser||!cfg.smtpPass||cfg.smtpPass.startsWith('REPLACE')) throw Object.assign(new Error('SMTP belum dikonfigurasi'),{status:503});
 const {default:nodemailer}=await import('nodemailer');
 const transport=nodemailer.createTransport({host:cfg.smtpHost,port:cfg.smtpPort,secure:cfg.smtpSecure,auth:{user:cfg.smtpUser,pass:cfg.smtpPass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:15000});
 const h=escapeHtml(heading),p=escapeHtml(text),link=escapeHtml(url),label=escapeHtml(button);
 const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${h}</title></head><body style="margin:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#162436;padding:30px 12px"><table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin:auto;background:#fff;border:1px solid #dbe5ef;border-radius:12px"><tr><td style="padding:30px 30px 16px;border-bottom:1px solid #edf1f6"><strong style="font-size:19px">Febro Ecosystem</strong><div style="font-size:12px;color:#6a7a8d;margin-top:4px">by Febro Herdyanto</div></td></tr><tr><td style="padding:28px 30px"><h1 style="font-size:24px;line-height:1.3;margin:0 0 15px">${h}</h1><p style="line-height:1.7;color:#42566b">${p}</p><p style="margin:30px 0"><a href="${link}" style="background:#2568aa;color:#fff;border-radius:7px;padding:13px 22px;text-decoration:none;display:inline-block;font-weight:bold">${label}</a></p><p style="color:#637389;font-size:12px;line-height:1.6">Jika tombol tidak berfungsi, salin tautan berikut ke browser:</p><p style="word-break:break-all;font-size:12px;color:#215e99">${link}</p><p style="color:#637389;font-size:12px">Abaikan email ini jika kamu tidak meminta perubahan akun.</p></td></tr><tr><td style="padding:20px 30px;border-top:1px solid #edf1f6;font-size:12px;color:#6a7a8d">© ${new Date().getFullYear()} Febro Ecosystem · by Febro Herdyanto</td></tr></table></body></html>`;
 await transport.sendMail({from:cfg.smtpFrom,to,subject,html,text:`${heading}\n\n${text}\n\n${url}\n\nby Febro Herdyanto`});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function createSession(store,userId){const token=randomString(48);store.saveSession(token,userId);return token;}
export {hashPassword, verifyPassword,randomString};
export function googleConfig(cfg){
 if(!cfg.googleClientId||!cfg.googleClientSecret||!cfg.googleRedirectUri)return false;
 if(!cfg.googleClientId.endsWith('.apps.googleusercontent.com')||cfg.googleClientSecret.startsWith('REPLACE')||cfg.googleClientSecret.startsWith('ISI_'))return false;
 if(cfg.production && ![`https://auth.${cfg.domain}/auth/google/callback`,`https://eco.${cfg.domain}/profile/auth/google/callback`].includes(cfg.googleRedirectUri))return false;
 return true;
}
export function googleStart(cfg,store,returnTo,userId=null){
 const state=randomString(32),verifier=randomString(48),challenge=createHash('sha256').update(verifier).digest('base64url');
 store.saveOAuth(state,verifier,returnTo,userId);
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [k,v] of Object.entries({client_id:cfg.googleClientId,redirect_uri:cfg.googleRedirectUri,response_type:'code',scope:'openid email profile',state,nonce:createHash('sha256').update('google-nonce:'+verifier).digest('base64url'),code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}))u.searchParams.set(k,v);
 return {url:u.href,state};
}
export async function googleComplete(cfg,code,verifier){
 const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000);
 try {
 const body=new URLSearchParams({client_id:cfg.googleClientId,client_secret:cfg.googleClientSecret,redirect_uri:cfg.googleRedirectUri,grant_type:'authorization_code',code,code_verifier:verifier});
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body,signal:controller.signal});
 if(!response.ok)throw Object.assign(new Error('Google OAuth token exchange gagal'),{status:401});
 const tokens=await response.json();
 const {OAuth2Client}=await import('google-auth-library');
 const ticket=await new OAuth2Client(cfg.googleClientId).verifyIdToken({idToken:tokens.id_token,audience:cfg.googleClientId});
 const payload=ticket.getPayload();
 if(payload?.nonce!==createHash('sha256').update('google-nonce:'+verifier).digest('base64url'))throw Object.assign(new Error('Google nonce mismatch'),{status:401});
 if(!payload?.sub||!payload?.email||payload.email_verified!==true)throw Object.assign(new Error('Email Google belum terverifikasi'),{status:401});
 return {sub:payload.sub,email:normalizeEmail(payload.email),name:displayName(payload.name||payload.email.split('@')[0]),authoritative:payload.email.endsWith('@gmail.com')||!!payload.hd};
 }finally{clearTimeout(timeout);}
}
