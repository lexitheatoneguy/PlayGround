const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('title');
const subtitleEl = document.getDocumentElementById?.('subtitle') || document.getElementById('subtitle');
const startBtn = document.getElementById('start');

let W = 960, H = 540, dpr = 1;
let state = 'menu', score = 0, wave = 1, stars = [], shake = 0;
let player, aliens = [], bullets = [], enemyBullets = [], particles = [];
let keys = {}, last = 0, alienDir = 1, alienStep = 0, enemyTimer = 0;

function resize() {
  const box = canvas.getBoundingClientRect(), oldW = W; dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
  W = box.width; H = box.height; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (player) player.x = Math.max(28, Math.min(W-28, player.x + (W-oldW)/2));
  if (aliens.length) for (const a of aliens) a.x += (W-oldW)/2;
  if (!stars.length) stars = Array.from({length: 110}, () => ({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.4+.2,a:Math.random()}));
}
addEventListener('resize', resize); resize();

function resetPlayer() { player = {x:W/2,y:H-68,w:34,h:24,cool:0,life:3,inv:0}; }
function makeAliens() {
  aliens=[];
  const cols=9, rows=4, gapX=Math.min(58,(W-86)/(cols-1)), gapY=Math.min(44,(H-180)/(rows+1));
  const startX=W/2-(cols-1)*gapX/2;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) aliens.push({x:startX+c*gapX,y:105+r*gapY,w:30,h:22,row:r,alive:true,phase:Math.random()*6});
  alienDir=1; alienStep=0;
}
function newGame() { score=0;wave=1;bullets=[];enemyBullets=[];particles=[];resetPlayer();makeAliens();updateHud();state='playing';overlay.classList.remove('show'); }

function updateHud(){ scoreEl.textContent=String(score).padStart(5,'0');waveEl.textContent=String(wave).padStart(2,'0');if(player)livesEl.textContent=Array.from({length:3},(_,i)=>i<player.life?'♥':'·').join(' '); }

function shoot() { if(state==='playing'&&player.cool<=0&&bullets.length<5){bullets.push({x:player.x,y:player.y-18,v:-520});player.cool=.28;} }
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'){e.preventDefault();shoot();}});
addEventListener('keyup',e=>keys[e.code]=false);
startBtn.addEventListener('click',()=>{ if(state==='menu'||state==='gameover'||state==='win') newGame(); });

function bindHold(id, key, action) {
  const el=document.getElementById(id);
  const down=e=>{e.preventDefault();keys[key]=true;if(action)action();el.setPointerCapture?.(e.pointerId);};
  const up=e=>{e.preventDefault();keys[key]=false;};
  el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up);
}
bindHold('left','ArrowLeft');bindHold('right','ArrowRight');bindHold('fire','fire',shoot);

function rectHit(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2}
function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*140;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.5,color});}}

function nextWave(){wave++;enemyBullets=[];makeAliens();for(const a of aliens)a.y-=25;updateHud(); }

function update(dt){
  for(const s of stars){s.y+=s.s*dt*12;if(s.y>H){s.y=0;s.x=Math.random()*W;}}
  if(state!=='playing') return;
  player.cool-=dt;player.inv-=dt;
  if(keys.ArrowLeft||keys.KeyA)player.x-=310*dt;if(keys.ArrowRight||keys.KeyD)player.x+=310*dt;
  player.x=Math.max(28,Math.min(W-28,player.x));
  if(keys.Space||keys.fire)shoot();
  for(const b of bullets)b.y+=b.v*dt;
  for(const b of enemyBullets)b.y+=b.v*dt;
  bullets=bullets.filter(b=>b.y>-20);enemyBullets=enemyBullets.filter(b=>b.y<H+20);

  let alive=aliens.filter(a=>a.alive), edge=false;
  const speed=(18+wave*3)*(1-Math.min(.7,(alive.length/36)*.55));
  for(const a of alive){a.x+=alienDir*speed*dt;a.phase+=dt*3;}
  edge=alive.some(a=>alienDir>0?a.x+a.w/2>=W-18:a.x-a.w/2<=18);
  if(edge){alienDir*=-1;for(const a of alive)a.y+=16;if(alive.some(a=>a.y+a.h/2>player.y-20))endGame(false);}

  enemyTimer-=dt;if(enemyTimer<=0&&alive.length){const shooters=alive.filter(a=>!alive.some(o=>o.x===a.x&&o.y>a.y));const s=shooters[Math.floor(Math.random()*shooters.length)]||alive[Math.floor(Math.random()*alive.length)];enemyBullets.push({x:s.x,y:s.y+14,v:170+wave*18,w:4,h:14});enemyTimer=Math.max(.24,.95-wave*.07)*(.75+Math.random()*.5);}

  for(const b of bullets) for(const a of alive) if(a.alive&&rectHit(b,{x:a.x,y:a.y,w:a.w,h:a.h})) {a.alive=false;b.y=-999;score+=(4-a.row)*25;burst(a.x,a.y,a.row===0?'#63edff':'#77aaff',10);updateHud();shake=3;}
  for(const b of enemyBullets) if(player.inv<=0&&rectHit(b,{x:player.x,y:player.y,w:player.w,h:player.h})) {b.y=999;player.life--;player.inv=1.5;burst(player.x,player.y,'#ff5c79',18);shake=8;if(player.life<=0)endGame(false);}
  aliens=aliens.filter(a=>a.alive);
  if(!aliens.length) { if(wave>=5) endGame(true); else nextWave(); }
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=80*dt;p.life-=dt;} particles=particles.filter(p=>p.life>0);
  shake*=.8;
}

function endGame(win){state=win?'win':'gameover';titleEl.textContent=win?'OUTPOST SAVED':'SHIP DESTROYED';subtitleEl.textContent=win?'FINAL SCORE '+String(score).padStart(5,'0'):'SCORE '+String(score).padStart(5,'0');startBtn.textContent='RESTART';setTimeout(()=>overlay.classList.add('show'),300); }

function pixelText(text,x,y,size,color,align='center'){ctx.save();ctx.font=`bold ${size}px "Courier New", monospace`;ctx.textAlign=align;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillText(text,x,y);ctx.restore();}
function drawShip(){ctx.save();ctx.translate(player.x,player.y);if(player.inv>0&&Math.floor(player.inv*12)%2)return ctx.restore();ctx.shadowColor='#6eeaff';ctx.shadowBlur=16;ctx.fillStyle='#c5f5ff';ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(12,-4);ctx.lineTo(17,9);ctx.lineTo(8,9);ctx.lineTo(5,15);ctx.lineTo(-5,15);ctx.lineTo(-8,9);ctx.lineTo(-17,9);ctx.lineTo(-12,-4);ctx.closePath();ctx.fill();ctx.fillStyle='#55d7ff';ctx.fillRect(-3,-10,6,12);ctx.restore();}
function drawAlien(a){ctx.save();ctx.translate(a.x,a.y);const color=a.row===0?'#67eaff':a.row===1?'#65b5ff':a.row===2?'#9a93ff':'#5dc4b8';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=9;ctx.fillRect(-12,-9,24,15);ctx.fillRect(-8,-13,16,4);ctx.fillRect(-17,-4,5,10);ctx.fillRect(12,-4,5,10);ctx.fillStyle='#09101e';ctx.fillRect(-7,-7,4,4);ctx.fillRect(3,-7,4,4);ctx.fillRect(-10,7,5,3);ctx.fillRect(5,7,5,3);ctx.restore();}

function draw(){ctx.save();ctx.clearRect(0,0,W,H);ctx.fillStyle='#090e20';ctx.fillRect(0,0,W,H);const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#111b39');grd.addColorStop(.65,'#080d1b');grd.addColorStop(1,'#050711');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  for(const s of stars){ctx.globalAlpha=.25+s.a*.55;ctx.fillStyle='#b9eaff';ctx.fillRect(s.x,s.y,s.s,s.s);}ctx.globalAlpha=1;
  ctx.translate((Math.random-.5)*shake,(Math.random-.5)*shake);
  ctx.strokeStyle='#15213a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H-34);ctx.lineTo(W,H-34);ctx.stroke();
  for(let i=0;i<3;i++) for(let j=0;j<5;j++){const x=160+j*W/7+(i%2)*20,y=H-20+(i%3)*5;ctx.fillStyle='#11192b';ctx.fillRect(x,y,10,6);}
  for(const a of aliens)if(a.alive)drawAlien(a);
  ctx.fillStyle='#ffe783';ctx.shadowColor='#fff1a1';ctx.shadowBlur=8;for(const b of bullets){ctx.fillRect(b.x-2,b.y-8,4,16);}
  ctx.fillStyle='#ff5c79';ctx.shadowColor='#ff5c79';for(const b of enemyBullets){ctx.fillRect(b.x-2,b.y-7,b.w||4,b.h||14);}
  ctx.shadowBlur=0;for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
  if(state==='playing'||state==='gameover'||state==='win')drawShip();
  ctx.restore();
}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
