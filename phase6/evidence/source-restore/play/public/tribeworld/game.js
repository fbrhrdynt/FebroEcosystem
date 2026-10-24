/* TribeWorld MVP — dependency-free, client-side isometric adventure.
   Copyright 2026 Febro Herdyanto. Optional cloud sync with local-first autosave and portable backup. */
const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d', {alpha:false});
const W=22,H=18,RIVER=14,BRIDGE_Y=8,KEY='tribeworld:mvp:v1';
const TW=76,TH=38;
const BUILDINGS={
 hut:{name:'Cottage',emoji:'🏠',wood:16,stone:8,desc:'+2 kapasitas'},
 farm:{name:'Farm',emoji:'🌾',wood:12,stone:5,desc:'+3 makanan / 14 dtk'},
 mill:{name:'Lumber Hut',emoji:'🪚',wood:22,stone:12,desc:'+2 kayu / 14 dtk'},
 quarry:{name:'Stone Pit',emoji:'⛏️',wood:17,stone:20,desc:'+2 batu / 14 dtk'}
};
const QUESTS=[
 {title:'The First Harvest',desc:'Ambil 12 kayu dengan mengetuk pohon.',key:'chopped',goal:12,reward:{food:5}},
 {title:'A Place Called Home',desc:'Bangun sebuah Cottage untuk warga.',key:'hutsBuilt',goal:1,reward:{wood:8}},
 {title:'More Helping Hands',desc:'Rekrut 1 penduduk baru.',key:'recruited',goal:1,reward:{stone:8}},
 {title:'Seeds of Tomorrow',desc:'Bangun satu Farm.',key:'farmsBuilt',goal:1,reward:{food:12}},
 {title:'Across the River',desc:'Perbaiki jembatan untuk membuka East Valley.',key:'expanded',goal:1,reward:{wood:20,stone:12}},
 {title:'Village of Dreams',desc:'Bangun 5 bangunan total (termasuk awal).',key:'totalBuildings',goal:5,reward:{food:20}},
 {title:'A Thriving Tribe',desc:'Capai 5 jumlah penduduk.',key:'maxPopulation',goal:5,reward:{wood:12}},
 {title:'The Great Gathering',desc:'Kumpulkan total 100 kayu dari sumber mana saja.',key:'chopped',goal:100,reward:{food:30}},
];
const CRAFT={
 axe:{name:'Stone Axe',emoji:'🪓',desc:'+2 kayu / tebang',base:{wood:8,stone:5},type:'wood'},
 pick:{name:'Iron Pick',emoji:'⚒️',desc:'+2 batu / tambang',base:{wood:6,stone:8},type:'stone'},
 basket:{name:'Berry Basket',emoji:'🧺',desc:'+2 makanan / petik',base:{wood:4,food:6},type:'food'}
};
const OUTFITS=['#d18d4f','#75ab96','#ab86d5','#db857d','#74a1c9','#c09a55','#b891ad','#81a96b'];
const seeded=(x,y,s=3)=>{const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const money=(n)=>Number(n||0).toLocaleString('id-ID');
const walkable=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&(x!==RIVER||(s.expanded&&y===BRIDGE_Y))&&(x<15||s.expanded)&&!s.nodes.some(n=>n.x===x&&n.y===y&&n.hp>0)&&!s.buildings.some(b=>b.x===x&&b.y===y);
const inMap=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const tileType=(x,y)=>x===RIVER?'water':x>=15?'east':'grass';
const project=(x,y)=>({x:(x-y)*TW/2,y:(x+y)*TH/2});
const randId=()=>Math.random().toString(36).slice(2,10);
function initialState(){
 const nodes=[];
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  if(x===RIVER||x>13&&x<15)continue;
  const r=seeded(x,y,1);
  if((x>=6&&x<=10&&y>=7&&y<=12)||(x>=11&&x<=13&&y>=7&&y<=10)||(x>=15&&x<=18&&y>=7&&y<=9))continue;
  if(r<.19)nodes.push({id:`t${x}-${y}`,x,y,type:'wood',hp:3,until:0});
  else if(r<.285)nodes.push({id:`r${x}-${y}`,x,y,type:'stone',hp:3,until:0});
  else if(r<.35)nodes.push({id:`f${x}-${y}`,x,y,type:'food',hp:2,until:0});
 }
 // Good starter resources close to the player for the first quest.
 for(const [x,y,t] of [[7,6,'wood'],[6,10,'wood'],[11,11,'wood'],[7,13,'wood'],[10,6,'stone'],[11,13,'stone'],[6,12,'food']]){
  if(!nodes.some(n=>n.x===x&&n.y===y))nodes.push({id:`starter${x}-${y}`,x,y,type:t,hp:3,until:0});
 }
 return {version:1,resources:{wood:24,stone:13,food:18},population:2,workers:{wood:0,stone:0,food:0},
 hero:{x:8,y:11},expanded:false,buildings:[{id:'hall',type:'hall',x:8,y:8}],nodes,
 upgrades:{axe:0,pick:0,basket:0},stats:{chopped:0,hutsBuilt:0,recruited:0,farmsBuilt:0,expanded:0,totalBuildings:1,maxPopulation:2},questIndex:0,created:Date.now(),lastTick:Date.now(),gathered:0};
}
function load(){try{const parsed=JSON.parse(localStorage.getItem(KEY));if(parsed?.version===1&&parsed.resources&&Array.isArray(parsed.nodes)&&Array.isArray(parsed.buildings)&&parsed.hero){const fresh=initialState();return {...fresh,...parsed,resources:{...fresh.resources,...parsed.resources},stats:{...fresh.stats,...parsed.stats},workers:{...fresh.workers,...parsed.workers},upgrades:{...fresh.upgrades,...parsed.upgrades},lastTick:Date.now()}}}catch(e){console.warn('Save unavailable',e)}return initialState()}
let s=load();
let renderW=900,renderH=650,dpr=1,zoom=1,cam={x:s.hero.x,y:s.hero.y},heroVisual={x:s.hero.x,y:s.hero.y},path=[],pending=null,selectedBuild=null,moveTime=0,lastTime=0,workerTimer=0,passiveTimer=0,frameT=0,dragStart=null,dragging=false,cameraHold=0,muted=true,focusedTile=null;
const keys=new Set();
const unsafeStore=()=>{try{localStorage.setItem(KEY,JSON.stringify(s));cloudLocalSeq++;if(!cloudAccount)saveIndicator('💾 Progres tersimpan lokal');else if(cloudReady)cloudSchedule();}catch(e){saveIndicator('⚠ Penyimpanan lokal tidak tersedia')}};
let saveTimeout=null;
function saveSoon(){clearTimeout(saveTimeout);saveTimeout=setTimeout(unsafeStore,250)}
const objAt=(x,y)=>s.nodes.find(n=>n.x===x&&n.y===y&&n.hp>0)||s.buildings.find(b=>b.x===x&&b.y===y);
function capacity(){return 3+s.buildings.filter(b=>b.type==='hut').length*2}
function workerTotal(){return Object.values(s.workers).reduce((a,b)=>a+b,0)}
function costText(o){return `${o.wood} 🪵  ${o.stone} 🪨`}
function afford(cost){return Object.entries(cost).every(([k,v])=>(s.resources[k]||0)>=v)}
function spend(cost){if(!afford(cost))return false;for(const [k,v] of Object.entries(cost))s.resources[k]-=v;saveSoon();return true}
function notify(text){const f=$('floatMessages');const el=document.createElement('div');el.className='float-msg';el.textContent=text;f.append(el);setTimeout(()=>el.remove(),2150);$('worldHint').querySelector('span').textContent=text}
function beep(freq=620){if(muted)return;try{const audio=window.AudioContext?new AudioContext():null;if(!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.07,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.13);setTimeout(()=>audio.close(),250)}catch(e){/* ignore unsupported sound */}}
function checkQuests(){let advanced=false;for(let loops=0;loops<QUESTS.length;loops++){
 const q=QUESTS[s.questIndex];if(!q)break;
 if((s.stats[q.key]||0)<q.goal)break;
 Object.entries(q.reward).forEach(([k,n])=>s.resources[k]+=n);
 s.questIndex++;advanced=true;notify(`✨ Quest selesai! + ${Object.entries(q.reward).map(([k,n])=>`${n} ${k}`).join(', ')}`);beep(760);
 }if(advanced)saveSoon()}
function updateUI(){
 $('woodCount').textContent=money(s.resources.wood);$('stoneCount').textContent=money(s.resources.stone);$('foodCount').textContent=money(s.resources.food);
 $('populationCount').textContent=`${s.population} / ${capacity()}`;$('workerCount').textContent=workerTotal();$('villagerState').textContent=`${s.population} FRIENDS`;
 $('storageFlag').textContent=`DAY ${String(1+Math.floor((Date.now()-s.created)/240000)).padStart(2,'0')}`;
 const q=QUESTS[s.questIndex];$('questTitle').textContent=q?.title||'You built a new beginning!';$('questDesc').textContent=q?.desc||'Semua chapter MVP selesai. Terus bangun dan jelajahi!';$('questProgressText').textContent=q?`${Math.min(s.stats[q.key]||0,q.goal)} / ${q.goal}`:'ALL COMPLETE';$('questProgressBar').style.width=q?`${clamp((s.stats[q.key]||0)/q.goal,0,1)*100}%`:'100%';$('questReward').textContent=q?`REWARD ${Object.entries(q.reward).map(([k,n])=>`+${n} ${k==='wood'?'🪵':k==='stone'?'🪨':'🍎'}`).join(' ')}`:'✦ WELL DONE';
 $('regionName').textContent=s.hero.x>=15?'EAST VALLEY':'SUNLIT VALLEY';$('regionSub').textContent=`DAY ${String(1+Math.floor((Date.now()-s.created)/240000)).padStart(2,'0')} · SUNNY`;
 $('mapCoords').textContent=`X ${String(s.hero.x).padStart(2,'0')} · Y ${String(s.hero.y).padStart(2,'0')}`;
 let markup='';for(const [key,o] of Object.entries(BUILDINGS)){const can=afford({wood:o.wood,stone:o.stone});markup+=`<button class="build-item ${selectedBuild===key?'active':''}" data-build="${key}" aria-label="Bangun ${o.name}; ${costText(o)}" ${can?'':'disabled'}><span class="build-tag">${selectedBuild===key?'SELECTED':'BUILD'}</span><span class="building-emoji">${o.emoji}</span><b>${o.name}</b><small>${costText(o)}</small></button>`}
 $('buildGrid').innerHTML=markup;$('cancelBuildBtn').hidden=!selectedBuild;
 const btn=$('expandBtn');btn.classList.toggle('done',s.expanded);btn.disabled=s.expanded;btn.querySelector('strong').textContent=s.expanded?'East Valley unlocked!':'Open the East Valley';btn.querySelector('small').textContent=s.expanded?'Jembatan bisa dilalui · Selamat menjelajah':'Bangun jembatan · 35 🪵 25 🪨 18 🍎';
 const avatars=[];for(let i=0;i<s.population;i++)avatars.push(`<span class="avatar" title="${i===0?'Your hero':`Penduduk ${i}`}">${['🧑🏽','👩🏽','👨🏾','👩🏻','🧑🏻','👩🏿','👨🏻','🧑🏾'][i%8]}${i===0?'<small>YOU</small>':''}</span>`);$('villagerAvatars').innerHTML=avatars.join('');
 $('recruitBtn').disabled=s.population>=capacity()||s.resources.food<12;
 $('craftGrid').innerHTML=Object.entries(CRAFT).map(([key,r])=>{
 const lv=s.upgrades[key],max=lv>=3,cost=Object.fromEntries(Object.entries(r.base).map(([k,n])=>[k,n*(lv+1)]));
 return `<button class="craft-item" data-craft="${key}" ${max||!afford(cost)?'disabled':''}><span class="craft-icon">${r.emoji}</span><span><b>${r.name} <small>LV ${lv}/3</small></b><em>${r.desc} · ${Object.entries(cost).map(([k,n])=>`${n} ${k==='wood'?'🪵':k==='stone'?'🪨':'🍎'}`).join(' ')}</em></span><span class="craft-plus">${max?'✓':'+'}</span></button>`}).join('');
 $('workerJobs').innerHTML=['wood' ,'stone','food'].map(k=>`<div class="worker-job" title="Tugaskan pekerja"><span class="worker-label">${k==='wood'?'🪵 WOOD':k==='stone'?'🪨 STONE':'🍎 FOOD'}</span><span style="display:flex;justify-content:space-evenly;align-items:center"><button data-job="${k}" data-change="-1" aria-label="Kurangi pekerja ${k}" style="border:0;background:transparent;color:inherit;font-weight:800" ${s.workers[k]===0?'disabled':''}>−</button><b>${s.workers[k]}</b><button data-job="${k}" data-change="1" aria-label="Tambah pekerja ${k}" style="border:0;background:transparent;color:inherit;font-weight:800" ${workerTotal()>=s.population-1?'disabled':''}>+</button></span></div>`).join('');
}
function hire(){if(s.population>=capacity())return notify('🏠 Bangun Cottage untuk menambah kapasitas!');if(!spend({food:12}))return notify('Butuh 12 makanan untuk merekrut.');s.population++;s.stats.recruited++;s.stats.maxPopulation=Math.max(s.stats.maxPopulation,s.population);notify('🎉 Penduduk baru bergabung!');beep();checkQuests();updateUI()}
function buildAt(x,y){if(!selectedBuild)return;if(!inMap(x,y)||!walkable(x,y))return notify('Pilih petak rumput kosong.');if(x>=15&&!s.expanded)return notify('East Valley masih terkunci.');if(Math.abs(x-s.hero.x)+Math.abs(y-s.hero.y)>6)return notify('Bangun lebih dekat dengan karakter.');const type=selectedBuild,def=BUILDINGS[type];if(!spend({wood:def.wood,stone:def.stone})){selectedBuild=null;updateUI();return notify('Bahan belum cukup.')}
 s.buildings.push({id:randId(),type,x,y});s.stats.totalBuildings++;if(type==='hut')s.stats.hutsBuilt++;if(type==='farm')s.stats.farmsBuilt++;selectedBuild=null;notify(`🏡 ${def.name} berhasil dibangun!`);beep(750);checkQuests();updateUI();saveSoon();}
function expand(){if(s.expanded)return;const costs={wood:35,stone:25,food:18};if(!spend(costs))return notify('Butuh 35 kayu, 25 batu, 18 makanan.');s.expanded=true;s.stats.expanded=1;notify('🌉 East Valley terbuka!');beep(800);checkQuests();updateUI();saveSoon();}
function gather(n){if(n.hp<=0)return;const type=n.type,upgrade=s.upgrades[type==='wood'?'axe':type==='stone'?'pick':'basket']||0,amt=(type==='wood'?4:type==='stone'?3:5)+upgrade*2;s.resources[type]+=amt;n.hp--;s.gathered++;if(type==='wood')s.stats.chopped+=amt;if(n.hp===0)n.until=Date.now()+26000;const sym={wood:'🪵',stone:'🪨',food:'🍎'}[type];notify(`${sym} +${amt} ${type==='wood'?'kayu':type==='stone'?'batu':'makanan'}`);beep(type==='wood'?450:600);checkQuests();updateUI();saveSoon()}
function interact(o){if(!o)return;if(o.type==='hall')return notify('🏰 Balai desa · rumah pertama TribeWorld!');if(o.type==='hut')return notify('🏠 Cottage · penduduk mendapat rumah nyaman.');if(o.type==='farm'){s.resources.food+=4;notify('🌾 Panen dari Farm: +4 makanan!');updateUI();saveSoon();return}if(o.type==='mill'){s.resources.wood+=2;notify('🪵 Lumber Hut: +2 kayu!');updateUI();saveSoon();return}if(o.type==='quarry'){s.resources.stone+=2;notify('🪨 Stone Pit: +2 batu!');updateUI();saveSoon();return}gather(o)}
function blocked(x,y){if(!inMap(x,y))return true;if(x===RIVER&&!(s.expanded&&y===BRIDGE_Y))return true;if(x>=15&&!s.expanded)return true;if(s.buildings.some(b=>b.x===x&&b.y===y))return true;if(s.nodes.some(n=>n.x===x&&n.y===y&&n.hp>0))return true;return false}
function findPath(sx,sy,tx,ty){
 if(!inMap(tx,ty))return null;const queue=[[sx,sy]],prev=new Map([[`${sx},${sy}`,null]]),dir=[[1,0],[-1,0],[0,1],[0,-1]];
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];if(x===tx&&y===ty){const path=[];let key=`${x},${y}`;while(prev.get(key)){const [px,py]=key.split(',').map(Number);path.unshift({x:px,y:py});key=prev.get(key)}return path}
  for(const [dx,dy] of dir){let nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(prev.has(key)||blocked(nx,ny))continue;prev.set(key,`${x},${y}`);queue.push([nx,ny])}
 }return null
}
function attemptTile(x,y){
 if(!inMap(x,y))return;
 if(selectedBuild){buildAt(x,y);return}
 if(x===RIVER && (!s.expanded||y!==BRIDGE_Y)){notify('🌉 Lewati jembatan untuk menyeberang!');return}
 if(x>=15&&!s.expanded){notify('🔒 East Valley terkunci. Buka dengan jembatan.');return}
 const item=objAt(x,y);let target={x,y},action=null;
 if(item){action=item;const neighbors=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>!blocked(a,b));let best=null;for(const [a,b] of neighbors){const p=findPath(s.hero.x,s.hero.y,a,b);if(p&&(!best||p.length<best.length))best=p}
  if(best===null){notify('Jalannya tertutup. Coba dari sisi lain.');return}path=best;pending=action;return
 }
 if(blocked(x,y)){notify('Area ini tidak bisa dilalui.');return}
 let p=findPath(s.hero.x,s.hero.y,x,y);if(p===null){notify('Tidak ada jalan ke lokasi itu.');return}path=p;pending=null;
}
function moveOne(dx,dy){if(selectedBuild)return;const x=s.hero.x+dx,y=s.hero.y+dy;if(!blocked(x,y)){path=[];pending=null;s.hero={x,y};cameraHold=0;saveSoon()}else if(!s.expanded&&x>=15)notify('🔒 Perbaiki jembatan dulu!')}
function autoUpdate(dt){
 moveTime+=dt;const keyMoves=[['arrowup',0,-1],['w',0,-1],['arrowdown',0,1],['s',0,1],['arrowleft',-1,0],['a',-1,0],['arrowright',1,0],['d',1,0]];
 if(moveTime>120){const key=keyMoves.find(a=>keys.has(a[0]));if(key){moveOne(key[1],key[2]);moveTime=0}else if(path.length){const next=path.shift();s.hero=next;moveTime=0;saveSoon()}else if(pending){let o=pending;pending=null;if(Math.abs(o.x-s.hero.x)+Math.abs(o.y-s.hero.y)<=1)interact(o)}}
 heroVisual.x+=(s.hero.x-heroVisual.x)*Math.min(1,dt/75);heroVisual.y+=(s.hero.y-heroVisual.y)*Math.min(1,dt/75);
 const pace=Math.min(1,dt/240);if(Date.now()>cameraHold){cam.x+=(heroVisual.x-cam.x)*pace;cam.y+=(heroVisual.y-cam.y)*pace}
 workerTimer+=dt;passiveTimer+=dt;
 // Offline progress is intentionally NOT generated. Only active gameplay produces supplies.
 if(workerTimer>=8000){workerTimer%=8000;for(const k of ['wood','stone','food']){const n=s.workers[k];if(n){s.resources[k]+=n*(k==='food'?4:3);if(k==='wood')s.stats.chopped+=n*3;notify(`👷 Pekerja menghasilkan ${n*(k==='food'?4:3)} ${k}`)}}checkQuests();updateUI();saveSoon()}
 if(passiveTimer>=14000){passiveTimer%=14000;for(const b of s.buildings){if(b.type==='farm')s.resources.food+=3;if(b.type==='mill')s.resources.wood+=2;if(b.type==='quarry')s.resources.stone+=2}updateUI();saveSoon()}
 if((frameT|0)%2500<dt){let refreshed=false;for(const n of s.nodes)if(n.hp===0&&n.until<Date.now()){n.hp=n.type==='food'?2:3;n.until=0;refreshed=true}if(refreshed)saveSoon()}
}
// DRAWING — canvas-only illustrations; no external sprites or WebGL.
function poly(pts,fill,stroke=null,lw=1){ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function text(str,x,y,size,color='#fff',bold=true,align='center'){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${bold?800:500} ${size}px system-ui,sans-serif`;ctx.fillText(str,x,y)}
function worldP(x,y){const p=project(x,y),c=project(cam.x,cam.y);return {x:(p.x-c.x)*zoom+renderW*.5,y:(p.y-c.y)*zoom+renderH*.48}}
function inverse(sx,sy){let c=project(cam.x,cam.y),px=(sx-renderW*.5)/zoom+c.x,py=(sy-renderH*.48)/zoom+c.y;return{x:Math.round((px/(TW/2)+py/(TH/2))/2),y:Math.round((py/(TH/2)-px/(TW/2))/2)}}
function drawSky(){const g=ctx.createLinearGradient(0,0,0,renderH);g.addColorStop(0,'#8ec7cc');g.addColorStop(.47,'#cae4c7');g.addColorStop(1,'#91bfa2');rect(0,0,renderW,renderH,g);const t=frameT*.000015;for(let i=0;i<8;i++){let x=(i*231+t*44)% (renderW+380)-160,y=35+(i*71)%200;ctx.globalAlpha=.17;ellipse(x,y,90,22,'#f9fbdf');ellipse(x+34,y-9,56,22,'#fffbea');ctx.globalAlpha=1}for(let i=0;i<5;i++){const x=renderW*(i-.2)/3,y=renderH*.55;ellipse(x,y+85,280,105,i%2?'#86b29d55':'#a2cbb355')}}
function drawTile(x,y){const p=worldP(x,y);const tw=TW*zoom/2,th=TH*zoom/2;const colorI=seeded(x,y,4),water=x===RIVER;let color=water?'#67b4c4':x>=15?(colorI>.5?'#80b977':'#87bc7a'):(colorI>.66?'#93c887':colorI>.3?'#9dce91':'#a6d29b');
 const a=[[p.x,p.y-th],[p.x+tw,p.y],[p.x,p.y+th],[p.x-tw,p.y]];
 if(!water){poly([[p.x-tw,p.y],[p.x,p.y+th],[p.x+tw,p.y],[p.x+tw,p.y+9*zoom],[p.x,p.y+th+9*zoom],[p.x-tw,p.y+9*zoom]],'#637e4e');poly(a,color,'#7ba87235',.7)}else{poly(a,color);const s=(frameT*.016+x*3+y*7)%22;line(p.x-13*zoom+s*.28,p.y-1*zoom,p.x+12*zoom+s*.28,p.y+2*zoom,'#d3f2e7aa',1.6*zoom)}
 if(!water){if(colorI>.77){for(let i=0;i<3;i++){let dx=(seeded(x,y,i+8)-.5)*tw*1.3,dy=(seeded(x,y,i+10)-.5)*th*1.0;line(p.x+dx,p.y+dy,p.x+dx-2*zoom,p.y+dy-4*zoom,'#689c64bb',1.3*zoom)}}if(colorI<.08){ellipse(p.x-5*zoom,p.y,1.3*zoom,1.3*zoom,'#fff4b7');ellipse(p.x,p.y+3*zoom,1.3*zoom,1.3*zoom,'#f9e5ce')}}
 if(x===RIVER&&y===BRIDGE_Y&&s.expanded)drawBridge(p.x,p.y)
 if(x>=15&&!s.expanded){poly(a,'#c9d2c088');if(seeded(x,y,9)>.7)ellipse(p.x,p.y,4*zoom,2*zoom,'#f6f2df55')}
}
function drawBridge(x,y){const sc=zoom;poly([[x-24*sc,y-8*sc],[x+16*sc,y-7*sc],[x+25*sc,y+8*sc],[x-16*sc,y+8*sc]],'#9f7048','#66472d',1.2*sc);for(let i=0;i<5;i++){const xx=x+(-18+i*8)*sc;line(xx,y-6*sc,xx+5*sc,y+7*sc,'#d9a26c',2*sc)}for(let i of [-1,1]){let by=y+i*12*sc;line(x-20*sc,by,x+22*sc,by,'#775036',2*sc);line(x-20*sc,by,x-20*sc,by-9*sc,'#553a2c',3*sc);line(x+22*sc,by,x+22*sc,by-9*sc,'#553a2c',3*sc)}}
function grassDetail(x,y,p){if(seeded(x,y,15)>.92){let f=(seeded(x,y,20)*8-4)*zoom;ellipse(p.x+f,p.y+5*zoom,2*zoom,1.5*zoom,'#fae39e');line(p.x+f,p.y+5*zoom,p.x+f,p.y,'#558e65',1*zoom)} }
function drawTree(p,n){const z=zoom;ctx.save();ctx.translate(p.x,p.y);ctx.scale(z,z);ellipse(0,4,25,11,'#4e73584d');poly([[-5,1],[-7,-35],[-2,-49],[8,-35],[5,0]],'#8c6040','#704b31',1);line(1,-29,11,-47,'#855534',5);line(-2,-25,-15,-42,'#855534',5);
 const clusters=[[-14,-45,16],[-3,-63,18],[18,-53,18],[-18,-61,15],[3,-48,19],[8,-70,13]];
 for(let i=0;i<clusters.length;i++){const [cx,cy,r]=clusters[i];ellipse(cx+2,cy+4,r+2,r*.82,'#4d9160');ellipse(cx,cy,r,r*.79,['#65ad6d','#80bf79','#70b974','#78bb71','#5ca16c','#99cc84'][i]);ellipse(cx-r*.27,cy-r*.29,r*.42,r*.22,'#a7d5998c')}
 ctx.restore()}
function drawStone(p,n){const z=zoom;ctx.save();ctx.translate(p.x,p.y);ctx.scale(z,z);ellipse(0,1,21,9,'#56715755');poly([[-19,2],[-14,-19],[-3,-30],[13,-23],[21,-3],[7,7]],'#718890','#506a71',1.5);poly([[-14,-19],[-3,-30],[4,-17],[-3,-7],[-16,-2]],'#b0c4b8');poly([[4,-17],[13,-23],[21,-3],[7,7],[-3,-7]],'#809e9d');poly([[-3,-7],[7,7],[-19,2],[-16,-2]],'#556d76');line(-6,-22,0,-18,'#e3e8d8',1.4);ctx.restore()}
function drawFood(p){const z=zoom;ctx.save();ctx.translate(p.x,p.y);ctx.scale(z,z);ellipse(0,2,18,8,'#507f5260');for(const [x,y,rr] of [[-10,-11,11],[9,-13,13],[0,-23,12]]){ellipse(x,y,rr,rr*.8,'#478c58');ellipse(x-2,y-3,rr*.7,rr*.65,'#70b376')}for(const [x,y] of [[-8,-11],[12,-13],[1,-26],[6,-16],[-2,-12]])ellipse(x,y,3.5,3,'#e96d70');ctx.restore()}
function drawBuilding(p,b){const z=zoom;ctx.save();ctx.translate(p.x,p.y);ctx.scale(z,z);ellipse(0,4,32,12,'#3657404a');
 if(b.type==='hall'){
  poly([[-33,-4],[-33,-42],[0,-60],[34,-43],[34,-3],[0,16]],'#d4aa73','#665b44',1);poly([[0,16],[0,-60],[34,-43],[34,-3]],'#c99469');poly([[-39,-42],[0,-70],[39,-46],[0,-30]],'#cd8165','#805a4c',1.5);poly([[-39,-42],[0,-30],[0,-34],[-39,-47]],'#a05e4f');poly([[0,-30],[39,-46],[39,-51],[0,-35]],'#995848');rect(15,-30,11,19,'#704c37');poly([[15,-30],[26,-36],[26,-17],[15,-11]],'#4e4838');ellipse(19,-22,1.3,1.3,'#f7d984');rect(-27,-31,12,12,'#eee6b3');poly([[3,-73],[11,-73],[11,-99],[3,-96]],'#8f9a79');poly([[3,-99],[22,-93],[8,-89]],'#f2ce6b');line(7,-96,7,-105,'#7d5245',1.5);ellipse(-7,10,13,6,'#ceb17a');
 }else if(b.type==='hut'||b.type==='mill'){
  const mill=b.type==='mill';poly([[-26,-2],[-26,-33],[0,-46],[27,-31],[27,2],[0,15]],mill?'#d5aa76':'#ecd2a2','#886d55',1);poly([[0,15],[0,-46],[27,-31],[27,2]],mill?'#be8a57':'#dcae81');poly([[-33,-35],[0,-61],[34,-36],[0,-17]],mill?'#769c8a':'#de9077','#876552',1);poly([[0,-17],[34,-36],[34,-41],[0,-23]],mill?'#548579':'#b66b55');poly([[-33,-35],[0,-17],[0,-24],[-33,-41]],mill?'#48796f':'#b36a52');rect(12,-18,9,17,'#72523d');rect(-20,-23,10,11,'#dce9ce');if(mill){ellipse(30,2,13,4,'#624a37');poly([[30,-17],[38,-6],[30,9],[22,-5]],'#d3ba83');ellipse(30,-6,3,3,'#654f35')}else{rect(-9,-53,7,17,'#b0ac8e');ellipse(-5,-56,7,3,'#fff8dc8c')}
 }else if(b.type==='farm'){
  poly([[-33,3],[-9,-9],[37,1],[12,17]],'#94724b','#685b3c',1.5);for(let a=0;a<4;a++){line(-20+a*13,0,-10+a*13,12,'#dfb879',5);for(let k=0;k<3;k++){ellipse(-18+a*13+k*2,-4-k*1.2,3.8,5,'#d0a24d');line(-17+a*13+k*2,4,-19+a*13+k*2,-14,'#588948',1.4)}}poly([[-26,-17],[-17,-25],[-8,-17],[-8,-4],[-26,6]],'#dfbb8f');poly([[-30,-17],[-17,-31],[-4,-18],[-17,-11]],'#b77254');
 }else if(b.type==='quarry'){
  poly([[-31,3],[-25,-19],[-7,-28],[15,-20],[31,-6],[27,8]],'#74898e','#657880');poly([[-25,-19],[-7,-28],[8,-19],[-7,-10]],'#c3d1cc');poly([[8,-19],[15,-20],[31,-6],[14,1]],'#89aaa7');line(-5,-2,25,-11,'#594a37',5);rect(11,-15,11,7,'#d7ae78');
 }
 ctx.restore()}
function drawPerson(p,isHero=true,index=0){const z=zoom;ctx.save();ctx.translate(p.x,p.y);ctx.scale(z,z);const bob=Math.sin(frameT*.006+index*2)*1.5;ellipse(0,4,12,5,'#355b474e');ctx.translate(0,bob);const outfit=isHero?'#d58a57':OUTFITS[index%OUTFITS.length];line(-5,-3,-6,5,'#52635a',4.5);line(5,-3,6,5,'#52635a',4.5);poly([[-8,-26],[8,-26],[10,-4],[-9,-4]],outfit,'#83614e',.9);line(-8,-20,-13,-11,'#e1b48c',4);line(8,-21,13,-12,'#e1b48c',4);ellipse(0,-34,10,11,'#eac39a');ellipse(0,-41,11,6,isHero?'#714831':'#765741');poly([[-10,-39],[-9,-44],[-2,-48],[8,-45],[11,-39]],isHero?'#705039':'#71513b');ellipse(-3,-33,1,1.2,'#4e3b35');ellipse(4,-33,1,1.2,'#4e3b35');if(isHero){poly([[6,-28],[12,-23],[9,-6],[5,-9]],'#5c8db0');poly([[-9,-25],[-6,-24],[-8,-16],[-12,-15]],'#b76650');}ctx.restore()}
function drawFlag(p){const z=zoom;line(p.x,p.y-2*z,p.x,p.y-60*z,'#8b6347',4*z);poly([[p.x,p.y-61*z],[p.x+24*z,p.y-55*z],[p.x,p.y-45*z]],'#e8b95d');ellipse(p.x,p.y,10*z,4*z,'#688565aa')}
function objectScreenBoxes(){return [...s.nodes.filter(n=>n.hp>0),...s.buildings].map(o=>({o,...worldP(o.x,o.y)}))}
function selectObjectPixel(sx,sy){let selected=null,best=Infinity;for(const hit of objectScreenBoxes()){const h=hit.o.type==='wood'?80:hit.o.type==='hall'?110:hit.o.type==='hut'?65:hit.o.type==='food'?37:47;const w=hit.o.type==='wood'?40:hit.o.type==='hall'?48:35;const xdist=Math.abs((sx-hit.x)/zoom),ydist=(hit.y-sy)/zoom;if(xdist<w&&ydist>-13&&ydist<h){const dist=xdist*.6+Math.abs(ydist-h*.4);if(dist<best){selected=hit.o;best=dist}}}return selected}
function drawScene(){ctx.clearRect(0,0,renderW,renderH);drawSky();
 for(let total=0;total<W+H-1;total++)for(let x=0;x<W;x++){const y=total-x;if(y<0||y>=H)continue;const p=worldP(x,y);if(p.x < -TW*zoom||p.x>renderW+TW*zoom||p.y < -TH*zoom-60||p.y>renderH+TH*zoom+40)continue;drawTile(x,y);if(x!==RIVER)grassDetail(x,y,p)}
 // Sort game objects and avatar by tile depth; keeps objects behind characters naturally.
 const objs=[...s.nodes.filter(n=>n.hp>0).map(n=>({kind:'node',x:n.x,y:n.y,obj:n})),...s.buildings.map(b=>({kind:'building',x:b.x,y:b.y,obj:b})),{kind:'hero',x:heroVisual.x,y:heroVisual.y}];
 for(let i=0;i<s.population-1;i++){
  let ix=9+(i%3),iy=8+Math.floor(i/3)%2;if(ix===9&&iy===8)iy++;objs.push({kind:'person',x:ix,y:iy,index:i})
 }
 objs.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
 for(const item of objs){const p=worldP(item.x,item.y);if(p.x< -100||p.x>renderW+100||p.y< -110||p.y>renderH+150)continue;
  if(item.kind==='hero')drawPerson(p,true);
  if(item.kind==='person')drawPerson(p,false,item.index+1);
  if(item.kind==='node'){if(item.obj.type==='wood')drawTree(p,item.obj);if(item.obj.type==='stone')drawStone(p,item.obj);if(item.obj.type==='food')drawFood(p)}
  if(item.kind==='building')drawBuilding(p,item.obj)
 }
 if(!s.expanded){const pp=worldP(15,8);ctx.save();ctx.globalAlpha=.85;ellipse(pp.x,pp.y-48*zoom,31*zoom,18*zoom,'#fffaf0');text('🔒',pp.x,pp.y-41*zoom,23*zoom);ctx.restore()}
 if(selectedBuild){const p=worldP(s.hero.x,s.hero.y);ctx.save();ctx.globalAlpha=.9;text('🏗 PLACE BUILDING ON GRASS',renderW/2,renderH-34,Math.max(9,12*zoom),'#1c4930');ctx.restore()}
 if(path.length){for(let i=0;i<Math.min(path.length,12);i++){const p=worldP(path[i].x,path[i].y);ellipse(p.x,p.y,3*zoom,2*zoom,'#fff7cd99')}}
}
function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderW=r.width;renderH=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(renderW*dpr));canvas.height=Math.max(1,Math.round(renderH*dpr));ctx.setTransform(dpr,0,0,dpr,0,0)}
function loop(t){let dt=Math.min(100,t-lastTime||16);lastTime=t;frameT=t;autoUpdate(dt);ctx.setTransform(dpr,0,0,dpr,0,0);drawScene();requestAnimationFrame(loop)}
function setZoom(delta){zoom=clamp(Math.round((zoom+delta)*10)/10,.65,1.5);notify(`🔎 Zoom ${Math.round(zoom*100)}%`)}
function point(event){let r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top}}
function onMapClick(sx,sy){let obj=selectObjectPixel(sx,sy);if(obj&&!selectedBuild){attemptTile(obj.x,obj.y);return}let tile=inverse(sx,sy);attemptTile(tile.x,tile.y)}
function pointerStart(e){if(e.button&&e.button!==0)return;dragStart={...point(e),cx:cam.x,cy:cam.y};dragging=false;try{canvas.setPointerCapture(e.pointerId)}catch{}}
function pointerMove(e){if(!dragStart)return;const p=point(e),dx=p.x-dragStart.x,dy=p.y-dragStart.y;if(Math.abs(dx)+Math.abs(dy)>12)dragging=true;if(dragging){const wx=dx/(TW/2*zoom),wy=dy/(TH/2*zoom);cam.x=clamp(dragStart.cx-(wx+wy)*.5,1,W-2);cam.y=clamp(dragStart.cy-(wy-wx)*.5,1,H-2);cameraHold=Date.now()+18000}}
function pointerEnd(e){if(!dragStart)return;const p=point(e);if(!dragging)onMapClick(p.x,p.y);dragStart=null;dragging=false}
function setup(){
 canvas.addEventListener('pointerdown',pointerStart);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',()=>{dragStart=null;dragging=false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(e.deltaY<0?.1:-.1)},{passive:false});
 for(const button of document.querySelectorAll('[data-move]')){let timer=null;const dir={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[button.dataset.move];button.addEventListener('pointerdown',e=>{e.preventDefault();moveOne(...dir);timer=setInterval(()=>moveOne(...dir),155);button.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,()=>{clearInterval(timer);timer=null})}
 document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','escape'].includes(k)){if(e.target.tagName!=='INPUT')e.preventDefault();if(k==='escape'){selectedBuild=null;path=[];pending=null;updateUI()}else keys.add(k)}});
 document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
 $('buildGrid').addEventListener('click',e=>{const b=e.target.closest('[data-build]');if(!b)return;selectedBuild=b.dataset.build;path=[];pending=null;notify(`🏗 ${BUILDINGS[selectedBuild].name}: pilih tanah kosong`);updateUI()});
 $('craftGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-craft]');if(!btn)return;const key=btn.dataset.craft,r=CRAFT[key],lv=s.upgrades[key];if(lv>=3)return;const cost=Object.fromEntries(Object.entries(r.base).map(([k,n])=>[k,n*(lv+1)]));if(!spend(cost))return notify('Bahan crafting belum cukup.');s.upgrades[key]++;notify(`${r.emoji} ${r.name} ditingkatkan ke Lv ${lv+1}!`);beep(720);updateUI();saveSoon()});
 $('cancelBuildBtn').addEventListener('click',()=>{selectedBuild=null;updateUI()});$('recruitBtn').addEventListener('click',hire);$('expandBtn').addEventListener('click',expand);
 $('workerJobs').addEventListener('click',e=>{const btn=e.target.closest('[data-job]');if(!btn)return;const k=btn.dataset.job,d=Number(btn.dataset.change);if(d>0&&workerTotal()>=s.population-1)return notify('Rekrut lagi untuk menambah pekerja.');s.workers[k]=clamp(s.workers[k]+d,0,s.population-1);notify(d>0?'👷 Pekerja ditugaskan':'👷 Pekerja ditarik kembali');updateUI();saveSoon()});
 $('zoomIn').addEventListener('click',()=>setZoom(.1));$('zoomOut').addEventListener('click',()=>setZoom(-.1));$('centerCam').addEventListener('click',()=>{cam.x=s.hero.x;cam.y=s.hero.y;cameraHold=0});
 $('soundBtn').addEventListener('click',()=>{muted=!muted;$('soundBtn').textContent=muted?'♫':'♪';$('soundBtn').setAttribute('aria-pressed',String(!muted));if(!muted)beep()});
 const dlg=$('helpDialog');$('helpBtn').addEventListener('click',()=>dlg.showModal());$('closeHelp').addEventListener('click',()=>dlg.close());$('letsPlay').addEventListener('click',()=>dlg.close());dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();unsafeStore()}});window.addEventListener('pagehide',unsafeStore);
 resize();updateUI();checkQuests();requestAnimationFrame(loop);
}
setup();

/* This code runs in the same ES module as the TribeWorld game. */
const CLOUD_API='/api/tribeworld';
const CLOUD_LINK_KEY='tribeworld:cloud-link:v1';
let cloudAccount=null, cloudRevision=0, cloudReady=false, cloudBusy=false, cloudDebounce=null, cloudLocalSeq=0;
let cloudChoicePending=null;
const uiMsg=(message,error=false)=>{const el=$('cloudMessage');if(el){el.textContent=message;el.dataset.error=String(error)}};
const saveIndicator=(message)=>{const el=$('saveStatus');if(el)el.textContent=message};
const cloudFetch=async(endpoint,method='GET',body)=>{
 const opts={method,credentials:'same-origin',headers:{Accept:'application/json'}};
 if(body!==undefined){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}
 const r=await fetch(`${CLOUD_API}${endpoint}`,opts);
 const type=r.headers.get('content-type')||'';
 if(!type.includes('application/json'))throw Error('API Cloud Save belum tersedia. Periksa Nginx dan PM2. Progres lokal tetap aman.');
 const data=await r.json();if(!r.ok){const err=Error(data.error||`Server error ${r.status}`);err.status=r.status;throw err}return data;
};
function setCloudDisplay(){
 $('cloudGuest').hidden=Boolean(cloudAccount);$('cloudLogged').hidden=!cloudAccount;
 $('cloudAccount').textContent=cloudAccount?.email||'';
 if(!cloudAccount)saveIndicator('💾 Tersimpan di browser');
 else saveIndicator(cloudReady?'☁ Cloud Save aktif':'☁ Pilih progres untuk sync');
}
function cloudSchedule(){
 if(!cloudAccount||!cloudReady)return;
 clearTimeout(cloudDebounce);cloudDebounce=setTimeout(()=>cloudPush(),12000);
}
function acceptCloudState(state){
 if(!validImportState(state))throw Error('Format data cloud tidak kompatibel.');
 s={...initialState(),...structuredClone(state),lastTick:Date.now()};
 path=[];pending=null;selectedBuild=null;heroVisual={...s.hero};cam={...s.hero};
 updateUI();unsafeStore();
}
function validImportState(obj){return !!(obj&&obj.version===1&&obj.resources&&obj.hero&&Number.isInteger(obj.hero.x)&&Number.isInteger(obj.hero.y)&&obj.hero.x>=0&&obj.hero.x<W&&obj.hero.y>=0&&obj.hero.y<H&&Array.isArray(obj.nodes)&&Array.isArray(obj.buildings)&&obj.workers&&obj.upgrades&&obj.stats&&Number.isInteger(obj.population)&&obj.population>0&&obj.nodes.length<=500&&obj.buildings.length<=500&&['wood','stone','food'].every(k=>Number.isFinite(obj.resources[k])&&obj.resources[k]>=0));}
function cloudLink(){try{localStorage.setItem(CLOUD_LINK_KEY,JSON.stringify({userId:cloudAccount.id,revision:cloudRevision}))}catch{}}
function knownLink(){try{return JSON.parse(localStorage.getItem(CLOUD_LINK_KEY)||'null')}catch{return null}}
async function cloudPush(force=false){
 if(!cloudAccount||!cloudReady||cloudBusy)return;
 clearTimeout(cloudDebounce);cloudBusy=true;const seq=cloudLocalSeq;
 try{
  try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}
  const result=await cloudFetch('/save','PUT',{revision:cloudRevision,state:s});
  cloudRevision=result.revision;cloudLink();uiMsg('☁ Progres tersimpan di server · '+new Date(result.updatedAt).toLocaleTimeString('id-ID'));saveIndicator('☁ Tersimpan di cloud');
  if(cloudLocalSeq>seq&&cloudReady)cloudSchedule();
 }catch(e){if(e.status===409){cloudReady=false;saveIndicator('⚠ Konflik cloud');uiMsg('Ada progres berbeda di perangkat lain. Pilih mana yang dipertahankan.',true);await cloudResolve(true)}else{uiMsg(`Lokal aman, cloud belum tersinkron: ${e.message}`,true);saveIndicator('💾 Lokal aman · Cloud tertunda')}}
 finally{cloudBusy=false}
}
async function cloudResolve(conflict=false){
 const data=await cloudFetch('/save');
 if(!data.save){cloudRevision=0;cloudReady=true;$('cloudConflict').hidden=true;setCloudDisplay();await cloudPush(true);return;}
 cloudChoicePending=data.save;
 const link=knownLink();
 if(!conflict&&link?.userId===cloudAccount.id&&link.revision===data.save.revision){
  cloudRevision=data.save.revision;cloudReady=true;$('cloudConflict').hidden=true;setCloudDisplay();
  uiMsg('Akun terhubung · autosave cloud aktif.');cloudSchedule();return;
 }
 cloudReady=false;$('cloudConflict').hidden=false;
 setCloudDisplay();uiMsg('Progres cloud ditemukan. Pilih desa dari cloud atau desa yang ada di perangkat ini.');
}
async function cloudLoginOrRegister(mode){
 const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
 if(!email||password.length<10){uiMsg('Masukkan email valid dan password minimal 10 karakter.',true);return}
 for(const b of [$('cloudLogin'),$('cloudRegister')])b.disabled=true;
 try{
  const data=await cloudFetch(mode,'POST',{email,password});cloudAccount=data.account;
  $('cloudPassword').value='';setCloudDisplay();await cloudResolve();
 }catch(e){uiMsg(e.message,true)}finally{for(const b of [$('cloudLogin'),$('cloudRegister')])b.disabled=false}
}
function forceLocalBackup(){
 unsafeStore();const payload={type:'tribeworld-save',exportVersion:1,exportedAt:new Date().toISOString(),state:s};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`TribeWorld-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 uiMsg('Backup JSON berhasil disiapkan. Simpan file di tempat aman.');
}
async function setupCloudSave(){
 const target=document.querySelector('.arcade-player-actions')||document.querySelector('.top-actions');
 const btn=document.createElement('button');btn.type='button';btn.className='tw-cloud-button';btn.innerHTML='<span class="tw-cloud-label">☁ Simpan / Akun</span><span class="tw-cloud-short">☁</span>';btn.title='Autosave, backup dan akun Cloud Save';btn.setAttribute('aria-label','Pusat penyimpanan TribeWorld');
 target?.prepend(btn);
 const dlg=$('saveDialog');btn.addEventListener('click',()=>{dlg.showModal();if(!cloudAccount)uiMsg('Tanpa login, game disimpan di perangkat ini. Unduh backup jika ingin memindahkannya.')});
 $('closeSave').addEventListener('click',()=>dlg.close());
 $('saveNowBtn').addEventListener('click',async()=>{unsafeStore();uiMsg('Progres lokal sudah disimpan.');if(cloudAccount&&cloudReady)await cloudPush(true)});
 $('exportSaveBtn').addEventListener('click',forceLocalBackup);
 $('importSaveBtn').addEventListener('click',()=>$('importSaveFile').click());
 $('importSaveFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>250000)throw Error('File backup terlalu besar.');
   const obj=JSON.parse(await file.text());const state=obj?.type==='tribeworld-save'?obj.state:obj;
   if(!validImportState(state))throw Error('Format backup bukan TribeWorld v1 yang valid.');
   if(!confirm('Pulihkan backup ini? Progres lokal yang sekarang akan digantikan. Unduh backup dulu jika diperlukan.'))return;
   acceptCloudState(state);cloudLocalSeq++;
   if(cloudAccount){cloudReady=false;await cloudResolve(true)}
   uiMsg('Backup dipulihkan secara lokal. Jika sudah login, pilih Kirim desa perangkat ini untuk cloud.');
  }catch(error){uiMsg(error.message,true)}finally{e.target.value=''}
 });
 $('cloudLogin').addEventListener('click',()=>cloudLoginOrRegister('/login'));
 $('cloudRegister').addEventListener('click',()=>cloudLoginOrRegister('/register'));
 $('cloudAuthForm').addEventListener('submit',e=>{e.preventDefault();cloudLoginOrRegister('/login')});
 $('cloudLogout').addEventListener('click',async()=>{try{await cloudFetch('/logout','POST',{})}catch{}cloudAccount=null;cloudReady=false;cloudRevision=0;clearTimeout(cloudDebounce);setCloudDisplay();uiMsg('Keluar akun. Progres tetap tersedia di browser ini.');});
 $('cloudSyncNow').addEventListener('click',async()=>{if(cloudReady)await cloudPush(true);else await cloudResolve(true)});
 $('cloudUseRemote').addEventListener('click',()=>{
  if(!cloudChoicePending)return;
  try{acceptCloudState(cloudChoicePending.state);cloudRevision=cloudChoicePending.revision;cloudReady=true;cloudLink();$('cloudConflict').hidden=true;setCloudDisplay();uiMsg('Progres cloud berhasil dipulihkan.')}catch(e){uiMsg(e.message,true)}
 });
 $('cloudUseLocal').addEventListener('click',async()=>{
  if(!cloudChoicePending)return;
  if(!confirm('Ganti save cloud dengan desa yang ada di perangkat ini? Disarankan unduh backup dulu.'))return;
  cloudRevision=cloudChoicePending.revision;cloudReady=true;$('cloudConflict').hidden=true;setCloudDisplay();await cloudPush(true);
 });
 setCloudDisplay();
 try{const info=await cloudFetch('/me');if(info.authenticated){cloudAccount=info.account;setCloudDisplay();await cloudResolve()}else uiMsg('Mode tamu aktif. Progres tetap tersimpan di browser.')}catch(e){uiMsg('Cloud belum tersedia. Autosave lokal tetap berjalan. '+e.message,true)}
}
window.addEventListener('DOMContentLoaded',setupCloudSave);

