import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'febro-phase6-account-'));
process.env.NODE_ENV='test';process.env.DATA_DIR=dir;process.env.APP_SECRET='synthetic-browser-secret-'.repeat(4);
const {server,store}=await import('../src/central/src/server.mjs');
const require=createRequire('/opt/lamariva/package.json');
test('account dashboard browser: actual backend through synthetic transport, five widths, themes, preferences and native sessions; no real TLS/Google claim',{timeout:180000},async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const user=store.createUser({email:'browser@fixture.invalid',name:'Browser User',verified:true});store.saveSession('browser-current',user.id);
 const {chromium}=require('@playwright/test'),{default:binary}=await import(pathToFileURL(require.resolve('@sparticuz/chromium')));
 const browser=await chromium.launch({executablePath:await binary.executablePath(),args:binary.args.filter(x=>x!=='--disable-web-security'&&x!=='--single-process'),headless:true});
 try{
  for(const width of [375,430,768,1024,1440]){
   let authenticated=false;
   const context=await browser.newContext({viewport:{width,height:900}});
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());if(url.origin!=='https://eco.febro.id')return route.abort();
    const headers=await request.allHeaders();headers.host='eco.febro.id';headers.cookie=authenticated?'fb_session_dev=browser-current':'';delete headers['content-length'];delete headers['accept-encoding'];
    const response=await new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:url.pathname+url.search,method:request.method(),headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end(request.postDataBuffer());});
    delete response.headers['transfer-encoding'];delete response.headers['connection'];await route.fulfill(response);
   });
   const page=await context.newPage();await page.goto('https://eco.febro.id/profile/account');await page.getByRole('heading',{name:'Masuk ke Febro Space',exact:true}).waitFor();authenticated=true;await page.goto('https://eco.febro.id/profile/account');await page.getByRole('heading',{name:'Akun Saya',exact:true}).waitFor();await page.getByText('Sesi ini',{exact:true}).waitFor();
   assert.equal(await page.getByRole('link',{name:'Control Center',exact:true}).count(),0);
   for(const theme of ['light','dark']){await page.locator('#account-theme').selectOption(theme);await page.getByText('Preferensi disimpan.',{exact:true}).waitFor();await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);fs.mkdirSync('phase6/evidence/screenshots',{recursive:true});await page.screenshot({path:`phase6/evidence/screenshots/account-${width}-${theme}.png`,fullPage:true});}
   store.saveSession('other-session-'+width,user.id);await page.reload();await page.getByText('Sesi lain',{exact:true}).waitFor();await page.locator('#revoke-other-sessions').click();await page.waitForFunction(()=>document.querySelector('#revoke-other-sessions').disabled);assert.equal(store.sessionUser('other-session-'+width),undefined);assert.ok(store.sessionUser('browser-current'));
   await context.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
