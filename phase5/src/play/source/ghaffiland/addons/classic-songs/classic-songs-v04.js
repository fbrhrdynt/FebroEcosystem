/* GhaffiLand classic song library v0.4 — additive, no React rebuild required. */
(() => {
  'use strict';
  const songs = [{"id":"balonku","title":"Balonku","composer":"A.T. Mahmud","emoji":"🎈","category":"Warna & hitung","channel":"Creatifun","videoId":"qLV8ZT1-0Fg","start":0},{"id":"bintang-kecil","title":"Bintang Kecil","composer":"Pak Dal (Daljono)","emoji":"⭐","category":"Langit & bintang","channel":"Creatifun","videoId":"XawbttHWf0c","start":0},{"id":"pelangi","title":"Pelangi-Pelangi","composer":"A.T. Mahmud","emoji":"🌈","category":"Warna & alam","channel":"Kakatoo","videoId":"KwAWPO7P1B4","start":0},{"id":"cicak","title":"Cicak-Cicak di Dinding","composer":"A.T. Mahmud","emoji":"🦎","category":"Hewan & gerak","channel":"Creatifun","videoId":"0eCFEYTSIAs","start":0},{"id":"topi","title":"Topi Saya Bundar","composer":"Pak Kasur","emoji":"🎩","category":"Bentuk & benda","channel":"Creatifun","videoId":"jIuJXtL8zRs","start":0},{"id":"kereta","title":"Naik Kereta Api","composer":"Ibu Sud","emoji":"🚂","category":"Transportasi","channel":"Creatifun","videoId":"h5kMYerc9wE","start":0},{"id":"kebun","title":"Lihat Kebunku","composer":"Ibu Sud","emoji":"🌷","category":"Bunga & warna","channel":"Kakatoo (kompilasi)","videoId":"TzLbDSPIETE","start":595},{"id":"satu-satu","title":"Satu-Satu (Aku Sayang Ibu)","composer":"Kredit pencipta bervariasi; dikenal sebagai Sayang Semuanya","emoji":"💗","category":"Keluarga","channel":"Kakatoo","videoId":"s5Wy2GyNkT4","start":0},{"id":"pok-ame","title":"Pok Ame-Ame","composer":"Lagu tradisional","emoji":"🦋","category":"Tepuk & gerak","channel":"Creatifun","videoId":"4lqcF42Nh4Y","start":0},{"id":"kakaktua","title":"Burung Kakak Tua","composer":"Lagu tradisional","emoji":"🦜","category":"Hewan & irama","channel":"Kakatoo","videoId":"HMBF7tOguEA","start":0},{"id":"bulan","title":"Ambilkan Bulan Bu","composer":"A.T. Mahmud","emoji":"🌙","category":"Langit & malam","channel":"BaLiTa","videoId":"LlkFJ7_PZo8","start":0},{"id":"anak-ayam","title":"Anak Ayam (Tekotek)","composer":"Lagu tradisional","emoji":"🐣","category":"Hewan & angka","channel":"Kakatoo (kompilasi)","videoId":"TzLbDSPIETE","start":823},{"id":"menanam-jagung","title":"Menanam Jagung","composer":"Ibu Sud","emoji":"🌽","category":"Tanaman & berkebun","channel":"Kakatoo (kompilasi)","videoId":"TzLbDSPIETE","start":447},{"id":"bangun-tidur","title":"Bangun Tidur","composer":"Pak Kasur","emoji":"🪥","category":"Rutinitas pagi","channel":"Kakatoo (kompilasi)","videoId":"TzLbDSPIETE","start":145},{"id":"nina-bobo","title":"Nina Bobo","composer":"Lagu tradisional","emoji":"🛌","category":"Waktu tidur","channel":"Melodila","videoId":"othuipEoCeI","start":0},{"id":"dua-mata","title":"Dua Mata Saya","composer":"Pak Kasur","emoji":"👀","category":"Anggota tubuh","channel":"BaLiTa","videoId":"kGcp7V85sKc","start":0},{"id":"naik-delman","title":"Naik Delman","composer":"Pak Kasur","emoji":"🐴","category":"Transportasi","channel":"Kakatoo","videoId":"YV0Iu9hvOT0","start":0}];
  const state = {filter:'',selected:null,shuffle:false};
  const icon = (a)=>a.emoji;
  const safe = (s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const youtubeUrl = s => `https://www.youtube.com/watch?v=${s.videoId}${s.start?'&t='+s.start+'s':''}`;
  const filtered = () => songs.filter(s=>[s.title,s.channel,s.category,s.composer].some(t=>t.toLocaleLowerCase('id').includes(state.filter.toLocaleLowerCase('id'))));
  function stopInternalAudio(){
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    const b = document.querySelector('.songbook .song-controls button.primary');
    if(b && /hentikan lagu/i.test(b.textContent||''))b.click();
  }
  function playerHTML(song){
    return `<div class="gl-classic-now"><span class="gl-classic-big" aria-hidden="true">${icon(song)}</span><div><span class="gl-classic-overline">PILIHAN LAGU · ${safe(song.category)}</span><h3>${safe(song.title)}</h3><p>${safe(song.channel)} · ${safe(song.composer)}</p></div><button type="button" class="gl-classic-close" data-gl-close aria-label="Tutup video">×</button></div>
      <div class="gl-classic-video"><iframe title="Video lagu ${safe(song.title)} dari YouTube" src="https://www.youtube-nocookie.com/embed/${song.videoId}?rel=0&playsinline=1${song.start?'&start='+song.start:''}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="lazy"></iframe></div>
      <div class="gl-classic-under"><p>Video disediakan oleh ${safe(song.channel)} melalui YouTube. Jika pemutaran tertanam dibatasi, gunakan tombol buka YouTube.</p><a href="${youtubeUrl(song)}" target="_blank" rel="noopener noreferrer" class="gl-classic-external">↗ Buka di YouTube</a></div>`;
  }
  function render(root){
    const shown=filtered();
    const grid=root.querySelector('[data-gl-grid]');
    if(grid){
      grid.innerHTML=shown.length?shown.map((s,i)=>`<button type="button" class="gl-classic-card ${state.selected===s.id?'active':''}" data-gl-pick="${s.id}" aria-pressed="${state.selected===s.id}"><span class="gl-classic-art" aria-hidden="true">${icon(s)}</span><span class="gl-classic-card-body"><strong>${safe(s.title)}</strong><small>${safe(s.category)} · ${safe(s.channel)}</small></span><span class="gl-classic-play-icon" aria-hidden="true">▶</span></button>`).join(''):'<p class="gl-classic-empty">Tidak ditemukan. Coba kata lain, ya.</p>';
    }
    const player=root.querySelector('[data-gl-player]');const song=songs.find(s=>s.id===state.selected);
    if(player){player.hidden=!song;player.innerHTML=song?playerHTML(song):'';}
    const count=root.querySelector('[data-gl-count]');if(count)count.textContent=`${shown.length} lagu ditemukan`;
  }
  function select(root,id){
    stopInternalAudio();state.selected=id;render(root);
    root.querySelector('[data-gl-player]')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function mount(){
    const bannerText = document.querySelector('.song-banner span > span:last-child');
    if(bannerText && bannerText.textContent!=='4 lagu orisinal + 17 video lagu Indonesia →')bannerText.textContent='4 lagu orisinal + 17 video lagu Indonesia →';
    const footerVersion = document.querySelector('footer span:last-child');
    if(footerVersion && footerVersion.textContent?.includes('v0.3.0'))footerVersion.textContent='Trial keluarga · v0.4.0';
    const host=document.querySelector('.songbook');
    if(!host || host.querySelector('#gl-classic-songs'))return;
    const wrapper=document.createElement('section');wrapper.id='gl-classic-songs';wrapper.className='gl-classic';wrapper.setAttribute('aria-label','17 lagu anak Indonesia dari YouTube');
    wrapper.innerHTML=`<div class="gl-classic-heading"><span class="gl-classic-overline">KATALOG VIDEO · LAGU ANAK INDONESIA</span><h2>17 lagu favorit Ghaffi 🎵</h2><p>Balonku, Bintang Kecil, Pelangi, dan lagu Indonesia lainnya. Pilih judul untuk memutar video dari kanal YouTube pilihan, tanpa mengunduh video ke server.</p><span class="gl-classic-count" data-gl-count>17 lagu ditemukan</span></div>
      <div class="gl-classic-tools"><label class="gl-classic-search-label" for="gl-classic-search">Cari lagu <input id="gl-classic-search" type="search" placeholder="Cari judul, tema, kanal…" autocomplete="off" /></label><button type="button" class="gl-classic-random" data-gl-random>🎲 Putar acak</button></div>
      <div class="gl-classic-player" data-gl-player hidden aria-live="polite"></div><div class="gl-classic-grid" data-gl-grid></div>
      <p class="gl-classic-disclaimer">Perlu koneksi internet · Video berasal dari YouTube, dapat memuat iklan atau rekomendasi sesuai kebijakan YouTube. Putar bersama pendamping. Pemutar hanya dimuat setelah lagu dipilih.</p>`;
    host.appendChild(wrapper);
    const search=wrapper.querySelector('#gl-classic-search');
    search?.addEventListener('input',e=>{state.filter=e.target.value;render(wrapper)});
    wrapper.addEventListener('click',e=>{
      const btn=e.target.closest('button');if(!btn)return;
      if(btn.hasAttribute('data-gl-close')){state.selected=null;render(wrapper);return;}
      if(btn.hasAttribute('data-gl-random')){const pool=filtered();if(pool.length)select(wrapper,pool[Math.floor(Math.random()*pool.length)].id);return;}
      if(btn.hasAttribute('data-gl-pick'))select(wrapper,btn.getAttribute('data-gl-pick'));
    });
    render(wrapper);
  }
  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount()});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{subtree:true,childList:true});mount()},{once:true});
  else {observer.observe(document.body,{subtree:true,childList:true});mount();}
})();
