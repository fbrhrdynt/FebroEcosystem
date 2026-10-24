// Executes the real API handlers and auth/policy logic against embedded PostgreSQL.
// Only the DB transport and Next's cookie context are substituted in this harness.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hashToken,randomToken} from '../server/crypto.mjs';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'voltlab-api-'));
const pg=new PGlite();globalThis.__pg=pg;globalThis.__testCookie='';
process.env.APP_URL='https://voltlab.example.com';process.env.AUTH_SECRET=randomToken();
const inputs=['server/auth.ts','app/api/workspace/route.ts','app/api/admin/users/route.ts','app/api/admin/audit/route.ts','lib/voltlab/model.ts','lib/voltlab/catalog.ts'];
function write(file,text){const dest=path.join(temp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text)}
for(const source of inputs){let text=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;text=text.replace(/from ['"](\.[^'"]+)['"]/g,(_,p)=>`from '${p.endsWith('.mjs')?p:p+'.mjs'}'`).replace(/from ['"]zod['"]/g,`from '${require.resolve('zod').replace(/index\.cjs$/,'index.js')}'`).replace(/from ['"]next\/server['"]/g,`from '${require.resolve('next/server')}'`).replace(/from ['"]next\/headers['"]/g,"from './cookies-test.mjs'");write(source.replace(/\.ts$/,'.mjs'),text);}
for(const file of ['server/policy.mjs','server/crypto.mjs'])write(file,fs.readFileSync(file,'utf8'));
write('server/cookies-test.mjs',"export async function cookies(){return {get:()=>globalThis.__testCookie?{value:globalThis.__testCookie}:undefined}};");
write('server/db.mjs',`const adapt=client=>({query:async(sql,params=[])=>{const r=await client.query(sql,params);return {...r,rowCount:r.affectedRows??r.rows.length};}});export function db(){return adapt(globalThis.__pg)};export async function transaction(fn){return globalThis.__pg.transaction(c=>fn(adapt(c)));}`);
const load=file=>import(pathToFileURL(path.join(temp,file)).href);
try{
 await pg.exec(fs.readFileSync('migrations/001_initial.sql','utf8'));
 const ids={admin:randomUUID(),alice:randomUUID(),bob:randomUUID()};const tokens={};
 for(const [name,id] of Object.entries(ids)){const email=name==='admin'?'febroherdyanto98@gmail.com':name+'@example.com';await pg.query('INSERT INTO users (id,email,username,name,email_verified) VALUES ($1,$2,$3,$3,true)',[id,email,name==='admin'?'febroherdyanto':name]);tokens[name]=randomToken();await pg.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '1 day')",[hashToken(tokens[name]),id]);}
 const ws=await load('app/api/workspace/route.mjs'),admin=await load('app/api/admin/users/route.mjs');
 const request=(method,body,revision)=>new Request('https://voltlab.example.com/api/workspace',{method,headers:{Origin:'https://voltlab.example.com','Content-Type':'application/json',...(revision===undefined?{}:{'If-Match':String(revision)})},body:JSON.stringify(body)});
 const data={circuits:[],completed:[],profile:{name:'Alice',goal:'Private goal'},attempts:[],customCatalog:[],panelTemplates:[]};
 globalThis.__testCookie='';assert.equal((await ws.GET()).status,401);
 globalThis.__testCookie=tokens.alice;assert.equal((await admin.GET(new Request('https://voltlab.example.com/api/admin/users'))).status,403);
 const saved=await ws.PUT(request('PUT',data,0));assert.equal(saved.status,200,await saved.clone().text());assert.equal((await saved.json()).revision,1);
 assert.equal((await ws.PUT(request('PUT',{...data,profile:{name:'overwrite',goal:''}},0))).status,409);
 assert.equal((await ws.GET()).status,200);assert.equal((await (await ws.GET()).json()).data.profile.name,'Alice');
 globalThis.__testCookie=tokens.bob;const bob=await (await ws.GET()).json();assert.equal(bob.data,null);assert.equal((await ws.PUT(request('PUT',{...data,owner_id:ids.alice,profile:{name:'Bob',goal:'different'}},0))).status,200);
 globalThis.__testCookie=tokens.alice;assert.equal((await (await ws.GET()).json()).data.profile.name,'Alice');
 const badOrigin=new Request('https://voltlab.example.com/api/workspace',{method:'PUT',headers:{Origin:'https://evil.example','If-Match':'1'},body:JSON.stringify(data)});assert.equal((await ws.PUT(badOrigin)).status,403);
 globalThis.__testCookie=tokens.admin;assert.equal((await admin.GET(new Request('https://voltlab.example.com/api/admin/users?q=Alice'))).status,200);
 const blocked=await admin.PATCH(request('PATCH',{id:ids.alice,action:'block'}));assert.equal(blocked.status,200,await blocked.clone().text());
 globalThis.__testCookie=tokens.alice;assert.equal((await ws.GET()).status,401);
 globalThis.__testCookie=tokens.admin;assert.equal((await admin.PATCH(request('PATCH',{id:ids.admin,action:'block'}))).status,403);
 assert.equal((await admin.PATCH(request('PATCH',{id:ids.bob,action:'delete',confirmation:'wrong'}))).status,400);
 assert.equal((await admin.PATCH(request('PATCH',{id:ids.bob,action:'delete',confirmation:'bob@example.com'}))).status,200);
 assert.equal((await pg.query('SELECT * FROM workspaces WHERE owner_id=$1',[ids.bob])).rows.length,0);
 assert.equal((await pg.query('SELECT * FROM sessions WHERE user_id=$1',[ids.bob])).rows.length,0);
 assert.ok((await pg.query('SELECT * FROM audit_events')).rows.length>=2);
 console.log('PASS: PostgreSQL migration, authenticated access, user isolation, optimistic revision, CSRF, admin restriction, block/revoke, delete confirmation/cascade and audit.');
}finally{await pg.close();fs.rmSync(temp,{recursive:true,force:true});}
