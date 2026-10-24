import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import fs from 'node:fs';
const require=createRequire('/opt/lamariva/package.json');
export async function browserAcceptance({app,origin,base,me,expectedId}){
 const {chromium}=require('@playwright/test'),{default:binary}=await import(pathToFileURL(require.resolve('@sparticuz/chromium')));
 const browser=await chromium.launch({executablePath:await binary.executablePath(),args:binary.args.filter(x=>x!=='--disable-web-security'&&x!=='--single-process'),headless:true});
 try{for(const viewport of [375,430,768,1024,1440].map(width=>({width,height:900}))){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(90000);await page.goto(origin+base);await page.getByRole('heading',{name:'Febro Space',exact:true}).waitFor();
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error(app+' horizontal overflow');
  fs.mkdirSync('phase6/evidence/screenshots',{recursive:true});await page.screenshot({path:`phase6/evidence/screenshots/${app}-${viewport.width}.png`,fullPage:true});
  try{await Promise.all([page.waitForURL(u=>u.origin===origin&&!u.pathname.startsWith(base),{waitUntil:'domcontentloaded',timeout:60000}),page.getByRole('button',{name:'Login with Febro Space',exact:true}).click()]);}catch{const u=new URL(page.url());throw Error(app+' browser flow stopped at '+u.origin+u.pathname+'; '+(await page.locator('body').innerText()).slice(0,500));}
  const r=await context.request.get(origin+me);if(r.status()!==200)throw Error(app+' browser native session');
  if(app!=='itinerary'){const body=await r.json(),id=app==='files'?body.user?.sub:app==='play'?body.nickname:body.user?.id;if(id!==expectedId)throw Error(app+' browser identity mismatch');}
  await page.goto(origin+base);await page.getByRole('button',{name:'Keluar aplikasi dan Febro Space',exact:true}).click();
  await page.getByRole('button',{name:'Ya, keluar',exact:true}).click();await page.getByRole('heading',{name:'Anda sudah keluar',exact:true}).waitFor();
  const signedOut=await context.request.get(origin+me);if(app==='itinerary'){if(signedOut.url().includes('/dashboard'))throw Error('Itinerary logout');}else{const body=await signedOut.json();if(app==='play'?body.authenticated:body?.user)throw Error(app+' logout did not revoke native session');}
  await context.close();
 }}finally{await browser.close();}
}
