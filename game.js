(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const menu = document.querySelector('#menu');
  const hud = document.querySelector('#hud');
  const result = document.querySelector('#result');
  const pauseOverlay = document.querySelector('#pauseOverlay');
  const cars = [
    { name:'Skyline GT-R', sub:'COUPÉ JAPONÉS · 2002', color:'#40a8ff', power:78, grip:71, drift:86, max:410, accel:260, turn:2.85, traction:2.65, price:'R-34' },
    { name:'Muscle V8', sub:'CLÁSICO AMERICANO · NARANJA', color:'#ff642e', power:92, grip:55, drift:96, max:440, accel:285, turn:2.45, traction:1.9, price:'V8' },
    { name:'Supra Turbo', sub:'TUNER JAPONÉS · 1998', color:'#f2c84b', power:83, grip:77, drift:78, max:425, accel:270, turn:3.05, traction:3.0, price:'JZ' },
    { name:'RX-7 Spirit', sub:'ROTARY · EDICIÓN CALLE', color:'#a982ed', power:75, grip:84, drift:81, max:400, accel:245, turn:3.35, traction:3.4, price:'13B' }
  ];
  const W=1200,H=780, cx=600,cy=404,rx=395,ry=248,road=144;
  let selected=0, running=false,paused=false,elapsed=0,score=0,combo=1,bestCombo=1,toastTime=0,last=0,markClock=0;
  let scaleX=1,scaleY=1,dpr=1;
  let keys={},touch={left:false,right:false,gas:false,brake:false};
  let marks=[];
  const player={x:cx,y:cy-ry,vx:0,vy:0,angle:0,color:cars[0].color,trail:0};
  const rivals=[{t:-2.3,color:'#e9e9e9',phase:0},{t:1.2,color:'#f04b42',phase:1.7},{t:2.7,color:'#40d2bd',phase:3.1}];
  let audio=null,osc=null,gain=null,soundOn=false;
  const $=s=>document.querySelector(s);
  function resize(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    scaleX=r.width/W;scaleY=r.height/H;
  }
  window.addEventListener('resize',resize); resize();
  function populateCars(){
    $('#carList').innerHTML=cars.map((c,i)=>`<button class="car-option ${i===selected?'selected':''}" data-car="${i}" style="--car:${c.color}"><span class="car-swatch"></span><span class="car-name">${c.name}<small>${c.sub}</small></span><span class="car-price">${c.price}</span></button>`).join('');
    document.querySelectorAll('.car-option').forEach(el=>el.addEventListener('click',()=>selectCar(+el.dataset.car)));
    updateSpecs();
  }
  function selectCar(i){selected=i;player.color=cars[i].color;document.querySelectorAll('.car-option').forEach((el,j)=>el.classList.toggle('selected',j===i));$('.garage-index').innerHTML=`0${i+1} <i>/</i> 04`;updateSpecs();}
  function updateSpecs(){let c=cars[selected];$('#powerMeter').style.width=c.power+'%';$('#gripMeter').style.width=c.grip+'%';$('#driftMeter').style.width=c.drift+'%';}
  populateCars();
  function formatScore(n){return Math.floor(n).toString().padStart(6,'0')}
  function setToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');toastTime=1.2}
  function begin(){running=true;paused=false;elapsed=0;score=0;combo=1;bestCombo=1;marks=[];player.x=cx;player.y=cy-ry;player.angle=0;player.vx=0;player.vy=0;player.color=cars[selected].color;last=performance.now();menu.classList.add('hidden');result.classList.add('hidden');pauseOverlay.classList.add('hidden');hud.classList.remove('hidden');$('#score').textContent='000000';$('#combo').innerHTML='x1.0 <span>COMBO</span>';if(soundOn)startAudio();}
  function endGame(){running=false;hud.classList.add('hidden');result.classList.remove('hidden');$('#finalScore').textContent=formatScore(score);const previous=+(localStorage.getItem('driftRecord')||0),record=Math.max(score,previous);localStorage.setItem('driftRecord',record);$('#recordStat').textContent=formatScore(record);$('#finalCombo').textContent='x'+bestCombo.toFixed(1);$('#resultTitle').innerHTML=score>previous?'NOCHE<br><em>DE LEYENDA.</em>':'BUENA<br><em>CORRIDA.</em>';$('#bestScore').textContent=formatScore(record)+' PTS';}
  $('#bestScore').textContent=formatScore(+(localStorage.getItem('driftRecord')||0))+' PTS';
  $('#startBtn').addEventListener('click',begin);$('#againBtn').addEventListener('click',begin);
  $('#garageBtn').addEventListener('click',()=>{result.classList.add('hidden');menu.classList.remove('hidden');});
  function togglePause(){if(!running)return;paused=!paused;pauseOverlay.classList.toggle('hidden',!paused);if(!paused)last=performance.now();}
  $('#pauseBtn').addEventListener('click',togglePause);$('#resumeBtn').addEventListener('click',togglePause);$('#quitBtn').addEventListener('click',()=>{running=false;paused=false;hud.classList.add('hidden');pauseOverlay.classList.add('hidden');menu.classList.remove('hidden');});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;if(k==='escape'||k==='p')togglePause();if(k==='enter'&&!running)begin();});
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  document.querySelectorAll('[data-control]').forEach(b=>{const key=b.dataset.control;const down=e=>{e.preventDefault();touch[key]=true};const up=e=>{e.preventDefault();touch[key]=false};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
  function startAudio(){try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();osc=audio.createOscillator();gain=audio.createGain();osc.type='sawtooth';osc.frequency.value=50;gain.gain.value=0;osc.connect(gain);gain.connect(audio.destination);osc.start()}audio.resume()}catch(e){}}
  $('#soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('#soundBtn').innerHTML=(soundOn?'♫':'×')+' <span>SONIDO</span>';if(soundOn)startAudio();else if(gain)gain.gain.setTargetAtTime(0,audio.currentTime,.08)});
  function input(){return {gas:keys.w||keys.arrowup||keys[' ']||touch.gas,brake:keys.s||keys.arrowdown||touch.brake,left:keys.a||keys.arrowleft||touch.left,right:keys.d||keys.arrowright||touch.right,hand:keys.shift}}
  function nearestTrack(x,y){const a=Math.atan2((y-cy)/ry,(x-cx)/rx);const px=cx+rx*Math.cos(a),py=cy+ry*Math.sin(a);return {x:px,y:py,d:Math.hypot(x-px,y-py),a}}
  function step(dt){
    const c=cars[selected],inp=input();let sp=Math.hypot(player.vx,player.vy);let forwardX=Math.cos(player.angle),forwardY=Math.sin(player.angle);
    const throttle=(inp.gas?1:0)-(inp.brake?1:0);
    player.vx+=forwardX*throttle*c.accel*dt;player.vy+=forwardY*throttle*c.accel*dt;
    if(inp.hand){player.vx*=Math.pow(.985,dt*60);player.vy*=Math.pow(.985,dt*60)}
    const steer=(inp.right?1:0)-(inp.left?1:0);const signed=player.vx*forwardX+player.vy*forwardY;
    if(steer)player.angle+=steer*c.turn*(.26+Math.min(1,sp/180))*(signed< -10?-1:1)*dt;
    forwardX=Math.cos(player.angle);forwardY=Math.sin(player.angle);
    const forward=player.vx*forwardX+player.vy*forwardY;const side=-player.vx*forwardY+player.vy*forwardX;
    const grip=inp.hand?.65:c.traction;
    const damp=Math.min(1,grip*dt);player.vx+=forwardY*side*damp;player.vy-=forwardX*side*damp;
    const drag=Math.pow(inp.gas?.994:.978,dt*60);player.vx*=drag;player.vy*=drag;
    const vmax=c.max;sp=Math.hypot(player.vx,player.vy);if(sp>vmax){player.vx*=vmax/sp;player.vy*=vmax/sp}
    player.x+=player.vx*dt;player.y+=player.vy*dt;
    const tr=nearestTrack(player.x,player.y);
    if(tr.d>road*.5+22){player.x+=(tr.x-player.x)*Math.min(1,dt*4);player.y+=(tr.y-player.y)*Math.min(1,dt*4);player.vx*=.68;player.vy*=.68;setToast('¡VUELVE AL ASFALTO!')}
    const v=Math.hypot(player.vx,player.vy),fx=Math.cos(player.angle),fy=Math.sin(player.angle),sideSpeed=Math.abs(-player.vx*fy+player.vy*fx),dot=(player.vx*fx+player.vy*fy)/Math.max(1,v),driftAngle=Math.acos(Math.max(-1,Math.min(1,dot)));
    const drifting=v>115&&sideSpeed>42&&tr.d<road*.5-2;
    if(drifting){combo=Math.min(9.9,combo+dt*.72);bestCombo=Math.max(bestCombo,combo);score+=(sideSpeed*.18+v*.035)*combo*dt*100;markClock+=dt;if(markClock>.035){markClock=0;const backX=player.x-fx*19,backY=player.y-fy*19;marks.push({x:backX-fy*8,y:backY+fx*8,a:player.angle,life:1});marks.push({x:backX+fy*8,y:backY-fx*8,a:player.angle,life:1});if(marks.length>500)marks.splice(0,2)}if(toastTime<=0&&driftAngle>.36)setToast('¡DERRAPE PERFECTO!')}
    else combo=Math.max(1,combo-dt*1.8);
    marks.forEach(m=>m.life-=dt*.07);marks=marks.filter(m=>m.life>0);
    elapsed+=dt;if(elapsed>=90){elapsed=90;endGame();return}
    $('#score').textContent=formatScore(score);$('#combo').innerHTML='x'+combo.toFixed(1)+' <span>COMBO</span>';const remaining=Math.ceil(90-elapsed);$('#timer').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');$('#speed').textContent=String(Math.round(v*.48)).padStart(3,'0');$('#speedBar').style.width=Math.min(100,v/c.max*100)+'%';
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').classList.remove('show')}
    if(gain&&soundOn){gain.gain.setTargetAtTime(Math.min(.035,v/9000),audio.currentTime,.1);osc.frequency.setTargetAtTime(45+v*.34,audio.currentTime,.1)}
  }
  const blocks=[];let seed=17;function rand(){seed=(seed*9301+49297)%233280;return seed/233280}
  for(let i=0;i<38;i++){const side=i%4,along=rand(),size=22+rand()*55;let x,y,w,h;if(side===0){x=35+along*1130;y=25+rand()*60;w=size*1.5;h=size}else if(side===1){x=35+along*1130;y=690+rand()*48;w=size*1.5;h=size}else if(side===2){x=22+rand()*65;y=70+along*610;w=size;h=size*1.6}else{x=1110+rand()*60;y=70+along*610;w=size;h=size*1.6}blocks.push({x,y,w,h,tall:rand(),hue:rand()})}
  function city(){
    ctx.fillStyle='#10191d';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#1d282c';ctx.lineWidth=1;
    for(let x=0;x<W;x+=54){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(let y=0;y<H;y+=54){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    for(const b of blocks){ctx.fillStyle=b.tall?'#172126':'#1b272b';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#253238';ctx.fillRect(b.x+4,b.y+4,b.w-8,b.h-8);ctx.fillStyle=b.hue>.74?'#db574033':'#e7bb6530';for(let yy=b.y+8;yy<b.y+b.h-5;yy+=10)for(let xx=b.x+8;xx<b.x+b.w-5;xx+=12)if((Math.floor(xx/4)+Math.floor(yy/3)*7)%11>3)ctx.fillRect(xx,yy,4,3)}
    for(const l of [{x:170,y:290,c:'#ea3f2533'},{x:1040,y:500,c:'#4bd3d333'},{x:775,y:86,c:'#ed4e2530'},{x:368,y:715,c:'#4b79ff26'}]){const g=ctx.createRadialGradient(l.x,l.y,2,l.x,l.y,180);g.addColorStop(0,l.c);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(l.x-180,l.y-180,360,360)}
    ctx.fillStyle='#192624';ctx.beginPath();ctx.ellipse(cx,cy,rx-77,ry-77,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#293538';ctx.lineWidth=4;ctx.setLineDash([2,10]);ctx.beginPath();ctx.ellipse(cx,cy,rx-78,ry-78,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#202c2e';ctx.fillRect(444,333,118,104);ctx.fillStyle='#2d3939';ctx.fillRect(452,341,102,88);ctx.fillStyle='#cf573b';ctx.fillRect(466,350,18,4);ctx.fillStyle='#3b5550';ctx.fillRect(495,355,49,21);ctx.fillRect(466,390,77,26);
    ctx.fillStyle='#12191a';ctx.fillRect(310,380,58,40);ctx.fillStyle='#384544';ctx.fillRect(315,385,48,30);ctx.fillStyle='#d5bc72';ctx.fillRect(322,389,3,3);ctx.fillRect(338,389,3,3);ctx.fillRect(354,389,3,3);
    ctx.strokeStyle='#303738';ctx.lineWidth=road+28;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#c1c1b2';ctx.lineWidth=road+12;ctx.setLineDash([15,15]);ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#d94b3a';ctx.lineDashOffset=15;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
    ctx.strokeStyle='#303537';ctx.lineWidth=road;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
    const asphalt=ctx.createRadialGradient(cx,cy,30,cx,cy,500);asphalt.addColorStop(0,'#383d3e');asphalt.addColorStop(1,'#272d30');ctx.strokeStyle=asphalt;ctx.lineWidth=road-13;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#697072';ctx.lineWidth=1.5;ctx.setLineDash([18,19]);ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<18;i++){const a=i*.349,x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);ctx.fillStyle='#ffffff08';ctx.fillRect(x-13,y-2,26,4)}
    ctx.save();ctx.translate(cx+rx,cy);ctx.rotate(Math.PI/2);for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#e7e5d7':'#292e31';ctx.fillRect(-road/2+i*road/8,-4,road/8,9)}ctx.restore();
    for(let i=0;i<16;i++){const a=i*Math.PI/8+.15,x=cx+(rx+102)*Math.cos(a),y=cy+(ry+102)*Math.sin(a);ctx.fillStyle='#11191c';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle=i%2?'#4ce1df':'#ff623b';ctx.shadowBlur=15;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  }
  function drawCar(x,y,angle,color,scale=1,glow=false){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle='#05090c';ctx.beginPath();ctx.ellipse(0,5,27,17,0,0,Math.PI*2);ctx.fill();if(glow){ctx.shadowColor=color;ctx.shadowBlur=18}
    ctx.fillStyle='#090d10';ctx.fillRect(-14,-14,10,5);ctx.fillRect(9,-14,10,5);ctx.fillRect(-14,9,10,5);ctx.fillRect(9,9,10,5);
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(14,-10);ctx.lineTo(3,-12);ctx.lineTo(-14,-10);ctx.lineTo(-20,-6);ctx.lineTo(-22,0);ctx.lineTo(-20,6);ctx.lineTo(-14,10);ctx.lineTo(3,12);ctx.lineTo(14,10);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#101b23';ctx.beginPath();ctx.moveTo(11,-8);ctx.lineTo(3,-9);ctx.lineTo(-8,-8);ctx.lineTo(-12,-5);ctx.lineTo(10,-5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(10,5);ctx.lineTo(-12,5);ctx.lineTo(-8,8);ctx.lineTo(3,9);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d7e8e4';ctx.fillRect(17,-7,4,4);ctx.fillRect(17,3,4,4);ctx.fillStyle='#fa4936';ctx.fillRect(-19,-7,3,4);ctx.fillRect(-19,3,3,4);ctx.fillStyle='#ffffff55';ctx.fillRect(4,-11,3,22);
    if(glow){ctx.fillStyle='#ff3030';ctx.globalAlpha=.16;ctx.fillRect(-33,-17,18,34);ctx.globalAlpha=1}ctx.restore();
  }
  function draw(){
    ctx.setTransform(dpr*scaleX,0,0,dpr*scaleY,0,0);ctx.clearRect(0,0,W,H);city();
    for(const m of marks){ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.a);ctx.globalAlpha=Math.min(.48,m.life*.48);ctx.fillStyle='#080b0c';ctx.fillRect(-12,-1.7,23,3.4);ctx.restore()}
    const t=performance.now()/1000;rivals.forEach(r=>{const a=r.t+t*(.21+r.phase*.018),x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);drawCar(x,y,a+Math.PI/2,r.color,.82,false)});
    drawCar(player.x,player.y,player.angle,player.color,1.08,true);
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);const beam=ctx.createRadialGradient(35,0,4,92,0,112);beam.addColorStop(0,'#ffe9a522');beam.addColorStop(1,'#ffe9a200');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(12,-5);ctx.lineTo(190,-74);ctx.lineTo(190,74);ctx.lineTo(12,5);ctx.fill();ctx.restore();
  }
  function frame(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;if(running&&!paused)step(dt);draw();requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();
