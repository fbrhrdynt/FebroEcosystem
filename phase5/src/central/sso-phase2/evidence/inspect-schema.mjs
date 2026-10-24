import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
const report={observedAt:new Date().toISOString(),sqlite:{},postgres:{}};
for(const [app,file] of Object.entries({central:'/opt/febro-ecosystem/data/ecosystem.sqlite',files:'/opt/febro-files/data/files.sqlite',play:'/opt/play/storage/leaderboard/arcade.sqlite'})){
 try{const db=new DatabaseSync(file,{readOnly:true});const tables=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();report.sqlite[app]={};for(const {name}of tables){const quoted='"'+name.replaceAll('"','""')+'"';report.sqlite[app][name]={columns:db.prepare(`PRAGMA table_info(${quoted})`).all().map(({name,type,notnull,pk})=>({name,type,notnull,pk})),foreignKeys:db.prepare(`PRAGMA foreign_key_list(${quoted})`).all()};}db.close();}catch{report.sqlite[app]={status:'metadata unavailable'};}
}
const require=createRequire('/opt/lamariva/package.json');const {Pool}=require('pg');
for(const [app,root]of Object.entries({lamariva:'/opt/lamariva',itinerary:'/opt/ls_itinerary',voltlab:'/opt/voltlab'})){
 try{
  // Parse in a child-process-free local environment map; values are never emitted.
  const env={};for(const line of fs.readFileSync(root+'/.env','utf8').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^(["'])(.*)\1$/,'$2');}
  if(!env.DATABASE_URL){report.postgres[app]={status:'DATABASE_URL not present; alternate configuration not accessed'};continue;}
  const pool=new Pool({connectionString:env.DATABASE_URL,options:'-c default_transaction_read_only=on -c statement_timeout=5000',connectionTimeoutMillis:5000});
  try{report.postgres[app]=(await pool.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;}finally{await pool.end();}
 }catch{report.postgres[app]={status:'metadata unavailable; no credentials or errors emitted'};}
}
fs.writeFileSync(new URL('./schema-metadata.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sqlite:Object.fromEntries(Object.entries(report.sqlite).map(([k,v])=>[k,Object.keys(v)])),postgres:Object.fromEntries(Object.entries(report.postgres).map(([k,v])=>[k,Array.isArray(v)?{columnCount:v.length,tables:[...new Set(v.map(r=>r.table_name))]}:v]))},null,2));
