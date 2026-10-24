/* Octo Ascent — Febro Arcade original sandbox climbing game. No proprietary game code or assets. */
(()=>{'use strict';const $=id=>document.getElementById(id),canvas=$('scene'),c=canvas.getContext('2d',{alpha:false});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),lerp=(a,b,v)=>a+(b-a)*v;const KEY=['KeyW','KeyE','KeyI','KeyO','KeyS','KeyD','KeyK','KeyL'];
const COLORS=['#ee796f','#e99a16','#36b976','#10bcb9','#d75bad','#d2a700','#318fea','#ad82e8'];const STORE='febroArcade.octoAscent.v17';let best=0;try{best=Number(localStorage.getItem(STORE)||0)||0}catch{};
let onlineRound=null,maxRunHeight=0;let W=0,H=0,DPR=1,last=0,clock=0,mode='menu',height=0,vy=0,swivel=0,shake=0,fallCount=0,slipTime=0,muted=false,audio=null,toastUntil=0;let camera=0;
const ARMS=Array.from({length:8},(_,i)=>{let side=i%4<2?-1:1;let rad=i%4;return {attached:true,held:false,charge:0,stickY:.15+rad*.055,stickX:side*(.92+rad*.26)+(i>=4?-.09:.09),wave:Math.random()*6.28,loosen:0};});
let pads=[];
const sfx=(freq,dur=.09)=>{if(muted)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio??=new A();audio.resume?.();let o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(75,freq*.7),audio.currentTime+dur);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur+.01)}catch{}};
const flash=t=>{let e=$('toast');e.textContent=t;e.classList.add('show');toastUntil=performance.now()+1550;};
const refresh=()=>{$('height').innerHTML=height.toFixed(1).replace('.',',')+' <em>m</em>';$('best').innerHTML=Math.max(best,height).toFixed(1).replace('.',',')+' <em>m</em>';$('falls').textContent=fallCount;$('pause').hidden=mode!=='play';$('oops').hidden=mode!=='falling';pads.forEach((p,i)=>{p.classList.toggle('pressed',ARMS[i].held);p.querySelector('span').textContent=ARMS[i].held?'STICK':'LIFT'});};
function showOverlay(title,desc,btn){$('title').innerHTML=title;$('description').textContent=desc;$('start').textContent=btn;$('overlay').hidden=false;}
function reset(){if(mode==='play'&&maxRunHeight>.10)window.ArcadeScores?.end(onlineRound,Math.round(maxRunHeight*100));onlineRound=window.ArcadeScores?.begin('octopus','freeclimb')||null;maxRunHeight=0;mode='play';height=0;vy=0;swivel=0;shake=0;fallCount=0;slipTime=0;camera=0;ARMS.forEach((a,i)=>{let side=i%4<2?-1:1;let rad=i%4;a.attached=true;a.held=false;a.charge=0;a.stickY=.15+rad*.055;a.stickX=side*(.92+rad*.26)+(i>=4?-.09:.09);a.loosen=0;});$('overlay').hidden=true;$('hint').classList.remove('fade');refresh();sfx(550,.12);}
function setTentacle(i,holding){if(mode!=='play')return;let a=ARMS[i];if(a.held===holding)return;a.held=holding;if(holding){a.attached=false;a.charge=0;sfx(420+i*18,.045)}else{a.attached=true;const lift=clamp(a.charge,.06,1.5);let old=a.stickY;a.stickY=Math.max(old+.10,height+.24+lift*.66);a.stickX=(i%4<2?-1:1)*(.95+(i%4)*.25)+Math.sin(clock*1.3+i)*.07;a.loosen=0;vy=Math.max(vy,.04);sfx(245+i*20,.09)}refresh();}
function stopAll(){ARMS.forEach((a,i)=>{if(a.held)setTentacle(i,false)})}
function fall(){if(mode!=='play')return;if(onlineRound&&maxRunHeight>.10)window.ArcadeScores?.end(onlineRound,Math.round(maxRunHeight*100));onlineRound=null;mode='falling';fallCount++;slipTime=0;vy=-1.8;shake=.95;ARMS.forEach(a=>{a.attached=false;a.held=false});flash('Waduh! Pegangannya lepas!');sfx(150,.3);refresh();}
function pause(){if(mode==='play'){stopAll();mode='pause';showOverlay('JEDA<br><em>DULU.</em>','Tarik napas dulu. Gurita sedang beristirahat.','▶ LANJUTKAN')}else if(mode==='pause'){mode='play';$('overlay').hidden=true}refresh();}
const padEl=$('pads');COLORS.forEach((col,i)=>{let p=document.createElement('button');p.className='pad';p.style.setProperty('--pad',col);p.innerHTML=`<kbd>${KEY[i].slice(3)}</kbd><span>LIFT</span>`;p.setAttribute('aria-label',`Tentakel ${i+1}: tahan untuk angkat, lepas untuk tempel`);padEl.appendChild(p);pads.push(p);p.addEventListener('pointerdown',e=>{e.preventDefault();try{p.setPointerCapture(e.pointerId)}catch{}setTentacle(i,true)});for(let evt of ['pointerup','pointercancel','lostpointercapture'])p.addEventListener(evt,()=>setTentacle(i,false));p.addEventListener('contextmenu',e=>e.preventDefault())});
$('start').onclick=()=>mode==='pause'?pause():reset();$('pause').onclick=pause;$('reset').onclick=reset;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♬̸':'♫'};
$('full').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen?.()}catch{flash('Gunakan mode landscape atau Tambahkan ke Layar Utama')}};
document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;let i=KEY.indexOf(e.code);if(i>=0){e.preventDefault();if(!e.repeat)setTentacle(i,true)}else if(e.code==='Space'){e.preventDefault();if(mode==='menu')reset();else pause()}else if(e.code==='KeyR'){e.preventDefault();reset()}});document.addEventListener('keyup',e=>{let i=KEY.indexOf(e.code);if(i>=0){e.preventDefault();setTentacle(i,false)}});window.addEventListener('blur',stopAll);document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause()});
function resize(){let r=canvas.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);DPR=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR)}new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);
function ellipse(x,y,rx,ry,col,angle=0){c.beginPath();c.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),angle,0,Math.PI*2);c.fillStyle=col;c.fill()}
function fillPath(fn,col,stroke=null,w=1){c.beginPath();fn();c.fillStyle=col;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke()}}
function line(x1,y1,x2,y2,col,w=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.stroke()}
function worldBackground(){let g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#d3c4ac');g.addColorStop(.55,'#bcae9c');g.addColorStop(1,'#9f978d');c.fillStyle=g;c.fillRect(0,0,W,H);
 // Camera-positioned stone blocks with mortar that scroll during climbing.
 const hh=48,ww=91,offset=(camera*115)%hh;for(let row=-2;row<Math.ceil(H/hh)+2;row++){
 let y=H-row*hh+offset;let rowNumber=Math.floor(camera*115/hh)+row;
 for(let col=-2;col<Math.ceil(W/ww)+3;col++){
  let x=col*ww + (rowNumber%2)*ww*.5;
  c.fillStyle=(rowNumber+col)%5===0?'#c6bba9':(rowNumber+col)%3===0?'#d8cdbb':'#cfc4b4';c.fillRect(x+2,y+2,ww-4,hh-4);
  c.fillStyle='#fff9eb66';c.fillRect(x+7,y+6,ww-14,2);c.fillStyle='#857b7340';c.fillRect(x+6,y+hh-7,ww-10,3);
 }
 }
 // Stone scale lines and hand-painted meter plaques.
 c.textAlign='left';for(let m=0;m<250;m++){
 const sy=H*.69-(m-camera)*115;if(sy<-45||sy>H+50)continue;
 line(0,sy,W,sy,m===0?'#58bd86':'#a2a8a79a',m===0?4:1);c.fillStyle=m===0?'#248e61':'#79767d';c.font='900 11px system-ui';c.fillText(m===0?'START':`${m}m`,13,sy-7);
 }
 // Subtle hand-painted vines on the edges
 c.strokeStyle='#698b67aa';c.lineWidth=5;for(let a=0;a<2;a++){let xx=a?W-10:10;c.beginPath();c.moveTo(xx,0);for(let y=0;y<H+20;y+=26)c.lineTo(xx+Math.sin(y*.023+a)*13,y);c.stroke();}
 }
function drawArm(i,cx,cy,unit,drawFront){let a=ARMS[i];let row=i<4?0:1;if(Boolean(row)!==drawFront)return;
 let side=i%4<2?-1:1,spread=.6+(i%4)*.17;
 const attachX=cx+(side*(23+(i%4)*3))*unit,attachY=cy+((i<4)?4:23)*unit;
 let tx,ty;
 if(a.held){let p=clamp(a.charge,0,1);tx=cx+side*(110+65*p)*unit;ty=cy-(20+130*p)*unit+Math.sin(clock*11+i)*4*unit;}
 else{tx=cx+a.stickX*115*unit;ty=H*.69-(a.stickY-camera)*115*unit;}
 let bend=(side*60+Math.sin(clock*2+i)*15)*unit;
 let cp1x=attachX+side*48*unit,cp1y=attachY+((i%2)?30:-21)*unit;
 let cp2x=tx-bend,cp2y=(ty+attachY)*.5+((i%3)-1)*30*unit;
 // Thick organic curved tentacles with tapered ends and subtle highlights.
 fillPath(()=>{c.moveTo(attachX-8*unit,attachY);
 c.bezierCurveTo(cp1x-11*unit,cp1y,cp2x-7*unit,cp2y,tx-3.5*unit,ty);
 c.quadraticCurveTo(tx,ty-4*unit,tx+3.5*unit,ty);
 c.bezierCurveTo(cp2x+6*unit,cp2y+8*unit,cp1x+10*unit,cp1y,attachX+10*unit,attachY+4*unit);
 c.closePath();},'#932e33');
 fillPath(()=>{c.moveTo(attachX-5*unit,attachY);c.bezierCurveTo(cp1x-7*unit,cp1y,cp2x-5*unit,cp2y,tx-2*unit,ty);
 c.quadraticCurveTo(tx,ty-1*unit,tx+2*unit,ty);c.bezierCurveTo(cp2x+5*unit,cp2y,cp1x+6*unit,cp1y,attachX+6*unit,attachY+1*unit);c.closePath();},drawFront?'#ee7657':'#d05b4c');
 // Suckers along curve, integrated with tentacle not detached sticks.
 for(let s=1;s<5;s++){let t=s/5;let b=1-t,xx=b*b*b*attachX+3*b*b*t*cp1x+3*b*t*t*cp2x+t*t*t*tx,yy=b*b*b*attachY+3*b*b*t*cp1y+3*b*t*t*cp2y+t*t*t*ty;ellipse(xx,yy+5*unit,(4-t*2)*unit,(2.7-t)*unit,drawFront?'#ffb0a2':'#f5a28a');}
 const col=COLORS[i];ellipse(tx,ty,7*unit,7*unit,'#9d4e4c');ellipse(tx,ty,5*unit,5*unit,col);ellipse(tx-1*unit,ty-2*unit,1.6*unit,1.5*unit,'#ffffffd9');
 }
function octopus(cx,cy,unit){ // a glossy animated, squashy original cartoon cephalopod
 for(let i=0;i<8;i++)drawArm(i,cx,cy,unit,false);
 c.save();c.translate(cx,cy);c.rotate(Math.sin(clock*3)*.06+swivel*.22);
 let g=c.createRadialGradient(-18*unit,-25*unit,2*unit,0,0,65*unit);g.addColorStop(0,'#ffb49b');g.addColorStop(.42,'#ef785c');g.addColorStop(1,'#ae3c38');
 fillPath(()=>{c.moveTo(-34*unit,6*unit);c.bezierCurveTo(-45*unit,-28*unit,-39*unit,-73*unit,-10*unit,-86*unit);c.bezierCurveTo(11*unit,-96*unit,43*unit,-70*unit,38*unit,-26*unit);c.bezierCurveTo(51*unit,17*unit,34*unit,44*unit,4*unit,45*unit);c.bezierCurveTo(-28*unit,43*unit,-43*unit,31*unit,-34*unit,6*unit);c.closePath()},g,'#a94c40',1.6*unit);
 ellipse(-19*unit,-48*unit,12*unit,21*unit,'#ffb8a638',-.4);ellipse(-13*unit,-7*unit,4.7*unit,5.7*unit,'#f7f7f3');ellipse(15*unit,-7*unit,4.7*unit,5.7*unit,'#f7f7f3');ellipse(-12*unit,-6*unit,2.6*unit,3.6*unit,'#27292c');ellipse(16*unit,-6*unit,2.6*unit,3.6*unit,'#27292c');ellipse(-11*unit,-8*unit,1*unit,1.2*unit,'white');ellipse(17*unit,-8*unit,1*unit,1.2*unit,'white');ellipse(-24*unit,7*unit,7*unit,4*unit,'#f684827c');ellipse(27*unit,7*unit,7*unit,4*unit,'#f684827c');
 ellipse(2*unit,11*unit,7*unit,8*unit,'#8d423b');ellipse(2*unit,11*unit,3*unit,5*unit,'#3b2727');
 c.restore();for(let i=0;i<8;i++)drawArm(i,cx,cy,unit,true);
 }
function draw(){if(W<=1)return;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);c.save();if(shake)c.translate(Math.sin(clock*30)*shake*4,Math.sin(clock*25)*shake*3);worldBackground();let unit=clamp(W/490,.62,1.25),cx=W*.5+Math.sin(clock*2)*4*unit+swivel*20*unit,cy=H*.69-(height-camera)*115*unit;
 octopus(cx,cy,unit);c.textAlign='center';c.font=`900 ${11*unit}px system-ui`;let labelY=cy-119*unit;let labelWidth=58*unit;
 c.fillStyle='#fff';c.strokeStyle='#279366';c.lineWidth=2.5;c.beginPath();c.roundRect(cx-labelWidth/2,labelY-16*unit,labelWidth,27*unit,7*unit);c.fill();c.stroke();c.fillStyle='#25754e';c.fillText('YOU',cx,labelY+1*unit);c.restore()}
function update(dt){clock+=dt;camera=lerp(camera,Math.max(0,height-2.0),Math.min(1,dt*2.8));if(mode==='play'){
 let attached=ARMS.filter(a=>a.attached);for(const a of ARMS){if(a.held)a.charge=clamp(a.charge+dt*1.45,0,1.5);}
 if(attached.length>=2){let highs=attached.map(a=>a.stickY).sort((a,b)=>b-a),target=(highs.slice(0,Math.min(4,highs.length)).reduce((a,b)=>a+b,0)/Math.min(4,highs.length))-.10;
 let pull=clamp((target-height)*2.3,-.6,.85);vy=lerp(vy,pull,Math.min(1,dt*3));slipTime=0;
 // Physics: support anchors which are too far below the body break, causing funny slides.
 attached.forEach(a=>{if(height-a.stickY>.47){a.loosen+=dt;if(a.loosen>.3)a.attached=false}else a.loosen=Math.max(0,a.loosen-dt)});
 }else{vy-=dt*2.35;slipTime+=dt;}
 height=Math.max(0,height+vy*dt);maxRunHeight=Math.max(maxRunHeight,height);swivel=lerp(swivel,attached.length>0?attached.reduce((s,a)=>s+a.stickX,0)/attached.length*.34:Math.sin(clock*9),Math.min(1,dt*3));
 if(height>best){best=height;try{localStorage.setItem(STORE,best.toFixed(2))}catch{}}
 if(slipTime>.50&&(height>.08||ARMS.filter(a=>a.attached).length<1))fall();
 if(clock>5)$('hint').classList.add('fade');
 }else if(mode==='falling'){slipTime+=dt;height=Math.max(0,height-(1.4+slipTime*3)*dt);if(slipTime>.9||height<=0){mode='play';height=0;vy=0;maxRunHeight=0;onlineRound=window.ArcadeScores?.begin('octopus','freeclimb')||null;ARMS.forEach((a,i)=>{let side=i%4<2?-1:1;a.attached=true;a.held=false;a.stickY=.15+(i%4)*.055;a.stickX=side*(.92+(i%4)*.26);a.loosen=0});flash('Coba lagi! Jangan lepas semuanya.')}}
 shake=Math.max(0,shake-dt*2);if(toastUntil&&performance.now()>toastUntil){$('toast').classList.remove('show');toastUntil=0}refresh()}
let prev=0;function frame(t){requestAnimationFrame(frame);let dt=Math.min(.05,(t-prev)/1000||0);prev=t;update(dt);draw()}resize();refresh();requestAnimationFrame(frame);
window.__octoAscent={start:reset,snapshot:()=>({mode,height,falls:fallCount,best,attached:ARMS.filter(a=>a.attached).length}),hold:setTentacle};
})();
