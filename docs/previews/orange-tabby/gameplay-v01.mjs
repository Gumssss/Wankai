import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../../src/App.jsx';
import {GameSession} from '../../../src/game-session.js';
import {CONFIG,weaponSegments} from '../../../src/physics.js';
import {Vector3} from 'three';

// This page mounts the shipping game. It never imports an adapter, cached body
// poses, or alternate renderer. Fixtures only set the initial state and keys.
const fixtures=await fetch('./gameplay-v01-fixtures.json').then(r=>r.json());
const session=new GameSession();session.sound.enabled=false;
createRoot(document.querySelector('#root')).render(React.createElement(App,{session}));
const canvas=document.querySelector('#capture-output'),ctx=canvas.getContext('2d');
const status=document.querySelector('#status'),recordButton=document.querySelector('#record');
const sourceVideo=document.createElement('video');sourceVideo.muted=true;sourceVideo.playsInline=true;
const wait=ms=>new Promise(r=>setTimeout(r,ms)),frame=()=>new Promise(r=>requestAnimationFrame(r));
let chapter=null,chapterIndex=0,recording=false,sourceCanvas=null,sourceStream=null,chapterEvents=[],samples=[],trail=[],peak=.35,allResults=[],wallStart=0;
let sourceRect={x:0,y:110,width:1600,height:670};
const cameraPoint=new Vector3(),projectPoint=new Vector3();
const baseImpact=session.impact.bind(session);
session.impact=event=>{if(recording)chapterEvents.push({time:session.world.time,...event});baseImpact(event);};
function setKeys(keys){
  const wanted=keys==='RELEASE'?[]:keys.split(' + ').map(k=>'Key'+k);
  for(const key of [...session.keys])if(!wanted.includes(key))session.keyUp(key);
  for(const key of wanted)if(!session.keys.has(key))session.keyDown(key);
}
function heldKeys(){return ['W','S','A','D'].filter(k=>session.keys.has('Key'+k)).join(' + ')||'RELEASE';}
function project(p){
  const view=session.view;if(!view)return null;
  projectPoint.set(p.x,p.y,p.z).project(view.camera);
  return {x:sourceRect.x+(projectPoint.x+1)*sourceRect.width/2,y:sourceRect.y+(1-projectPoint.y)*sourceRect.height/2,depth:projectPoint.z};
}
function line(a,b,color,width=2,dash=[]){if(!a||!b||a.depth>1||b.depth>1)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
function worldCircle(p,r,color,width=2){const points=Array.from({length:33},(_,i)=>project({x:p.x+Math.cos(i*Math.PI/16)*r,y:p.y,z:p.z+Math.sin(i*Math.PI/16)*r}));for(let i=1;i<points.length;i++)line(points[i-1],points[i],color,width);}
function keyBox(key,x,y){const active=session.keys.has('Key'+key);ctx.fillStyle=active?'#455c3b':'#f8f5e9';ctx.strokeStyle=active?'#455c3b':'#c6cbbb';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,36,30,5);ctx.fill();ctx.stroke();ctx.fillStyle=active?'#fffdf2':'#79816e';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText(key,x+18,y+21);ctx.textAlign='left';}
function bar(label,value,max,x,y,width,color){ctx.fillStyle='#536349';ctx.font='12px system-ui';ctx.fillText(`${label} ${Math.ceil(value)} / ${max}`,x,y);ctx.fillStyle='#dce0d2';ctx.fillRect(x,y+7,width,7);ctx.fillStyle=color;ctx.fillRect(x,y+7,width*Math.max(0,value)/max,7);}
function stateSample(){const p=session.world.players[0];return {time:session.world.time,keys:heldKeys(),height:p.p.y-CONFIG.bodyFloor,x:p.p.x,z:p.p.z,stamina:p.stamina,bodyPitch:p.bodyPitch||0,support:p.staffGrounded,vy:p.v.y,theta:p.theta,phi:p.phi,health:p.health};}

// Keep the real runtime tick and ArenaView. The review camera follows horizontal
// travel only, at a constant world height, so a launch cannot be hidden by it.
const baseTick=session.tick.bind(session);
session.tick=dt=>{
  if(recording&&chapter){const row=chapter.inputs[Math.min(chapter.inputs.length-1,Math.floor(session.world.time*60))];setKeys(row.keys);}
  const events=baseTick(dt);
  if(recording&&chapter){const sample=stateSample();samples.push(sample);peak=Math.max(peak,sample.height);if(!trail.length||Math.hypot(sample.x-trail.at(-1).x,sample.z-trail.at(-1).z)>.04)trail.push({x:sample.x,y:.035,z:sample.z});}
  return events;
};

function draw(){
  requestAnimationFrame(draw);ctx.fillStyle='#f5f2e9';ctx.fillRect(0,0,1600,900);
  if(sourceVideo.readyState>=2){const sw=sourceVideo.videoWidth,sh=sourceVideo.videoHeight,scale=Math.min(1600/sw,670/sh);sourceRect={x:(1600-sw*scale)/2,y:110+(670-sh*scale)/2,width:sw*scale,height:sh*scale};ctx.drawImage(sourceVideo,sourceRect.x,sourceRect.y,sourceRect.width,sourceRect.height);}
  if(!chapter){ctx.fillStyle='#30372e';ctx.font='bold 30px system-ui';ctx.fillText('Orange tabby / actual game runtime',50,70);return;}
  const p=session.world.players[0],events=chapterEvents;
  ctx.save();ctx.beginPath();ctx.rect(0,110,1600,670);ctx.clip();
  for(let i=1;i<trail.length;i++)line(project(trail[i-1]),project(trail[i]),'#b2784baa',3);
  worldCircle({x:chapter.initial[0].p.x,y:.03,z:chapter.initial[0].p.z},.45,'#708465aa',1);
  const floor=project({x:p.p.x,y:0,z:p.p.z}),base=project({x:p.p.x,y:p.p.y-CONFIG.bodyFloor,z:p.p.z});line(floor,base,'#405f45',3,[5,4]);
  if(floor&&base){ctx.fillStyle='#36553b';ctx.font='bold 15px system-ui';ctx.fillText(`body ${Math.max(0,p.p.y-CONFIG.bodyFloor).toFixed(2)} m`,base.x+12,base.y-6);}
  if(p.staffGrounded){const contacts=weaponSegments(p).filter(s=>Math.min(s.a.y,s.b.y)-s.radius<.065);for(const s of contacts){const q=s.a.y<=s.b.y?s.a:s.b;worldCircle({x:q.x,y:.04,z:q.z},.13,'#d29c37',3);}}
  for(const event of events.filter(e=>session.world.time-e.time<.7)){const q=project(event.point);if(q){ctx.font='bold 23px system-ui';ctx.fillStyle=event.type==='clash'?'#8d642c':'#b14e3c';ctx.fillText(event.type==='clash'?'CLASH':`HIT −${event.damage}`,q.x+8,q.y-10);}}
  ctx.restore();
  ctx.fillStyle='#f5f2e9';ctx.fillRect(0,0,1600,110);ctx.fillRect(0,780,1600,120);
  ctx.fillStyle='#77866b';ctx.font='13px system-ui';ctx.fillText('WANKAI / ORANGE TABBY / ACTUAL GAME',30,26);ctx.fillText(`CHAPTER ${chapterIndex+1} / ${fixtures.chapters.length} · 1× · gameplay review camera`,1030,26);
  ctx.fillStyle='#30372e';ctx.font='bold 27px system-ui';ctx.fillText(chapter.title,30,64);ctx.font='13px system-ui';ctx.fillStyle='#7c856f';ctx.fillText(`${chapter.fixture} · live GameSession key input · no authored travel / launch`,30,94);
  keyBox('W',70,790);keyBox('A',30,824);keyBox('S',70,824);keyBox('D',110,824);
  ctx.font='bold 20px system-ui';ctx.fillStyle='#455c3b';ctx.fillText(heldKeys(),180,818);ctx.font='14px system-ui';ctx.fillText(`t ${session.world.time.toFixed(2)}s  /  ${chapter.duration.toFixed(1)}s`,180,846);
  bar('HP',p.health,100,430,810,195,'#b86148');bar('STAMINA',p.stamina,200,660,810,245,'#74895c');
  ctx.fillStyle='#405f45';ctx.font='bold 18px system-ui';ctx.fillText(`HEIGHT ${(p.p.y-CONFIG.bodyFloor).toFixed(2)} m   PEAK ${peak.toFixed(2)} m`,960,816);
  ctx.font='14px system-ui';ctx.fillText(`${p.staffGrounded?'PAW / FLOOR SUPPORT':'AIR / SWING'}   ·   Hits ${events.filter(e=>e.type==='hit'&&e.attacker===0).length}   Clashes ${events.filter(e=>e.type==='clash').length}`,960,844);
  const other=session.world.players[1];if(other){bar('TARGET HP',other.health,100,1260,810,280,'#608d8d');}
  ctx.fillStyle='#939b88';ctx.font='12px system-ui';ctx.fillText('App + GameSession + ArenaPhysics + ArenaView · actual model, motors, support, damage, stamina and recoil · gold rings: fitted paw-floor contact · trail / ruler: telemetry',30,882);
}
requestAnimationFrame(draw);
while(!session.renderer||!session.view)await wait(30);
status.textContent='Ready / actual game mounted';recordButton.disabled=false;

async function prepare(def){
  recording=false;session.goHome();if(!session.setLoadouts(fixtures.loadouts))throw Error('Runtime rejected approved cat loadout');session.startRound(def.mode);
  const timeout=performance.now()+12000;while((!session.view||!!!session.view.players[0]?.cat)&&performance.now()<timeout)await wait(40);
  if(!!!session.view?.players[0]?.cat)throw Error('Actual cat model was not loaded');
  const view=session.view;
  if(!view.__actualCaptureWrapped){
    const update=view.update.bind(view);
    view.update=(...args)=>{
      update(...args);
      if(!chapter?.reviewCamera)return;
      const p=session.world.players[0];
      if(view.solo){view.camera.position.set(p.p.x+8.8,4.4,p.p.z+1.4);cameraPoint.set(p.p.x,1.25,p.p.z);}
      else {const b=session.world.players[1],cx=(p.p.x+b.p.x)/2,cz=(p.p.z+b.p.z)/2;view.camera.position.set(cx+7,5.5,cz+9);cameraPoint.set(cx,1.2,cz);if(view.camera.isOrthographicCamera){const aspect=1600/670;view.camera.top=5.0;view.camera.bottom=-5.0;view.camera.left=-5.0*aspect;view.camera.right=5.0*aspect;view.camera.updateProjectionMatrix();}}
      view.camera.lookAt(cameraPoint);view.camera.updateMatrixWorld();
    };
    view.__actualCaptureWrapped=true;
  }
  await wait(180);session.state='paused';session.clearKeys();
  session.world.players.forEach((p,id)=>Object.assign(p,{p:{...def.initial[id].p},theta:def.initial[id].theta,phi:def.initial[id].phi,v:{x:0,y:0,z:0},wt:0,wp:0}));
  session.world.time=0;session.accumulator=0;session.freeze=0;session.countdown=0;session.effects=[];session.readout=null;session.visualRevision++;session.publish();
  if(sourceCanvas!==session.renderer.domElement){sourceStream?.getTracks().forEach(t=>t.stop());sourceCanvas=session.renderer.domElement;sourceStream=sourceCanvas.captureStream(30);sourceVideo.srcObject=sourceStream;await sourceVideo.play();}
  await frame();await frame();
}
recordButton.onclick=async()=>{
  recordButton.disabled=true;document.querySelector('#capture-panel').style.opacity='.25';
  try{
    const stream=canvas.captureStream(30),chunks=[],mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:9000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(r=>recorder.onstop=r);
    recorder.start();recorder.pause();allResults=[];wallStart=performance.now();let encodedOffset=0;
    for(let i=0;i<fixtures.chapters.length;i++){
      chapter=fixtures.chapters[i];chapterIndex=i;await prepare(chapter);chapterEvents=[];samples=[];trail=[];peak=.35;
      status.textContent=`Recording ${i+1}/${fixtures.chapters.length}: ${chapter.id}`;setKeys(chapter.inputs[0].keys);session.state='playing';session.publish();recording=true;
      const start=performance.now();recorder.resume();
      while(session.world.time<chapter.duration-CONFIG.step){if(performance.now()-start>chapter.duration*1000+12000)throw Error('Runtime stalled in '+chapter.id);await frame();}
      recorder.pause();recording=false;const duration=(performance.now()-start)/1000;session.clearKeys();session.state='paused';
      allResults.push({id:chapter.id,title:chapter.title,offset:encodedOffset,duration:chapter.duration,recordedDuration:duration,simulationTime:session.world.time,maxHeight:peak,modelReady:!!session.view.players[0]?.cat,events:chapterEvents,samples});encodedOffset+=duration;
      if(chapter.id==='s'){const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));await fetch('http://127.0.0.1:8767/poster',{method:'POST',headers:{'Content-Type':'image/png'},body:blob});}
    }
    recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());sourceStream?.getTracks().forEach(t=>t.stop());sourceCanvas=null;
    status.textContent='Saving actual gameplay evidence…';const movie=new Blob(chunks,{type:mime});
    await fetch('http://127.0.0.1:8767/recording',{method:'POST',headers:{'Content-Type':'video/webm'},body:movie}).then(r=>{if(!r.ok)throw Error('Local movie save failed');});
    const result={version:fixtures.version,type:fixtures.type,sourceHashes:fixtures.sourceHashes,camera:'Same actual ArenaView with fixed world-height review camera and horizontal tracking; ordinary native camera verified separately',hud:'Compact telemetry bands drawn from live session state; actual gameplay canvas unmodified',speed:1,fps:30,recordedAt:new Date().toISOString(),duration:encodedOffset,elapsedWallTime:(performance.now()-wallStart)/1000,chapters:allResults};
    await fetch('http://127.0.0.1:8767/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)}).then(r=>{if(!r.ok)throw Error('Local report save failed');});
    status.textContent='Complete / actual gameplay video and evidence saved';document.querySelector('#report').textContent=JSON.stringify({duration:result.duration,chapters:allResults.map(c=>({id:c.id,offset:c.offset,duration:c.recordedDuration,maxHeight:c.maxHeight,hits:c.events.filter(e=>e.type==='hit'&&e.attacker===0).length,clashes:c.events.filter(e=>e.type==='clash').length}))},null,2);
    document.querySelector('#capture-panel').style.opacity='1';recordButton.disabled=false;
  }catch(error){recording=false;session.clearKeys();status.textContent='Capture failed: '+error.message;document.querySelector('#capture-panel').style.opacity='1';recordButton.disabled=false;console.error(error);}
};
