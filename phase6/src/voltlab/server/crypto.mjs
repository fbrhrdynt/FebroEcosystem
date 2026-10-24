import {randomBytes,scrypt,timingSafeEqual,createHash,createHmac} from 'node:crypto';
import {promisify} from 'node:util';
const scryptAsync=promisify(scrypt);
export const randomToken=()=>randomBytes(32).toString('base64url');
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export async function hashPassword(password){if(password.length<14||password.length>256)throw Error('Gunakan password 14–256 karakter.');const salt=randomBytes(16).toString('hex');const key=await scryptAsync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt:${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password,stored){if(typeof password!=='string'||password.length>256||!stored)return false;const [kind,salt,key]=stored.split(':');if(kind!=='scrypt'||!salt||!key)return false;const derived=await scryptAsync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return safeEqual(derived.toString('hex'),key);}
export function signState(value,secret){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');}
export function readState(value,secret){const [data,sig]=String(value||'').split('.');if(!data||!sig||!safeEqual(sig,createHmac('sha256',secret).update(data).digest('base64url')))throw Error('Invalid state');const out=JSON.parse(Buffer.from(data,'base64url').toString());if(!out.exp||out.exp<Date.now())throw Error('Expired state');return out;}
