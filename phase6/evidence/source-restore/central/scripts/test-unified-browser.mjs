const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs';
import os from 'node:os';
const folder=fs.mkdtempSync(os.tmpdir()+'/febro-browser-data-');
process.env.NODE_ENV='development';process.env.DATA_DIR=folder;process.env.APP_SECRET='browser-test-secret'.repeat(8);process.env.RUN_SERVER='false';process.env.ADMIN_EMAILS='febroherdyanto@outlook.com';
const {server,store}=await import('../src/server.mjs');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const {hashPassword}=await import('../src/auth.mjs');store.createUser({email:'browser@example.com',name:'Browser User',verified:true,passwordHash:hashPassword('browser-password-123')});
store.createUser({email:'febroherdyanto@outlook.com',name:'Test Administrator',verified:true,passwordHash:hashPassword('isolated-admin-password')});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let requestCount=0;
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 await context.route('https://eco.febro.id/**',async route=>{
  const request=route.request();
  const response=await context.request.fetch(`http://127.0.0.1:${port}${new URL(request.url()).pathname}${new URL(request.url()).search}`,{method:request.method(),headers:{...request.headers(),host:'eco.febro.id','x-real-ip':`192.0.2.${1+Math.floor(requestCount++/40)}`},data:request.postDataBuffer(),maxRedirects:0});
  // Playwright does not re-route the follow-up of an intercepted HTTP redirect.
  // Make a fresh navigation so the test never follows redirects to public production.
  if(response.status()>=300&&response.status()<400&&response.headers().location){
   const target=new URL(response.headers().location,request.url()).href.replaceAll('&','&amp;').replaceAll('"','&quot;');
   await route.fulfill({status:200,contentType:'text/html',body:`<meta http-equiv="refresh" content="0;url=${target}">`});
  }else await route.fulfill({response});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url()} from ${r.request().frame().url()} type=${r.request().resourceType()}`);});
 const paths=['/','/tools','/lab','/qr-generator','/converter','/url-shortener','/snippets','/profile','/profile/register','/profile/forgot','/profile/reset?token=test','/verify','/api','/docs','/docs/article/utility-api'];
 for(const width of (process.env.QUICK?[]:[375,430,768,1024,1440])){
  await page.setViewportSize({width,height:900});
  for(const path of paths){
   await page.goto('https://eco.febro.id'+path);await page.waitForFunction(()=>!document.querySelector('#app .loading'));await page.waitForTimeout(80);
   if(await page.locator('#app').textContent().then(s=>s.includes('Tidak bisa memuat halaman')))throw Error('Render failure '+path);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Horizontal overflow '+width+' '+path);
   await page.reload();await page.waitForFunction(()=>!document.querySelector('#app .loading'));
  }
 }
 await page.goto('https://eco.febro.id/tools');await page.locator('#tool-input').fill('{"ok":true}');await page.locator('#run-tool').click();if(!(await page.locator('#tool-output').textContent()).includes('"ok": true'))throw Error('JSON workflow failed');
 await page.goto('https://eco.febro.id/qr-generator');await page.locator('#qr-text').fill('https://example.com');await page.locator('#make-qr').click();await page.waitForFunction(()=>document.querySelector('#qr-frame img')?.naturalWidth>0);
 await page.goto('https://eco.febro.id/');await page.locator('#theme').click();if(await page.locator('html').getAttribute('data-theme')!=='dark')throw Error('Theme failed');
 await page.reload();if(await page.locator('html').getAttribute('data-theme')!=='dark')throw Error('Theme persistence failed');
 await page.goto('https://eco.febro.id/profile');await page.locator('#auth-email').fill('browser@example.com');await page.locator('#auth-password').fill('browser-password-123');await page.locator('#login-submit').click();await page.waitForURL('**/tools');
 await page.goto('https://eco.febro.id/profile');await page.getByRole('heading',{name:'Akun Saya',exact:true}).waitFor();if(await page.locator('#login-form').count())throw Error('Authenticated profile showed login');await page.locator('#p-name').fill('Browser Updated');await page.locator('#profile-save').click();await page.waitForFunction(()=>document.querySelector('#profile-msg')?.textContent.includes('disimpan'));
 await page.reload();await page.locator('#p-name').waitFor();if(await page.locator('#p-name').inputValue()!=='Browser Updated')throw Error('Profile persistence failed');
 await page.screenshot({path:new URL('../screenshots/profile.png',import.meta.url).pathname,fullPage:true});
 await page.locator('#logout').click();await page.waitForURL('**/profile');await page.locator('#login-form').waitFor();
 // Non-admin access is rejected by the existing server guard.
 await page.goto('https://eco.febro.id/profile/console');await page.waitForURL('**/profile/account');
 if(await page.locator('#admin-navigation').isVisible())throw Error('Admin link visible to guest');
 // Session loading and failures must never flash the login form.
 let release;const pending=new Promise(r=>release=r);
 await page.route('**/v1/auth/me',async route=>{await pending;await route.fulfill({json:{user:null,googleEnabled:false}});});
 await page.goto('https://eco.febro.id/profile');await page.locator('.loading').waitFor();if(await page.locator('#login-form').count())throw Error('Login flashed during session loading');release();await page.locator('#login-form').waitFor();await page.unroute('**/v1/auth/me');
 await page.route('**/v1/auth/me',route=>route.fulfill({status:503,json:{error:'Offline test'}}));
 await page.goto('https://eco.febro.id/profile');await page.locator('#retry-session').waitFor();if(await page.locator('#login-form').count())throw Error('Network failure showed login');await page.unroute('**/v1/auth/me');
 await page.route('**/v1/auth/me',route=>route.fulfill({status:401,json:{error:'Session expired'}}));
 await page.goto('https://eco.febro.id/profile');await page.locator('#login-form').waitFor();await page.unroute('**/v1/auth/me');
 // Sign in through normal endpoints using only a temporary test database.
 await context.request.post(`http://127.0.0.1:${port}/v1/auth/login`,{headers:{host:'eco.febro.id',origin:'https://eco.febro.id'},data:{email:'febroherdyanto@outlook.com',password:'isolated-admin-password'}}).then(async r=>{if(!r.ok())throw Error('Admin test login failed');const cookie=r.headers()['set-cookie'].split(';')[0].split('=');await context.addCookies([{name:cookie[0],value:cookie[1],domain:'eco.febro.id',path:'/'}]);});
 for(const width of [375,430,768,1024,1440]){await page.setViewportSize({width,height:900});await page.goto('https://eco.febro.id/profile/console');await page.locator('#users tr').first().waitFor();await page.waitForFunction(()=>!document.querySelector('#users').textContent.includes('Loading')).catch(async e=>{console.log(await page.locator('body').innerText());throw e;});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Console overflow '+width);}
 await page.getByRole('button',{name:'Access',exact:true}).first().click();await page.locator('#permissions .permission').first().waitFor();await page.screenshot({path:new URL('../screenshots/control-center.png',import.meta.url).pathname,fullPage:true});
 await page.locator('#user-search').fill('no-matching-user');await page.locator('#filter-empty:not(.hidden)').waitFor();await page.locator('#user-search').fill('');
 await page.setViewportSize({width:375,height:900});await page.locator('#menu-toggle').click();await page.locator('#space-sidebar').getByRole('link',{name:'Tools',exact:true}).click();await page.locator('#tool-tabs').waitFor();
 await page.locator('#menu-toggle').click();await page.keyboard.press('Escape');if(await page.locator('body').getAttribute('class').then(s=>s.includes('drawer-open')))throw Error('Drawer escape failed');
 await page.setViewportSize({width:1440,height:1000});await page.goto('https://eco.febro.id/');await page.locator('#module-search').fill('zzzz');await page.locator('#search-empty:not(.hidden)').waitFor();await page.locator('#module-search').fill('');
 await page.screenshot({path:new URL('../screenshots/dashboard-dark.png',import.meta.url).pathname,fullPage:true});
 await page.locator('#theme').click();await page.waitForTimeout(250);await page.screenshot({path:new URL('../screenshots/dashboard-light.png',import.meta.url).pathname,fullPage:true});
 await page.setViewportSize({width:375,height:900});await page.screenshot({path:new URL('../screenshots/dashboard-mobile.png',import.meta.url).pathname,fullPage:true});
 if(errors.filter(e=>!e.includes('503')&&!e.includes('401')).length)throw Error(errors.join('\n'));
 console.log('PASS: '+(process.env.QUICK?'focused account/admin checks':'15 pages at five responsive widths with refresh')+', theme persistence, login/profile save/logout, session loading/401/network failure, Control Center widths and filtering, drawer navigation, search, screenshots.');
}finally{await browser?.close();await new Promise(r=>server.close(r));store.close();fs.rmSync(folder,{recursive:true,force:true});}
