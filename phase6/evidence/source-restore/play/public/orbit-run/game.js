(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
const $=(id)=>document.getElementById(id);
const W=720,H=760,LANES=[180,360,540],SHIP_Y=615,STORE='febro-arcade:orbit-run:best:v1';
let onlineRound=null;
let phase='ready',lane=1,visualX=LANES[1],objects=[],particles=[],hp=3,shield=0,stars=0,distance=0,best=0,time=0,last=0,spawnIn=.8,invuln=0,sound=false,audio=null,flash=0;
try{best=Math.max(0,Number(localStorage.getItem(STORE))||0);}catch{}
let savedBest=Math.floor(best);
function saveBest(){const rounded=Math.floor(best);if(rounded<=savedBest)return;try{localStorage.setItem(STORE,String(rounded));savedBest=rounded;}catch{}}
$('best').textContent=Math.floor(best)+'m';
function beep(f=550,d=.07,type='sine'){
 if(!sound)return;
 try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,audio.currentTime);g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}
}
function announce(msg){$('announcer').textContent=msg;}
function stats(){
 $('distance').textContent=Math.floor(distance)+'m';$('best').textContent=Math.floor(best)+'m';$('stars').textContent=stars;
 $('health').textContent='♥'.repeat(hp)+'♡'.repeat(3-hp)+(shield?' 🛡':'');
}
function overlay(kicker,title,message,emoji,button,extra=''){
 $('overlay').hidden=false;$('overlayKicker').textContent=kicker;$('overlayTitle').innerHTML=title;$('overlayMessage').textContent=message;$('overlayEmoji').textContent=emoji;$('startBtn').textContent=button;
 $('overlayScore').hidden=!extra;$('overlayScore').textContent=extra;
}
function reset(){lane=1;visualX=LANES[1];objects=[];particles=[];hp=3;shield=0;stars=0;distance=0;time=0;last=0;spawnIn=.68;invuln=0;flash=0;stats();}
function start(){reset();onlineRound=window.ArcadeScores?.begin('orbit','standard')||null;phase='playing';$('overlay').hidden=true;$('pauseBtn').textContent='Ⅱ PAUSE';beep(540,.12);announce('Roket diluncurkan! Hindari asteroid.');}
function pause(){
 saveBest();
 if(phase==='ready'||phase==='gameover'){start();return;}
 if(phase==='playing'){phase='paused';overlay('FLIGHT PAUSED','TAKE A<br>BREAK.','Tekan lanjut atau Space/P jika sudah siap terbang lagi.','⏸️','▶ LANJUT TERBANG',`${Math.floor(distance)}m · ★ ${stars}`);$('pauseBtn').textContent='▶ RESUME';}
 else if(phase==='paused'){phase='playing';last=0;$('overlay').hidden=true;$('pauseBtn').textContent='Ⅱ PAUSE';}
}
function over(){saveBest();if(Math.floor(distance)>0)window.ArcadeScores?.end(onlineRound,Math.floor(distance));phase='gameover';beep(190,.25,'sawtooth');$('pauseBtn').textContent='Ⅱ PAUSE';overlay('MISSION ENDED','HOUSTON,<br>TRY AGAIN!','Tiga nyawa habis. Berani terbang lebih jauh?','💫','↻ TERBANG LAGI',`${Math.floor(distance)}m · ★ ${stars} · BEST ${Math.floor(best)}m`);announce(`Game over pada ${Math.floor(distance)} meter`);}
function move(dx){if(phase!=='playing')return;const next=Math.max(0,Math.min(2,lane+dx));if(next!==lane){lane=next;beep(420,.038);}}
function spawn(){
 const order=[0,1,2].sort(()=>Math.random()-.5);
 const double=Math.random()<Math.min(.48,.16+distance/7000),blocked=order.slice(0,double?2:1);
 for(const l of blocked){objects.push({kind:'rock',lane:l,y:-78,r:34+Math.random()*8,angle:Math.random()*7,spin:(Math.random()-.5)*2,hit:false});}
 const free=[0,1,2].filter(l=>!blocked.includes(l));
 if(free.length&&Math.random()<.71){const l=free[Math.floor(Math.random()*free.length)];objects.push({kind:Math.random()<.1?'shield':'star',lane:l,y:-78,r:24,angle:0,spin:1,hit:false});}
}
function sparks(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=55+Math.random()*140;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.35,color});}}
function hit(o){o.hit=true;
 if(o.kind==='star'){stars++;beep(750,.09,'triangle');sparks(LANES[o.lane],o.y,'#ffe588',8);announce('Bintang +1');}
 else if(o.kind==='shield'){shield=1;beep(900,.16);sparks(LANES[o.lane],o.y,'#7ae7fc',12);announce('Perisai aktif');}
 else if(o.kind==='rock'){
  if(invuln>0)return;
  sparks(LANES[o.lane],SHIP_Y,'#ff9fb7',20);
  invuln=1.35;flash=.25;
  if(shield){shield=0;beep(280,.17);announce('Perisai menyerap benturan');}
  else{hp--;beep(145,.22,'sawtooth');announce(`Tersisa ${hp} nyawa`);if(hp===0)over();}
 }
 stats();
}
function tick(dt){
 time+=dt;const speed=Math.min(585,265+distance*.105);
 distance+=dt*(26+Math.min(45,distance*.018));
 if(distance>best){best=distance;if(best-savedBest>35)saveBest();}
 invuln=Math.max(0,invuln-dt);flash=Math.max(0,flash-dt);visualX+=(LANES[lane]-visualX)*Math.min(1,dt*15);
 spawnIn-=dt;
 if(spawnIn<=0){spawn();spawnIn=(.9-Math.min(.35,distance/3800))*(.8+Math.random()*.45);}
 for(const o of objects){o.y+=speed*dt;o.angle+=o.spin*dt;if(!o.hit&&o.lane===lane&&Math.abs(o.y-SHIP_Y)<46){hit(o);if(phase!=='playing')break;}}
 objects=objects.filter(o=>!o.hit&&o.y<H+75);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 stats();
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function circle(x,y,r,fill,stroke=null,line=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function starShape(x,y,r,fill){ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<10;i++){const rr=i%2===0?r:r*.43,a=-Math.PI/2+i*Math.PI/5;const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#543d4b';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
function planet(x,y,r){
 ctx.save();ctx.translate(x,y);ctx.rotate(-.36);ctx.strokeStyle='#313660';ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.beginPath();ctx.ellipse(0,0,r*1.6,r*.7,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.rotate(.36);
 circle(0,0,r,'#f4a1bd','#3c365d',6);
 ctx.beginPath();ctx.arc(0,0,r-4,-1.55,1.15);ctx.strokeStyle='#de739c';ctx.lineWidth=r*.26;ctx.stroke();
 circle(-r*.32,-r*.37,r*.22,'#f9b7cc');ctx.restore();
}
function drawBackground(t){
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#80b5e8');grad.addColorStop(.55,'#aad7fa');grad.addColorStop(1,'#c9e9f7');rect(0,0,W,H,grad);
 // Decorative floating stars: fixed positions so no flicker.
 for(let i=0;i<42;i++){const x=(i*113+43)%W,y=(i*197+31)%H;const bright=.35+.65*(.5+.5*Math.sin(t*.0015+i*4));ctx.globalAlpha=bright;rect(x,y, i%5===0?6:3,i%5===0?6:3,i%3===0?'#fff4ba':'#fff');}ctx.globalAlpha=1;
 planet(535,180,91);
 circle(135,220,29,'#fbe5a2','#43406b',4);circle(124,211,9,'#ffeec9');
 // Translucent three-lane racing track. Center highlights and scrolling dashes.
 rect(82,0,556,H,'rgba(30,48,91,.16)');
 for(let i=0;i<3;i++){
 const x=LANES[i];rect(x-73,0,146,H,'rgba(248,252,255,.15)');
 const offset=(time*155)%74;for(let y=-90+offset;y<H;y+=74){rect(x-2,y,4,25,'rgba(255,255,255,.42)');}
 }
 for(const x of [82,638])rect(x,0,3,H,'rgba(50,51,95,.26)');
 // Horizon depth overlay.
 const fade=ctx.createLinearGradient(0,0,0,H);fade.addColorStop(0,'rgba(30,45,90,.28)');fade.addColorStop(.3,'rgba(30,45,90,0)');fade.addColorStop(1,'rgba(32,32,70,.07)');rect(0,0,W,H,fade);
}
function drawAsteroid(o){const x=LANES[o.lane],y=o.y,r=o.r;
 ctx.save();ctx.translate(x,y);ctx.rotate(o.angle);
 ctx.beginPath();for(let i=0;i<9;i++){const a=i*Math.PI*2/9,v=r*(i%3===0?1.06:.88);i===0?ctx.moveTo(Math.cos(a)*v,Math.sin(a)*v):ctx.lineTo(Math.cos(a)*v,Math.sin(a)*v);}ctx.closePath();ctx.fillStyle='#635a91';ctx.fill();ctx.strokeStyle='#2a2851';ctx.lineWidth=6;ctx.stroke();
 circle(-r*.28,-r*.22,r*.20,'#9c8fc1');circle(r*.26,r*.19,r*.15,'#4c4778');circle(-r*.20,r*.37,r*.1,'#484272');ctx.restore();
}
function drawItem(o,t){const x=LANES[o.lane],y=o.y+Math.sin(t*.004+o.lane)*5;
 if(o.kind==='rock')return drawAsteroid(o);
 if(o.kind==='star'){circle(x,y,35,'rgba(255,228,117,.25)');starShape(x,y,27,'#ffdc5b');circle(x-7,y-9,5,'#fff2c0');}
 if(o.kind==='shield'){circle(x,y,36,'rgba(101,221,252,.30)');circle(x,y,29,'#9ae8f7','#344d7e',4);ctx.strokeStyle='#2a4d7c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+15,y-10);ctx.lineTo(x+12,y+10);ctx.lineTo(x,y+21);ctx.lineTo(x-12,y+10);ctx.lineTo(x-15,y-10);ctx.closePath();ctx.stroke();}
}
function drawShip(t){
 const x=visualX,y=SHIP_Y;
 if(invuln>0&&Math.floor(t/90)%2)return;
 ctx.save();ctx.translate(x,y);
 // Engine trail, animated
 for(let i=0;i<4;i++){const h=14+Math.sin(t*.026+i)*9;rect(-18+i*9,30,5,h,'#ffc850');rect(-15+i*9,30,4,h*.6,'#fff6ae');}
 ctx.beginPath();ctx.moveTo(0,-47);ctx.lineTo(31,10);ctx.lineTo(22,32);ctx.lineTo(0,18);ctx.lineTo(-22,32);ctx.lineTo(-31,10);ctx.closePath();ctx.fillStyle='#32305f';ctx.fill();
 ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(23,19);ctx.lineTo(0,9);ctx.lineTo(-23,19);ctx.closePath();ctx.fillStyle='#fff1b3';ctx.fill();
 ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(13,9);ctx.lineTo(0,3);ctx.lineTo(-13,9);ctx.closePath();ctx.fillStyle='#f69fb8';ctx.fill();
 circle(0,3,8,'#81cbea','#343b6a',3);
 if(shield){ctx.beginPath();ctx.arc(0,0,53,0,Math.PI*2);ctx.strokeStyle='#72e0ff';ctx.lineWidth=6;ctx.stroke();}
 ctx.restore();
}
function drawHud(){
 ctx.fillStyle='rgba(38,42,84,.87)';ctx.beginPath();ctx.roundRect(15,16,355,67,12);ctx.fill();
 ctx.fillStyle='#fff5da';ctx.font='bold 20px ui-monospace,monospace';ctx.fillText(`♥ ${hp}/3`,33,45);ctx.fillText(`★ ${stars}`,170,45);
 ctx.font='bold 17px ui-monospace,monospace';ctx.fillStyle='#a7f5b8';ctx.fillText(`DISTANCE ${Math.floor(distance)}m`,33,69);
 ctx.fillStyle='rgba(38,42,84,.87)';ctx.beginPath();ctx.roundRect(571,16,133,47,9);ctx.fill();ctx.fillStyle='#fff5da';ctx.font='bold 15px ui-monospace,monospace';ctx.fillText(`LV ${1+Math.floor(distance/500)}`,590,46);
 if(shield){ctx.fillStyle='#207c9b';ctx.fillRect(521,77,183,26);ctx.fillStyle='white';ctx.font='bold 13px ui-monospace,monospace';ctx.fillText('✦ SHIELD ACTIVE',531,96);}
}
function draw(t){drawBackground(t);for(const o of objects)drawItem(o,t);
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life/.35);rect(p.x,p.y,7,7,p.color);}ctx.globalAlpha=1;
 drawShip(t);drawHud();if(flash>0){rect(0,0,W,H,`rgba(255,67,113,${flash*.7})`);}
}
function frame(t){if(phase==='playing'){
  if(!last)last=t;const dt=Math.min(.05,Math.max(0,(t-last)/1000));last=t;tick(dt);
 }else{last=0;}
 if(phase!=='playing'){visualX+=(LANES[lane]-visualX)*.25;}
 draw(t);requestAnimationFrame(frame);
}
let pointer=null;
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x;const px=e.clientX;pointer=null;if(Math.abs(dx)>20)move(dx>0?1:-1);else if(phase==='playing'){const box=canvas.getBoundingClientRect();move(px<box.left+box.width/2?-1:1);}});
canvas.addEventListener('pointercancel',()=>pointer=null);
$('leftBtn').addEventListener('pointerdown',e=>{e.preventDefault();move(-1);});
$('rightBtn').addEventListener('pointerdown',e=>{e.preventDefault();move(1);});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(['ArrowLeft','KeyA','ArrowRight','KeyD','Space','KeyP'].includes(e.code)){e.preventDefault();}
 if(e.code==='ArrowLeft'||e.code==='KeyA')move(-1);
 else if(e.code==='ArrowRight'||e.code==='KeyD')move(1);
 else if(e.code==='Space'||e.code==='KeyP')pause();
});
$('startBtn').addEventListener('click',()=>phase==='paused'?pause():start());
$('pauseBtn').addEventListener('click',pause);
$('restartBtn').addEventListener('click',start);
$('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'♪ SUARA ON':'♪ SUARA OFF';$('soundBtn').setAttribute('aria-pressed',String(sound));beep(600,.1);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause();});
window.addEventListener('pagehide',saveBest);
reset();phase='ready';requestAnimationFrame(frame);
})();
