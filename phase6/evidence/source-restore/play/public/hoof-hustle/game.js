/* Hoof Hustle — original Febro Arcade silly-physics sandbox. Canvas, no external assets. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),canvas=$('gameCanvas'),c=canvas.getContext('2d',{alpha:false}),pads=[...document.querySelectorAll('[data-leg]')];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,t)=>a+(b-a)*t;
 const KEY=['KeyQ','KeyW','KeyO','KeyP'],COL=['#f18b05','#20b468','#d44991','#3495f5'];
 const STORE='febroArcade.hoofHustle.v17';let best=0;
 try{best=Number(localStorage.getItem(STORE)||'0')||0}catch{}
 let onlineRound=null;let state='menu',dist=0,speed=0,fallCount=0,elapsed=0,bodyTilt=0,tiltV=0,headBob=0,fallTimer=0,fallDir=1,unsteady=0,muted=false,audio=null,drag=0;
 let W=0,H=0,DPR=1,last=0,screenClock=0,toastTimer=0,shake=0,leg=[0,1,2,3].map(i=>({held:false,raise:0,kick:0,holdTime:0,ground:true}));
 let dust=[];
 function sfx(f=220,t=.08){if(muted)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio??=new AC();audio.resume?.();let o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.7),audio.currentTime+t);g.gain.setValueAtTime(.038,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+t);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+t+.01);}catch{}}
 function flash(msg){let e=$('toast');e.textContent=msg;e.classList.add('show');toastTimer=performance.now()+1400;}
 function hud(){ $('distLabel').innerHTML=dist.toFixed(1).replace('.',',')+' <em>m</em>';$('bestLabel').innerHTML=Math.max(best,dist).toFixed(1).replace('.',',')+' <em>m</em>';$('fallsLabel').textContent=fallCount;$('riseBtn').hidden=state!=='fallen';$('oops').hidden=state!=='fallen'&&state!=='tumbling';$('pauseBtn').hidden=state!=='play';}
 function persist(){if(dist>best){best=dist;try{localStorage.setItem(STORE,best.toFixed(2))}catch{}}}
 function start(){if(state==='play'&&onlineRound&&dist>.5)window.ArcadeScores?.end(onlineRound,Math.round(dist*100));onlineRound=window.ArcadeScores?.begin('hoof','sandbox')||null;state='play';dist=0;speed=0;elapsed=0;fallCount=0;bodyTilt=0;tiltV=0;unsteady=0;headBob=0;fallTimer=0;dust=[];leg.forEach(l=>{l.held=false;l.raise=0;l.kick=0;l.holdTime=0;l.ground=true});pads.forEach(p=>p.classList.remove('pressed'));$('screen').hidden=true;$('hint').classList.remove('fade');hud();sfx(460,.1);}
 function tumble(reason='Kuda kehilangan keseimbangan!'){if(state!=='play')return;if(onlineRound&&dist>.15)window.ArcadeScores?.end(onlineRound,Math.round(dist*100));onlineRound=null;state='tumbling';$('hint').classList.add('fade');fallCount++;fallTimer=0;fallDir=(bodyTilt||tiltV)>=0?1:-1;leg.forEach(l=>{l.held=false;l.kick=0});pads.forEach(p=>p.classList.remove('pressed'));speed*=.18;shake=1;flash(reason);sfx(135,.38);hud();}
 function rise(){if(state!=='fallen')return;state='play';dist=0;onlineRound=window.ArcadeScores?.begin('hoof','sandbox')||null;bodyTilt=0;tiltV=0;unsteady=0;speed=0;headBob=0;leg.forEach(l=>{l.raise=0;l.kick=0;l.ground=true});$('oops').hidden=true;$('hint').classList.add('fade');flash('Hop! Berdiri lagi!');sfx(380,.14);hud();}
 function legPress(i,v){if(state!=='play')return;let l=leg[i];if(l.held===v)return;l.held=v;pads[i].classList.toggle('pressed',v);if(v){l.holdTime=0;sfx(280+i*30,.045);}else{let p=l.raise,strength=clamp((p-.10)/.72,0,1);l.kick=strength;l.ground=true;if(strength>.12){speed=clamp(speed+strength*1.22+.36,0,5.7);headBob+=strength*.35;const front=i>=2,sign=front?1:-1;tiltV+=sign*strength*.27;tiltV+=(i%2?-.12:.12)*strength;if(l.holdTime>1.4)tiltV+=sign*.36;
  let count=leg.filter(q=>q.held).length;if(count>1)unsteady+=strength*.31;
  dust.push({x:(front?100:-120)+(Math.random()-.5)*25,y:0,life:1});sfx(150+Math.random()*45,.065);}
 }}
 function pause(){if(state==='play'){state='pause';$('modalTitle').innerHTML='ISTIRAHAT<br><em>SEBENTAR.</em>';$('modalDesc').textContent='Kudanya menunggu. Kalau siap, lanjutkan lagi.';$('startBtn').textContent='▶ LANJUT';$('screen').hidden=false;leg.forEach(l=>l.held=false);pads.forEach(p=>p.classList.remove('pressed'));}else if(state==='pause'){state='play';$('screen').hidden=true;}hud();}
 $('startBtn').onclick=()=>state==='pause'?pause():start();$('resetBtn').onclick=start;$('riseBtn').onclick=rise;$('pauseBtn').onclick=pause;$('soundBtn').onclick=()=>{muted=!muted;$('soundBtn').textContent=muted?'♬̸':'♫'};
 $('fullscreenBtn').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen?.()}catch{flash('Layar penuh tidak tersedia di browser ini.')}};
 pads.forEach((btn,i)=>{btn.addEventListener('pointerdown',e=>{e.preventDefault();try{btn.setPointerCapture(e.pointerId)}catch{}legPress(i,true)});for(let event of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>legPress(i,false));btn.addEventListener('contextmenu',e=>e.preventDefault());});
 document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;let k=KEY.indexOf(e.code);if(k!==-1){e.preventDefault();if(!e.repeat)legPress(k,true)}else if(e.code==='KeyR'){e.preventDefault();if(state==='fallen')rise();else start()}else if(e.code==='Space'||e.code==='Escape'){e.preventDefault();if(state==='menu')start();else pause();}});
 document.addEventListener('keyup',e=>{let k=KEY.indexOf(e.code);if(k!==-1){e.preventDefault();legPress(k,false)}});window.addEventListener('blur',()=>{leg.forEach((l,i)=>{if(l.held)legPress(i,false)})});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pause()});
 function resize(){let r=canvas.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);DPR=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);c.setTransform(DPR,0,0,DPR,0,0)}new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);
 function grad(x,y,r,a,b){let g=c.createRadialGradient(x-r*.35,y-r*.3,2,x,y,r);g.addColorStop(0,a);g.addColorStop(1,b);return g}
 function ellipse(x,y,rx,ry,col,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fillStyle=col;c.fill()}
 function line(points,col,w){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';c.lineWidth=w;c.stroke()}
 function shape(draw,color,stroke,width=1){c.beginPath();draw();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
 function hill(y0,amp,col,shift,step=1){c.beginPath();c.moveTo(0,H);c.lineTo(0,y0);for(let x=0;x<=W+25;x+=18){let yy=y0+Math.sin(x*.008+shift)*amp+Math.cos(x*.018+shift*.71)*amp*.34;c.lineTo(x,yy)}c.lineTo(W,H);c.closePath();c.fillStyle=col;c.fill()}
 function environment(){let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#b5dcff');g.addColorStop(.8,'#e0f6ff');g.addColorStop(1,'#f0f7e2');c.fillStyle=g;c.fillRect(0,0,W,H);let ground=H*.79;
  // Soft pastoral layered hills and a white fence, as observed in the reference.
  hill(ground-H*.26,28,'#98ca72',.2);hill(ground-H*.18,33,'#86bd5f',.8);hill(ground-H*.11,11,'#a6d682',1.2);
  let drift=dist*29;
  c.fillStyle='#f8fcf6';for(let i=-2;i<Math.ceil(W/135)+3;i++){let x=(i*135-drift*.3%135);c.fillRect(x,ground-108,7,112);c.fillRect(x+2,ground-109,9,8)}
  c.fillRect(0,ground-83,W,7);c.fillRect(0,ground-34,W,6);
  c.fillStyle='#abd77f';c.fillRect(0,ground-14,W,H-ground+14);
  c.fillStyle='#d2aa76';c.beginPath();c.moveTo(0,ground);c.quadraticCurveTo(W*.5,ground+H*.02,W,ground+H*.04);c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fill();
  c.fillStyle='#e6c49b';c.fillRect(0,ground+15,W,12);
  for(let i=0;i<11;i++){let x=((i*153-drift*.45)%(W+180)+(W+180))%(W+180)-80;ellipse(x,ground+17+(i%3)*21,3,1.5,'#ad8f67');}
  // Pasture bushes and soft shadow objects.
  for(let i=0;i<6;i++){let x=((i*267+40-drift*.18)%(W+300)+(W+300))%(W+300)-120;ellipse(x,ground-88-(i%2)*16,62,29,'#88c66b');ellipse(x+18,ground-101-(i%2)*16,53,35,'#96d073');}
  return ground;
 }
 function paintLeg(hipX,hipY,idx,groundLocal,near){let l=leg[idx],isFront=idx>1,side=idx%2,raise=l.raise,kick=l.kick;
  let fx=hipX+(isFront?10:-15)+raise*91 + kick*22,fy=groundLocal-raise*96+kick*3;
  let kneeX=smooth(hipX,fx,.48)+(isFront?-12:13),kneeY=smooth(hipY,fy,.57)-raise*20+(isFront?-1:8);
  if(state==='tumbling'||state==='fallen'){fx+=isFront?30:-35;fy-=60;kneeX+=isFront?-20:20;kneeY-=28}
  let skin=near?'#c5c4b6':'#aaa99d',edge=near?'#828275':'#828579';
  c.lineCap='round';c.lineJoin='round';line([[hipX,hipY],[kneeX,kneeY],[fx,fy]],edge,near?25:21);line([[hipX,hipY],[kneeX,kneeY],[fx,fy]],skin,near?21:17);
  // graduated fetlock joint and hoof
  ellipse(kneeX,kneeY,near?11:9,near?11:9,skin);c.save();c.translate(fx+6,fy+1);c.rotate(-.11-raise*.18);shape(()=>{c.moveTo(-14,-6);c.lineTo(9,-8);c.lineTo(18,4);c.lineTo(-10,7);c.closePath()},near?'#3d3b39':'#58534d');c.restore();
  if(near){c.fillStyle=COL[idx];c.fillRect(kneeX-11,kneeY-5,23,10);c.fillStyle='#fff8';c.fillRect(kneeX-9,kneeY-4,4,8)}
 }
 function horseAt(x,y,sc,ground){
  let pivot=(state==='fallen'||state==='tumbling')?smooth(bodyTilt,fallDir*1.03,clamp(fallTimer*1.4,0,1)):clamp(bodyTilt,-.70,.70);
  let drop=(state==='tumbling'||state==='fallen')?clamp(fallTimer*2,0,1)*91:Math.sin(screenClock*11)*Math.min(8,speed*1.4);
  ellipse(x+7,ground+6,133*sc,13*sc,'#5a553c33');
  c.save();c.translate(x,y+drop*sc);c.scale(sc,sc);c.rotate(pivot);let localGround=(ground-(y+drop*sc))/sc;
  paintLeg(-108,42,1,localGround,false);paintLeg(100,43,3,localGround,false);
  // flowing tail under the body, dynamic movement
  let tw=Math.sin(screenClock*4.5)*17;shape(()=>{c.moveTo(-139,-15);c.bezierCurveTo(-172,-56,-184,-26,-192,10+tw);c.bezierCurveTo(-178,46+tw,-163,50+tw,-159,27);c.bezierCurveTo(-157,4,-146,7,-135,4);c.closePath()},'#a29b8c');
  // body shaded as an organic side-view model
  ellipse(-18,0,150,76,grad(-18,-10,180,'#e9e8dd','#969c96'));
  ellipse(-38,-27,119,43,'#f5f2df8c');ellipse(-50,31,111,35,'#989c9170');
  // raised chest and ascending long neck
  shape(()=>{c.moveTo(69,-28);c.bezierCurveTo(96,-64,105,-153,135,-173);c.bezierCurveTo(155,-176,172,-155,168,-127);c.bezierCurveTo(142,-92,153,-40,138,23);c.bezierCurveTo(120,53,87,52,69,-28);c.closePath()},grad(112,-93,120,'#f4f1e2','#a1a399'));
  // long wispy mane
  shape(()=>{c.moveTo(117,-162);c.bezierCurveTo(112,-130,91,-107,93,-73);c.bezierCurveTo(101,-98,102,-100,110,-113);c.bezierCurveTo(102,-75,116,-54,123,-50);c.bezierCurveTo(118,-102,136,-137,144,-165);c.closePath()},'#aba799');
  // neck highlight
  shape(()=>{c.moveTo(121,-150);c.bezierCurveTo(106,-106,113,-63,108,-31);c.bezierCurveTo(134,-63,128,-113,148,-150);c.closePath()},'#f8f6e68c');
  // head with elongated horse muzzle, ears, cheek/jaw
  shape(()=>{c.moveTo(139,-167);c.quadraticCurveTo(170,-189,198,-165);c.quadraticCurveTo(208,-153,204,-134);c.quadraticCurveTo(227,-123,250,-111);c.quadraticCurveTo(264,-86,241,-75);c.quadraticCurveTo(226,-67,204,-78);c.quadraticCurveTo(189,-98,177,-112);c.quadraticCurveTo(151,-122,139,-167);c.closePath()},grad(186,-137,105,'#f5f1df','#9f9f96'));
  shape(()=>{c.moveTo(147,-173);c.lineTo(145,-218);c.quadraticCurveTo(166,-209,165,-179);c.closePath()},'#b3afa3');
  shape(()=>{c.moveTo(174,-174);c.lineTo(187,-214);c.quadraticCurveTo(199,-194,188,-172);c.closePath()},'#c2bdb0');
  ellipse(157,-195,4,11,'#ddada8');ellipse(189,-184,4,10,'#d5aaa0');
  ellipse(246,-88,21,14,'#b9ad9f');ellipse(249,-93,6,4,'#4d4e4a');
  ellipse(195,-146,6,7,'#323333');ellipse(197,-148,2,2,'#fff');
  line([[228,-86],[242,-80]],'#747067',2);ellipse(175,-113,20,25,'#bcbcb48c');
  // front near legs
  paintLeg(-110,41,0,localGround,true);paintLeg(97,42,2,localGround,true);
  c.restore();
 }
 function update(dt){screenClock+=dt;if(state==='play'){
  elapsed+=dt;let raised=0,rear=0,front=0,left=0,right=0;
  leg.forEach((l,i)=>{if(l.held){l.raise=clamp(l.raise+dt*1.55,0,1.0);l.holdTime+=dt}else{l.raise=Math.max(0,l.raise-dt*3.5);l.kick=Math.max(0,l.kick-dt*5)}raised+=l.raise;if(i<2)rear+=l.raise;else front+=l.raise;if(i%2===0)left+=l.raise;else right+=l.raise});
  // Support polygon approximation: if support is lost, pitch over; asymmetric lifts create angular acceleration.
  const balance=(front-rear)*.64+(left-right)*.17;
  tiltV+=dt*(balance*3.05-bodyTilt*1.5-tiltV*.74);
  if(raised>2.0)unsteady+=dt*(raised-1.55)*2.4;else unsteady=Math.max(0,unsteady-dt*.85);
  if(leg.some(l=>l.held&&l.holdTime>2))unsteady+=dt*.9;
  if(raised>2.8)tiltV+=(balance>0?1:-1)*dt*1.1;
  bodyTilt=clamp(bodyTilt+tiltV*dt,-1.65,1.65);
  if(Math.abs(bodyTilt)>.58||unsteady>1.5){tumble('Waduh! Kuda terguling!')}
  speed=Math.max(0,speed-dt*(.55+speed*.38));dist+=speed*dt;headBob=Math.max(0,headBob-dt*2.5);
  if(dist>best+.01)persist();
 }else if(state==='tumbling'){fallTimer+=dt;if(fallTimer>.65){state='fallen';flash('Tekan BANGUN untuk mencoba lagi.')}}
 if(shake>0)shake=Math.max(0,shake-dt*3);dust.forEach(p=>{p.x-=speed*dt*18;p.y-=dt*15;p.life-=dt});dust=dust.filter(p=>p.life>0);
 if(toastTimer&&performance.now()>toastTimer){$('toast').classList.remove('show');toastTimer=0}
 if(elapsed>5)$('hint').classList.add('fade');hud();}
 function draw(){if(W<=1)return;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);c.save();if(shake)c.translate(Math.sin(screenClock*55)*shake*5,Math.sin(screenClock*41)*shake*4);let ground=environment();let sc=Math.min(W/520,H/460,1.5);sc=clamp(sc,.44,1.45);
 // Keep a large, clear horse in center, with stable ground-level silhouette.
 let cx=W*.46,bodyY=ground-170*sc;horseAt(cx,bodyY,sc,ground);
 for(const p of dust){c.globalAlpha=Math.max(0,p.life)*.55;ellipse(cx+p.x*sc,ground+9+p.y,7*sc,3*sc,'#715b45');}c.globalAlpha=1;
 c.restore();}
 let prev=0;function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-prev)/1000||0);prev=now;update(dt);draw();}resize();hud();requestAnimationFrame(frame);
 window.__hoofHustle={start,snapshot:()=>({state,dist,falls:fallCount,best,tilt:bodyTilt,legs:leg.map(l=>l.raise)}),rise};
})();
