import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {randomUUID} from 'node:crypto';
import {appUrl,authSecret,sessionResponse,User,cookieOptions} from '../../../../../server/auth';
import {readState,safeEqual} from '../../../../../server/crypto.mjs';
import {adminUsername,normalizeEmail,reservedUsername} from '../../../../../server/policy.mjs';
import {transaction} from '../../../../../server/db';
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const q=new URL(req.url).searchParams;const jar=await cookies();const flow=readState(jar.get('voltlab-oauth')?.value,authSecret());jar.delete('voltlab-oauth');
 if(q.has('error')||!q.get('code')||!safeEqual(q.get('state'),flow.state))throw Error('OAuth state rejected');
 const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code:q.get('code')!,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,redirect_uri:appUrl()+'/api/auth/google/callback',grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(15000)});
 if(!tokenResponse.ok)throw Error('OAuth code exchange failed');const tokens=await tokenResponse.json() as {id_token?:string};if(!tokens.id_token)throw Error('Missing ID token');
 const {payload:p}=await jwtVerify(tokens.id_token,jwks,{issuer:['https://accounts.google.com','accounts.google.com'],audience:process.env.GOOGLE_CLIENT_ID,algorithms:['RS256'],requiredClaims:['sub','email','email_verified','nonce','exp','iat']});
 if(p.email_verified!==true||typeof p.email!=='string'||!p.sub||!safeEqual(p.nonce,flow.nonce)||(p.azp&&p.azp!==process.env.GOOGLE_CLIENT_ID))throw Error('Google identity not verified');
 const email=normalizeEmail(p.email),sub=p.sub;
 const user=await transaction(async client=>{
  // Advisory lock serializes first-login account linking for this email.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[email]);
  const r=await client.query<User>('SELECT * FROM users WHERE google_sub=$1 OR email=$2 FOR UPDATE',[sub,email]);
  let u=r.rows.find(u=>u.google_sub===sub)||r.rows[0];
  if(u){if(u.email!==email||u.google_sub&&u.google_sub!==sub||u.status!=='active')throw Error('Account unavailable');const update=await client.query<User>('UPDATE users SET google_sub=$1,email_verified=true WHERE id=$2 RETURNING *',[sub,u.id]);u=update.rows[0];}
  else{let username=adminUsername(email)||email.split('@')[0].replace(/[^a-z0-9_]/g,'').slice(0,24)||'learner';if(!adminUsername(email)&&(reservedUsername(username)||(await client.query('SELECT id FROM users WHERE username=$1',[username])).rows.length))username='learner_'+randomUUID().slice(0,8);const created=await client.query<User>('INSERT INTO users (id,email,username,name,google_sub,email_verified) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',[randomUUID(),email,username,String(p.name||username).slice(0,100),sub]);u=created.rows[0];}
  await client.query('INSERT INTO audit_events (actor_id,action,target_id) VALUES ($1,$2,$1)',[u.id,'google_login']);return u;
 });
 const response=await sessionResponse(user,true);response.cookies.set('voltlab-oauth','',{...cookieOptions(),maxAge:0});return response;
 }catch(e){console.error('Google login failed',e instanceof Error?e.message:'unknown');const response=NextResponse.redirect(new URL('/login?error=google',appUrl()));response.cookies.set('voltlab-oauth','',{...cookieOptions(),maxAge:0});return response;}}
