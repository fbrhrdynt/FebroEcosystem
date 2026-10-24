export function moduleIcon(name){
 const paths={dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',tools:'M5 4l15 15 M4 7l3-3 M17 20l3-3 M14 5l5-2 2 5-5 5 M3 21l7-7',lab:'M9 3h6 M10 3v7L4 20h16l-6-10V3 M8 15h8',qr:'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h3v3h3v3h-6z',convert:'M5 4h10l4 4v12H5z M9 10h7l-2-2 M15 16H8l2 2',short:'M10 14l4-4 M8 16l-1 1a4 4 0 01-6-6l5-5a4 4 0 016 0 M16 8l1-1a4 4 0 016 6l-5 5a4 4 0 01-6 0',snip:'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',verify:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',docs:'M12 5v16 M12 5C8 2 3 3 3 3v15s5-1 9 3c4-4 9-3 9-3V3s-5-1-9 2',api:'M4 7h16v10H4z M8 10l2 2-2 2 M13 14h3',auth:'M16 7a4 4 0 11-8 0 4 4 0 018 0 M4 21v-3a8 8 0 0116 0v3'};
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.tools}"/></svg>`;
}
const modules=[['dashboard','Dashboard','/'],['tools','Tools','/tools'],['lab','Lab','/lab'],['qr','QR Generator','/qr-generator'],['convert','Converter','/converter'],['short','URL Shortener','/url-shortener'],['snip','Snippets','/snippets'],['verify','Verification','/verify'],['docs','Documentation','/docs'],['api','API Services','/api'],['auth','Profile','/profile']];
let mode=true;
const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
const save=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
const destination=(id,path)=>{if(mode)return path;if(id==='dashboard')return 'https://eco.febro.id/';const prefix=modules.find(m=>m[0]===id)?.[2]||'';const suffix=path.startsWith(prefix)?path.slice(prefix.length):path;return `https://${id}.febro.id${suffix||'/'}`;};
export function mountShell(site,unified=true){
 mode=unified;
 document.documentElement.dataset.theme=read('febro-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
 document.body.classList.add('space');
 if(read('space-sidebar')==='collapsed')document.body.classList.add('sidebar-collapsed');
 const header=document.querySelector('.masthead')||document.querySelector('.frame>header');
 header.className='masthead';
 header.innerHTML=`<button class="icon-btn" id="menu-toggle" aria-label="Buka navigasi" aria-expanded="false" aria-controls="space-sidebar">☰</button><a class="brand" href="${destination('dashboard','/')}"><img src="/favicon.svg?v=space-1" alt="" width="32" height="32"><span>Febro Space</span></a><span class="breadcrumb">Workspace / ${modules.find(m=>m[0]===site)?.[1]||'Control Center'}</span><div class="mast-actions"><button id="theme" class="icon-btn" aria-label="Ganti tema terang/gelap" title="Ganti tema">◐</button><details class="account-menu"><summary aria-label="Menu akun">Akun</summary><div><a id="account-link" href="${destination('auth','/profile')}">Memeriksa sesi…</a><a href="${destination('auth','/profile/account#security')}">Keamanan</a></div></details></div>`;
 const sidebar=document.createElement('aside');sidebar.id='space-sidebar';sidebar.className='space-sidebar';sidebar.innerHTML=`<div class="sidebar-label">WORKSPACE</div><nav aria-label="Navigasi workspace">${modules.map(([id,name,path])=>`<a aria-label="${name}" href="${destination(id,path)}" ${id===site?'aria-current="page"':''}><span class="nav-glyph" aria-hidden="true">${moduleIcon(id)}</span><span>${name}</span></a>`).join('')}<a id="admin-navigation" aria-label="Control Center" ${site==='console'?'aria-current="page"':''} href="${destination('auth','/profile/console')}" hidden><span class="nav-glyph" aria-hidden="true">C</span><span>Control Center</span></a></nav><div class="sidebar-footer">Your digital workspace.<br><small>by Febro Herdyanto</small></div>`;
 document.body.append(sidebar);
 const overlay=document.createElement('button');overlay.className='drawer-overlay';overlay.setAttribute('aria-label','Tutup navigasi');document.body.append(overlay);
 const toggle=document.querySelector('#menu-toggle');
 function close(){document.body.classList.remove('drawer-open');toggle.setAttribute('aria-expanded','false');sidebar.inert=innerWidth<=760;}
 function sync(){sidebar.inert=innerWidth<=760&&!document.body.classList.contains('drawer-open');toggle.setAttribute('aria-expanded',String(innerWidth<=760?document.body.classList.contains('drawer-open'):!document.body.classList.contains('sidebar-collapsed')));}
 toggle.onclick=()=>{if(innerWidth<=760)document.body.classList.toggle('drawer-open');else{document.body.classList.toggle('sidebar-collapsed');save('space-sidebar',document.body.classList.contains('sidebar-collapsed')?'collapsed':'expanded');}sync();if(innerWidth<=760&&document.body.classList.contains('drawer-open'))sidebar.querySelector('a').focus();};
 overlay.onclick=()=>{close();toggle.focus();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle.focus();}if(e.key==='Tab'&&innerWidth<=760&&document.body.classList.contains('drawer-open')){const links=[toggle,...sidebar.querySelectorAll('a:not([hidden])')];e.preventDefault();const index=links.indexOf(document.activeElement);links[(index+(e.shiftKey?-1:1)+links.length)%links.length].focus();}});
 addEventListener('resize',sync);sync();
 const skip=document.createElement('a');skip.className='skip-link';skip.href='#app';skip.textContent='Lewati ke konten';document.body.prepend(skip);
 if(site==='console')document.querySelector('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;save('febro-theme',theme);};
}
export function updateShellUser(user){
 const admin=document.querySelector('#admin-navigation');if(admin)admin.hidden=!user?.isAdmin;
 const link=document.querySelector('#account-link');if(link){link.textContent=user?'Akun Saya':'Masuk / Daftar';link.href=destination('auth','/profile');}
}
