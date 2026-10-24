/* Febro Arcade v1.6 — shared profile modal, one cookie for all games. */
(()=>{'use strict';
 const styles=`
 #arc-name-root{position:fixed;z-index:2147483000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:#141327bc;backdrop-filter:blur(9px);font-family:system-ui,Arial,sans-serif}
 #arc-name-root[hidden]{display:none!important}
 #arc-name-dialog{box-sizing:border-box;width:min(420px,100%);background:#fffaf1;color:#201d2b;border:3px solid #201d2b;border-radius:22px;box-shadow:8px 9px 0 #201d2b;padding:24px;max-height:90dvh;overflow:auto;text-align:left}
 #arc-name-dialog *{box-sizing:border-box}#arc-name-dialog h2{font-size:clamp(23px,6vw,35px);margin:10px 0;line-height:1.08;font-weight:900;letter-spacing:-1px}
 #arc-name-dialog p{font-size:14px;color:#514e60;line-height:1.55}#arc-name-dialog small{font-weight:800;font-size:11px;letter-spacing:1px}#arc-name-dialog label{font-weight:800;display:block;margin:18px 0 7px}
 #arc-name-dialog input{width:100%;font-size:18px;padding:13px;border-radius:12px;border:2px solid #201d2b;background:white;color:#201d2b}
 #arc-name-dialog button{border:2px solid #201d2b;border-radius:12px;font-size:15px;font-weight:900;padding:12px;cursor:pointer}
 #arc-name-dialog .arc-primary{background:#f9cf59;box-shadow:3px 4px 0 #201d2b;min-width:100%}#arc-name-dialog .arc-muted{background:transparent;color:#50445c;margin-top:15px;width:100%;border-color:#aaa3b1;font-size:13px}
 #arc-name-error{min-height:20px;color:#ad274b!important;font-size:12px!important}
 `;
 const style=document.createElement('style');style.textContent=styles;document.head.appendChild(style);
 let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 window.ArcadeIdentity={ready,open:null};let settled=false;
 const release=ok=>{if(!settled){settled=true;resolveReady(ok);}};
 const root=document.createElement('div');root.id='arc-name-root';root.hidden=true;
 root.innerHTML=`<div id="arc-name-dialog" role="dialog" aria-modal="true" aria-labelledby="arc-name-title"><small>★ FEBRO ARCADE · PLAYER ONE</small><h2 id="arc-name-title">SIAPA NAMA<br>PEMAINNYA?</h2><p>Pilih nama panggilan untuk menyimpan rekor global. Tidak perlu nama asli, email, atau akun.</p><form id="arc-name-form"><label for="arc-name-input">NAMA PANGGILAN</label><input id="arc-name-input" name="nickname" placeholder="Misal: PixelHero" minlength="2" maxlength="18" required autocomplete="nickname"/><p id="arc-name-error" role="alert"></p><button class="arc-primary" type="submit">SIMPAN NAMA & MAIN →</button></form><button id="arc-name-later" class="arc-muted" type="button">Main tanpa peringkat dulu</button></div>`;
 document.body.appendChild(root);window.ArcadeIdentity.open=()=>{root.hidden=false;root.querySelector('input').focus();};
 const err=root.querySelector('#arc-name-error');let busy=false;
 root.querySelector('#arc-name-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const btn=root.querySelector('.arc-primary');btn.disabled=true;err.textContent='Menyimpan nama...';
  try{
   const name=root.querySelector('input').value.trim();const r=await fetch('/api/leaderboard/profile',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:name}),signal:AbortSignal.timeout(8500)});
   if(!(r.headers.get('content-type')||'').includes('application/json'))throw Error('API belum terhubung ke Nginx');
   const d=await r.json();if(!r.ok)throw Error(d.error||'Nama gagal disimpan');
   root.hidden=true;release(true);document.dispatchEvent(new CustomEvent('arcade:name-saved',{detail:d}));
  }catch(ex){err.textContent=ex.message;}finally{busy=false;btn.disabled=false;}
 });
 root.querySelector('#arc-name-later').addEventListener('click',()=>{root.hidden=true;release(false);});
 (async()=>{
  try{const r=await fetch('/api/leaderboard/me',{credentials:'same-origin',signal:AbortSignal.timeout(7000)});
   if(!(r.headers.get('content-type')||'').includes('application/json'))throw Error('API unavailable');
   const d=await r.json();if(!r.ok)throw Error('Backend offline');
   if(d.nameSet){release(true);return;}
   window.ArcadeIdentity.open();
  }catch{ // Allow offline play; the game must not freeze when VPS API is unavailable.
   release(false);console.warn('Player name: leaderboard offline');
  }
 })();
})();
