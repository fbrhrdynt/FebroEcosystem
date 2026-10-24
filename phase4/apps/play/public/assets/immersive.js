/* Febro Arcade v1.4 immersive player: shared across four original games. */
(() => {
  'use strict';
  const body = document.body;
  if (!body?.classList.contains('arcade-immersive')) return;
  const game = body.dataset.arcadeGame;
  const names = {skyhop:'SKYHOP',snake:'Neon Snake',orbit:'Orbit Run',tribeworld:'TribeWorld'};
  if (!names[game]) return;
  const header = document.createElement('nav');
  header.className = 'arcade-player-header';
  header.setAttribute('aria-label','Navigasi Febro Arcade');
  header.innerHTML = `<div class="arcade-player-route"><a href="/" class="arcade-logo" aria-label="Febro Arcade beranda">✦</a><a href="/">Febro Arcade</a><span class="arcade-slash" aria-hidden="true">/</span><strong>${names[game]}</strong></div><div class="arcade-player-actions"><button type="button" class="arcade-village" id="arcadeVillageButton" aria-expanded="false" aria-controls="villagePanel">▦ <span>Desa</span></button><button type="button" class="arcade-expand" id="arcadeFullscreenButton" aria-label="Aktifkan layar penuh" title="Layar penuh (jika didukung browser)">⛶ <span>Layar Penuh</span></button><a class="arcade-home" href="/" title="Ke dashboard">⌂ <span>Home</span></a><button type="button" class="arcade-close" id="arcadeCloseButton" title="Tutup game dan kembali ke dashboard">✕ <span>Close</span></button></div>`;
  body.insertBefore(header,body.firstChild);
  let toastTimer;
  function toast(message) {
    let el = document.querySelector('#arcadePlayerToast');
    if (!el) {el = document.createElement('div');el.id='arcadePlayerToast';el.className='arcade-player-toast';el.setAttribute('role','status');body.append(el)}
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>el.remove(),3000);
  }
  const fullBtn = document.querySelector('#arcadeFullscreenButton');
  function refreshFullscreen() {
    const active = Boolean(document.fullscreenElement);
    fullBtn.innerHTML = active ? '⛶ <span>Keluar Fullscreen</span>' : '⛶ <span>Layar Penuh</span>';
    fullBtn.setAttribute('aria-label',active?'Keluar dari fullscreen':'Aktifkan layar penuh');
    window.dispatchEvent(new Event('resize'));
  }
  fullBtn.addEventListener('click',async()=>{
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({navigationUI:'hide'});
      else toast('Browser ini tidak mendukung Fullscreen API. Game tetap mengisi area layar.');
    } catch(e) {toast('Fullscreen tidak diizinkan browser ini. Game tetap mengisi area layar.');}
    refreshFullscreen();
  });
  document.addEventListener('fullscreenchange',refreshFullscreen);
  document.querySelector('#arcadeCloseButton').addEventListener('click',async()=>{
    try {if(document.fullscreenElement) await document.exitFullscreen();}catch(e){}
    location.assign('/');
  });
  /* Prevent swipe-to-scroll and bouncing the whole page, but allow village panel scrolling. */
  const gameTouch = document.querySelector(game==='skyhop'?'#gameFrame':game==='tribeworld'?'#gameFrame':'.stage-screen');
  if(gameTouch) gameTouch.addEventListener('touchmove',e=>{if(e.cancelable)e.preventDefault()},{passive:false});
  if(game==='skyhop') {
    const sound = document.querySelector('#soundButton');
    if(sound)header.querySelector('.arcade-player-actions').insertBefore(sound,fullBtn);
  }
  if(game==='snake'||game==='orbit') {
    const card = document.querySelector('.stage-card');
    const toolbar = card?.querySelector('.stage-toolbar');
    const score = document.querySelector('.side .aside-card');
    if(card&&toolbar&&score){score.classList.add('arcade-score-strip');toolbar.insertAdjacentElement('afterend',score)}
    if(game==='snake') {
      const select=document.querySelector('#speed');
      const gamebar=document.querySelector('.gamebar');
      if(select&&gamebar) {
        const label=document.createElement('label');label.className='arcade-speed-label';label.textContent='KECEPATAN ';
        label.append(select);
        gamebar.append(label);
      }
    }
    const stage=document.querySelector('.stage-screen');
    const canvas=document.querySelector('#game');
    if(stage&&canvas){
      let scheduled=false;
      function resizeCanvas(){
        scheduled=false;
        const w=Math.max(1,stage.clientWidth-12),h=Math.max(1,stage.clientHeight-12);
        const ratio=canvas.width/canvas.height;
        let cw=Math.min(w,h*ratio),ch=cw/ratio;
        canvas.style.width=`${Math.max(1,cw)}px`;canvas.style.height=`${Math.max(1,ch)}px`;
      }
      function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(resizeCanvas)}}
      const observer=new ResizeObserver(schedule);observer.observe(stage);
      window.addEventListener('resize',schedule);document.addEventListener('fullscreenchange',schedule);
      schedule();
    }
  }
  if(game==='tribeworld'){
    const sidebar=document.querySelector('.sidebar');
    const layout=document.querySelector('.layout');
    const toggle=document.querySelector('#arcadeVillageButton');
    if(sidebar&&layout&&toggle){
      sidebar.id='villagePanel';
      const shade=document.createElement('button');shade.type='button';shade.className='arcade-sidebar-shade';shade.setAttribute('aria-label','Tutup panel desa');layout.append(shade);
      function setDrawer(open){
        body.classList.toggle('arcade-drawer-open',open);
        toggle.setAttribute('aria-expanded',String(open));
        toggle.innerHTML=open?'✕ <span>Tutup Desa</span>':'▦ <span>Desa</span>';
        window.dispatchEvent(new Event('resize'));
      }
      toggle.addEventListener('click',()=>setDrawer(!body.classList.contains('arcade-drawer-open')));
      shade.addEventListener('click',()=>setDrawer(false));
      sidebar.addEventListener('click',event=>{
        const btn=event.target.closest('.build-item');
        if(btn&&!btn.disabled&&window.matchMedia('(max-width:900px)').matches) {
          setDrawer(false);
          toast('Bangunan dipilih. Ketuk petak kosong di peta.');
        }
      });
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&body.classList.contains('arcade-drawer-open'))setDrawer(false)});
    }
  }
})();
