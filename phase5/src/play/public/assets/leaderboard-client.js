/* Febro Arcade score SDK v1.6: shared identity and best-score tracking. */
(()=>{'use strict';
 const API='/api/leaderboard/';
 async function request(route,body){
  const res=await fetch(API+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8500)});
  const type=res.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw Error('API tidak menghasilkan JSON; cek proxy Nginx.');
  const data=await res.json();if(!res.ok)throw Error(data.error||'Leaderboard tidak tersedia');return data;
 }
 document.addEventListener('arcade:score-saved',e=>{const el=document.getElementById('onlineScoreStatus');if(el)el.textContent=`✓ Rekor ${e.detail.score} tercatat. Peringkat #${e.detail.rank||'—'}.`;});
 document.addEventListener('arcade:score-error',e=>{const el=document.getElementById('onlineScoreStatus');if(el)el.textContent='⚠ '+e.detail.message;});
 window.ArcadeScores={
  begin(game,mode){
   const pending=(async()=>{
    if(window.ArcadeIdentity?.ready){const ok=await window.ArcadeIdentity.ready;if(!ok) return null;}
    return request('start',{game,mode});
   })().catch(e=>{console.warn('Leaderboard start:',e.message);return null;});
   return {game,mode,pending,sent:false};
  },
  async end(round,score){
   if(!round||round.sent||!Number.isSafeInteger(score)||score<=0)return null;
   round.sent=true;
   try{const session=await round.pending;if(!session)return null;
    const result=await request('finish',{runId:session.runId,score});
    document.dispatchEvent(new CustomEvent('arcade:score-saved',{detail:result}));return result;
   }catch(e){document.dispatchEvent(new CustomEvent('arcade:score-error',{detail:{message:e.message}}));console.warn('Leaderboard finish:',e.message);return null;}
  }
 };
})();
