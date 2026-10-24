(() => {
'use strict';
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', {alpha:false});
if(!ctx) return;
const $ = (id) => document.getElementById(id);
const SIZE = 20, TILE=30, W=600;
const KEY = 'febro-arcade:neon-snake:best:v1';
const MODES={chill:178,classic:128,turbo:86};
let phase='ready', snake=[], dir={x:1,y:0}, queued=null, food={x:14,y:10}, score=0, level=1, ticks=0, best=0;
let lastTime=0, elapsed=0, blinkTime=0, sound=false, audio=null;
let onlineRound=null;
try {best=Number(localStorage.getItem(KEY))||0;} catch {}
$('best').textContent=best;
function announce(message){$('announcer').textContent=message;}
function beep(f=600,d=.07,type='square'){
 if(!sound) return;
 try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
 const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(f,audio.currentTime);
 gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);
 osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+d);}catch{}
}
function updateStats(){ $('score').textContent=score;$('best').textContent=best;$('level').textContent=level;$('length').textContent=snake.length; }
function showOverlay(kicker,title,message,emoji,button,extra=''){
 $('overlay').hidden=false;$('overlayKicker').textContent=kicker;$('overlayTitle').innerHTML=title;$('overlayMessage').textContent=message;$('overlayEmoji').textContent=emoji;$('startBtn').textContent=button;
 $('overlayScore').hidden=!extra;$('overlayScore').textContent=extra;
}
function hideOverlay(){$('overlay').hidden=true;}
function reset(){
 snake=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];dir={x:1,y:0};queued=null;
 score=0;level=1;ticks=0;lastTime=0;elapsed=0;placeFood();updateStats();
}
function placeFood(){
 const available=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(!snake.some(s=>s.x===x&&s.y===y))available.push({x,y});
 if(!available.length){complete();return;}food=available[Math.floor(Math.random()*available.length)];
}
function start(){reset();onlineRound=window.ArcadeScores?.begin('snake',$('speed').value)||null;phase='playing';hideOverlay();$('pauseBtn').textContent='Ⅱ PAUSE';$('speed').disabled=true;announce('Neon Snake dimulai');beep(460,.09);}
function complete(){if(score>0)window.ArcadeScores?.end(onlineRound,score);phase='gameover';showOverlay('PERFECT RUN!','BOARD<br>COMPLETE!','Semua kotak berhasil kamu isi!','🏆','↻ MAIN LAGI',`SCORE ${score}`);}
function die(){if(score>0)window.ArcadeScores?.end(onlineRound,score);phase='gameover';beep(190,.3,'sawtooth');$('pauseBtn').textContent='Ⅱ PAUSE';$('speed').disabled=false;
 showOverlay('GAME OVER','OUCH!<br>COBA LAGI?','Kena dinding atau ekormu sendiri. Rekormu masih tersimpan!','💥','↻ COBA LAGI',`SCORE ${score} · BEST ${best}`);announce(`Game over. Skor ${score}.`);}
function togglePause(){
 if(phase==='ready'||phase==='gameover'){start();return;}
 if(phase==='playing'){phase='paused';showOverlay('GAME PAUSED','ISTIRAHAT<br>DULU.','Tekan lanjut atau Space / P untuk main lagi.','⏸️','▶ LANJUT MAIN',`SCORE ${score}`);$('pauseBtn').textContent='▶ RESUME';announce('Game dijeda');}
 else if(phase==='paused'){phase='playing';lastTime=0;elapsed=0;hideOverlay();$('pauseBtn').textContent='Ⅱ PAUSE';announce('Game dilanjutkan');}
}
function requestDirection(next){
 if(phase!=='playing')return;
 // One turn per tick: disallow a rapid 180 degree reversal by spamming inputs.
 if(queued)return;
 const v={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[next];
 if(!v || (v.x===dir.x&&v.y===dir.y) || (v.x===-dir.x && v.y===-dir.y))return;
 queued=v;
}
function step(){
 if(phase!=='playing')return;
 if(queued){dir=queued;queued=null;}
 const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
 const eat=head.x===food.x&&head.y===food.y;
 // Tail moves away when not eating; entering its old tile is safe.
 const body=eat?snake:snake.slice(0,-1);
 if(head.x<0||head.y<0||head.x>=SIZE||head.y>=SIZE||body.some(s=>s.x===head.x&&s.y===head.y)){die();return;}
 snake.unshift(head);
 if(eat){score+=10;level=1+Math.floor(score/50);if(score>best){best=score;try{localStorage.setItem(KEY,String(best));}catch{}}
 beep(640+Math.min(400,score*3),.065);placeFood();announce(`Skor ${score}`);
 }else{snake.pop();}
 ticks++;updateStats();
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function draw(time){
 blinkTime=time;
 rect(0,0,W,W,'#29234d');
 ctx.strokeStyle='#4e4779';ctx.lineWidth=1;
 for(let i=0;i<=SIZE;i++){ctx.beginPath();ctx.moveTo(i*TILE+.5,0);ctx.lineTo(i*TILE+.5,W);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*TILE+.5);ctx.lineTo(W,i*TILE+.5);ctx.stroke();}
 // Tiny retro corner decorations.
 for(let i=0;i<12;i++){const x=((i*157+23)%575)+10,y=((i*91+173)%550)+20;rect(x,y,3,3,i%3===0?'#5f5388':'#3e396c');}
 if(snake.length){snake.forEach((seg,i)=>{
 const x=seg.x*TILE,y=seg.y*TILE;
 rect(x+2,y+2,TILE-3,TILE-3,'#17152f');
 rect(x+2,y+1,TILE-6,TILE-6,i===0?'#b7f49a':i%2?'#73da8b':'#81e6a0');
 rect(x+4,y+3,TILE-10,4,i===0?'#d6ffb0':'#a2f1a6');
 if(i===0){
 const f=dir.x!==0?{x:dir.x>0?19:5,y:8,other:16,otherY:18}:{x:10,y:dir.y>0?20:5,other:19,otherY:9};
 if(dir.x!==0){rect(x+f.x,y+7,4,5,'#282249');rect(x+f.x,y+19,4,5,'#282249');}
 else{rect(x+6,y+f.y,5,4,'#282249');rect(x+19,y+f.y,5,4,'#282249');}
 }
 });}
 const fx=food.x*TILE,fy=food.y*TILE;
 const bob=Math.sin(time/200)*2;
 rect(fx+7,fy+7+bob,20,20,'#160f2d');rect(fx+5,fy+4+bob,20,20,'#f39eb9');rect(fx+10,fy+7+bob,5,5,'#ffdce7');rect(fx+15,fy+1+bob,4,6,'#83e58e');
 // A subtle scanline overlay for the retro effect.
 ctx.fillStyle='rgba(16,13,34,0.055)';for(let y=0;y<W;y+=6)ctx.fillRect(0,y,W,2);
}
function frame(time){
 if(phase==='playing'){
  if(lastTime===0)lastTime=time;
  elapsed+=Math.min(time-lastTime,200);lastTime=time;
  const interval=Math.max(58,MODES[$('speed').value]-Math.min(46,Math.floor(score/50)*6));
  if(elapsed>=interval){step();elapsed=0;}
 }else{lastTime=0;elapsed=0;}
 draw(time);requestAnimationFrame(frame);
}
const keymap={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
document.addEventListener('keydown',e=>{
 const tag=e.target.tagName;if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
 if(keymap[e.code]){e.preventDefault();requestDirection(keymap[e.code]);}
 if(e.code==='Space'||e.code==='KeyP'){e.preventDefault();togglePause();}
});
let pointer=null;
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{
 if(!pointer)return;
 const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
 requestDirection(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
});
canvas.addEventListener('pointercancel',()=>pointer=null);
document.querySelectorAll('[data-dir]').forEach(button=>button.addEventListener('pointerdown',e=>{e.preventDefault();requestDirection(button.dataset.dir);}));
$('startBtn').addEventListener('click',()=>phase==='paused'?togglePause():start());
$('pauseBtn').addEventListener('click',togglePause);
$('restartBtn').addEventListener('click',start);
$('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'♪ SUARA ON':'♪ SUARA OFF';$('soundBtn').setAttribute('aria-pressed',String(sound));beep();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')togglePause();});
reset();phase='ready';requestAnimationFrame(frame);
})();
