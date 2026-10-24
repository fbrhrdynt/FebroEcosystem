import {createSSO,nodeRequest,nodeResponse} from '../../sso/http.mjs';
import {repository,pgConnection,digest} from '../../sso/repository.mjs';
import bcrypt from 'bcryptjs';
import {rateLimit} from 'express-rate-limit';
const limit=rateLimit({windowMs:60000,limit:30});
import {pool,query} from '../database.js';
const save=req=>new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
export function febroSSO(){
 if(process.env.FEBRO_SSO_ENABLED!=='true')return (_req,_res,next)=>next();
 const origin=new URL(process.env.APP_URL).origin;
 const middleware=async(req,res,next)=>{if(!req.path.startsWith('/auth/space'))return next();try{
 const web=nodeRequest(req,origin);
 const handle=createSSO({app:'Itinerary',origin,issuer:process.env.FEBRO_SSO_ISSUER,clientId:process.env.FEBRO_SSO_CLIENT_ID,clientSecret:process.env.FEBRO_SSO_CLIENT_SECRET,basePath:'/auth/space',callbackPath:'/auth/space/callback',repo:repository(pgConnection(pool),'itinerary'),testOnly:process.env.FEBRO_SSO_TEST_ONLY==='true',
 currentLocal:async()=>{if(!req.session.user)return null;const u=(await query("SELECT * FROM users WHERE id=$1 AND status='active'",[req.session.user.id])).rows[0];return u?{...u,sessionHash:digest(req.sessionID)}:null;},
 reauthenticate:async(_r,u,password)=>u.password_hash?bcrypt.compare(String(password||''),u.password_hash):Number(req.session.authenticatedAt)>Date.now()-300000,
 localLogout:async(_r,response)=>{await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));response.headers.append('Set-Cookie',`connect.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV==='production'?'; Secure':''}`);},
 issueSession:async u=>{await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.user={id:u.id,name:u.name,email:u.email,role:u.role,status:u.status};req.session.authenticatedAt=Date.now();await save(req);}});
 const response=await handle(web);if(response)await nodeResponse(response,res);else next();
 }catch{res.status(503).send('SSO sementara tidak tersedia. Gunakan login lama.');}};
 return (req,res,next)=>req.path.startsWith('/auth/space')?limit(req,res,()=>middleware(req,res,next)):next();
}
