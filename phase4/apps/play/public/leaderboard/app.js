(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const games={snake:{modes:[['classic','Classic'],['chill','Chill'],['turbo','Turbo']],unit:'pts'},orbit:{modes:[['standard','Standard']],unit:'m'},skyhop:{modes:[['world-1','World 1'],['world-2','World 2'],['world-3','World 3']],unit:'koin'},hoof:{modes:[['sandbox','Jarak terjauh']],unit:'cm'},octopus:{modes:[['freeclimb','Panjat santai']],unit:'cm'}};
 const url=new URL(window.location.href);
 let game=games[url.searchParams.get('game')]?url.searchParams.get('game'):'snake';
 let mode=url.searchParams.get('mode');
 let period='all',loadSeq=0;
 const fetchJSON=async(endpoint,opts)=>{const r=await fetch('/api/leaderboard/'+endpoint,{credentials:'same-origin',signal:AbortSignal.timeout(7000),...opts});const x=await r.json();if(!r.ok)throw new Error(x.error||'Server tidak tersedia');return x;};
 const dateText=iso=>{const d=new Date(iso);return Number.isFinite(+d)?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(d):'—'};
 function safeNode(tag,txt,cls){const el=document.createElement(tag);el.textContent=txt;if(cls)el.className=cls;return el;}
 function loadModes(){const select=$('mode');select.replaceChildren();for(const [val,name] of games[game].modes){const opt=document.createElement('option');opt.value=val;opt.textContent=name;select.appendChild(opt);}if(!games[game].modes.some(x=>x[0]===mode))mode=games[game].modes[0][0];select.value=mode;
  document.querySelectorAll('[data-game]').forEach(b=>{const on=b.dataset.game===game;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 }
 function syncUrl(){const u=new URL(location.href);u.searchParams.set('game',game);u.searchParams.set('mode',mode);if(location.protocol==='http:'||location.protocol==='https:')history.replaceState(null,'',u.pathname+u.search);}
 function formatScore(n){return games[game].unit==='ms'?(n/1000).toFixed(2)+' s':games[game].unit==='cm'?(n/100).toLocaleString('id-ID',{maximumFractionDigits:1,minimumFractionDigits:1})+' m':n.toLocaleString('id-ID')+(game==='orbit'?' m':'');}
 function placeholder(msg){const tr=document.createElement('tr');const td=safeNode('td',msg,'empty');td.colSpan=4;tr.appendChild(td);$('board').replaceChildren(tr);}
 async function refresh(){const seq=++loadSeq;syncUrl();$('refresh').disabled=true;$('boardStatus').textContent='Memuat peringkat terbaru...';placeholder('Sedang mengambil skor...');
  try{
   const q=new URLSearchParams({game,mode,period,limit:'50'});
   const [data,me]=await Promise.all([fetchJSON('top?'+q),fetchJSON('mine?'+q)]);
   if(seq!==loadSeq)return;
   const rows=[];
   for(const item of data.items){const tr=document.createElement('tr');if(item.isMe)tr.classList.add('me');
    const rank=document.createElement('td');rank.appendChild(safeNode('span',item.rank<=3?['🥇','🥈','🥉'][item.rank-1]:'#'+item.rank,item.rank<=3?'medal':''));tr.appendChild(rank);
    const player=document.createElement('td');player.appendChild(safeNode('span',item.nickname));if(item.isMe)player.appendChild(safeNode('span','KAMU','me-mark'));tr.appendChild(player);
    tr.appendChild(safeNode('td',formatScore(item.score)));tr.appendChild(safeNode('td',dateText(item.achievedAt)));rows.push(tr);
   }
   if(rows.length)$('board').replaceChildren(...rows);else placeholder('Belum ada skor. Jadilah pemain pertama!');
   $('ownRank').textContent=me.rank?'#'+me.rank:'—';$('ownScore').textContent=me.score===null?'—':formatScore(me.score);
   $('myNote').textContent=me.rank?'Mantap! Main lagi untuk meningkatkan posisi.':'Belum tercatat. Buka game, lalu selesaikan ronde.';
   $('boardStatus').textContent=data.items.length+' pemain ditampilkan · '+(period==='7d'?'7 hari terakhir':'sepanjang masa');
  }catch(e){if(seq!==loadSeq)return;placeholder('Leaderboard belum terhubung. Periksa apakah API sudah aktif.');$('boardStatus').textContent=e.message;$('ownRank').textContent='—';$('ownScore').textContent='—';}finally{if(seq===loadSeq)$('refresh').disabled=false;}
 }
 document.querySelectorAll('[data-game]').forEach(btn=>btn.addEventListener('click',()=>{game=btn.dataset.game;mode=null;loadModes();refresh();}));
 $('mode').addEventListener('change',e=>{mode=e.target.value;refresh();});
 $('period').addEventListener('change',e=>{period=e.target.value;refresh();});
 $('refresh').addEventListener('click',refresh);
 $('profileForm').addEventListener('submit',async e=>{
  e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;$('profileFeedback').textContent='Menyimpan nama...';
  try{const x=await fetchJSON('profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:$('nickname').value.trim()})});$('currentName').textContent=x.nickname;$('nickname').value=x.nickname;$('profileFeedback').textContent='Nama berhasil disimpan. Skor lamamu juga ikut berubah nama.';refresh();}
  catch(err){$('profileFeedback').textContent=err.message;}finally{button.disabled=false;}
 });
 loadModes();fetchJSON('me').then(p=>{$('currentName').textContent=p.nickname;$('nickname').value=p.nickname;}).catch(()=>{$('currentName').textContent='Server belum aktif';$('profileFeedback').textContent='Aktifkan backend leaderboard melalui PM2.';});refresh();
})();
