/** Actual App/GameSession capture fixtures and loopback-only artifact receiver.
 * No alternate physics, pose playback, impulses, or renderer are used by the page.
 * Usage: node scripts/preview/orange-tabby-gameplay-v01.mjs fixtures|serve|verify
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DATA=path.join(ROOT,'assets/concepts/orange-tabby/gameplay-v01');
const OUT=path.join(ROOT,'output/orange-tabby-gameplay-v01');
const PAGE=path.join(ROOT,'docs/previews/orange-tabby');
await Promise.all([mkdir(DATA,{recursive:true}),mkdir(OUT,{recursive:true})]);
const digest=b=>createHash('sha256').update(b).digest('hex');
const json=async(file,data)=>writeFile(file,JSON.stringify(data,null,2)+'\n');
const command=process.argv[2]||'fixtures';

if(command==='serve'){
  const destinations={'/recording':['actual-gameplay.webm','video/webm'],'/report':['capture-report.json','application/json'],'/poster':['gameplay-poster.png','image/png']};
  const server=createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5173');
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    const destination=destinations[new URL(req.url,'http://127.0.0.1').pathname];
    if(req.method!=='POST'||!destination){res.writeHead(404);res.end('Not found');return;}
    try{
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>200*1024*1024)throw Error('Artifact exceeds capture limit');chunks.push(chunk);}
      const bytes=Buffer.concat(chunks);await writeFile(path.join(OUT,destination[0]),bytes);
      console.log(JSON.stringify({saved:destination[0],bytes:bytes.length,sha256:digest(bytes)}));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({saved:destination[0],bytes:bytes.length}));
    }catch(error){res.writeHead(500);res.end(error.message);}
  });
  server.listen(8767,'127.0.0.1',()=>console.log('Local cat gameplay artifact receiver: http://127.0.0.1:8767 (POST only; fixed files)'));
}else if(command==='fixtures'){
  const {ArenaPhysics,CONFIG,weaponSegments,hurtSegments,closestSegments}=await import('../../src/physics.js');
  const accepted=JSON.parse(await readFile(path.join(ROOT,'assets/concepts/orange-tabby/motion-v06/game-solver-replay.json')));
  const hashes={};for(const file of ['src/physics.js','src/game-session.js','src/scene.js','src/ArenaCanvas.jsx','src/loadouts.js','src/character-catalog.js','src/orange-tabby-profile.js']){
    try{hashes[file]=digest(await readFile(path.join(ROOT,file)));}catch{hashes[file]=null;}
  }
  hashes['public/models/orange-tabby-prepared-v02.glb']=digest(await readFile(path.join(ROOT,'public/models/orange-tabby-prepared-v02.glb')));
  const cat={characterId:'orange-tabby',weaponId:'cat-paws'},opponent={characterId:'basic-fighter',weaponId:'sword'};
  const pose=p=>({p:{...p.p},theta:p.theta,phi:p.phi});
  const zero={theta:0,phi:0};
  function simulate(def){
    const world=new ArenaPhysics();world.reset(cat,opponent,{fighters:def.mode==='solo'?1:2,endless:def.mode==='practice',arenaScale:def.mode==='solo'?3:1});
    world.players.forEach((p,id)=>Object.assign(p,{p:{...def.initial[id].p},theta:def.initial[id].theta,phi:def.initial[id].phi}));
    const initialOverlap=world.players[1]?Math.max(0,...weaponSegments(world.players[0]).flatMap(a=>hurtSegments(world.players[1]).map(b=>a.radius+b.radius-closestSegments(a.a,a.b,b.a,b.b).distance))):0;
    const events=[],rows=[];
    for(let tick=0;tick<Math.round(def.duration/CONFIG.step);tick++){
      const t=tick*CONFIG.step,row=def.inputs[Math.min(def.inputs.length-1,Math.floor(t*60))];
      world.step([row.input,zero]);for(const event of world.events)events.push({time:world.time,...event});
      if(tick%3===0){const p=world.players[0];rows.push({time:world.time,keys:row.keys,height:p.p.y-CONFIG.bodyFloor,stamina:p.stamina,p:{...p.p},v:{...p.v},support:p.staffGrounded});}
    }
    return {initialOverlap,events,maxHeight:Math.max(...rows.map(r=>r.height)),firstSupport:rows.find(r=>r.support),final:rows.at(-1),rows};
  }
  const order=['w','s','a','d','wa','wd','sa','sd','release-reverse','yaw-reverse','opposites','landing','hover-idle'];
  const chapters=order.map(id=>{
    const shot=accepted.shots.find(s=>s.id===id),p=shot.rows[0].players[0];
    const inputs=shot.rows.map(row=>({time:row.time,keys:row.input,input:{theta:Number(row.input.split(' + ').includes('W'))-Number(row.input.split(' + ').includes('S')),phi:Number(row.input.split(' + ').includes('D'))-Number(row.input.split(' + ').includes('A'))}}));
    return {id,title:shot.title,duration:shot.duration,mode:'solo',initial:[pose(p)],inputs,reviewCamera:true,fixture:id==='landing'?'Declared 0.70-unit drop; not launch evidence':'Independent rest reset',expected:simulate({mode:'solo',initial:[pose(p)],inputs,duration:shot.duration})};
  });
  for(const id of ['vertical-hit','horizontal-hit','sword-clash','near-miss']){
    const shot=accepted.shots.find(s=>s.id===id);
    const inputs=shot.rows.map(row=>({time:row.time,keys:row.input,input:{theta:Number(row.input.split(' + ').includes('W'))-Number(row.input.split(' + ').includes('S')),phi:Number(row.input.split(' + ').includes('D'))-Number(row.input.split(' + ').includes('A'))}}));
    let def={id,title:shot.title,duration:shot.duration,mode:'practice',initial:shot.rows[0].players.map(pose),inputs,reviewCamera:true,fixture:'Independent non-overlapping contact fixture; passive opponent'};
    const known={
      'vertical-hit':[{p:{x:0,y:.94,z:0},theta:.4,phi:0},{p:{x:1.8,y:.59,z:1.5},theta:.4,phi:Math.PI}],
      'horizontal-hit':[{p:{x:0,y:.94,z:0},theta:1.05,phi:-.65},{p:{x:1.8,y:.59,z:-1},theta:0,phi:Math.PI}],
      'sword-clash':[{p:{x:0,y:.94,z:0},theta:1.05,phi:0},{p:{x:3,y:.59,z:1.5},theta:1.4,phi:Math.PI}],
    };
    if(known[id])def.initial=known[id];
    let expected=simulate(def);
    const valid=proof=>proof.initialOverlap<1e-6&&(id==='near-miss'?!proof.events.some(e=>e.type==='hit'&&e.attacker===0):id==='sword-clash'?proof.events.some(e=>e.type==='clash'):proof.events.some(e=>e.type==='hit'&&e.attacker===0&&(id!=='horizontal-hit'||e.turnShare>.65)));
    if(!valid(expected)&&id!=='near-miss'){
      let found=false;
      outer:for(const theta of id==='horizontal-hit'?[.4,.8,1.05,1.4,Math.PI/2,1.8]:[1.05,.4,1.5])for(const x of [1.8,2.3,2.8,3.3,1.4,3.8])for(const z of [1.5,2,.8,0,-1])for(const targetTheta of id==='sword-clash'?[1.4,1.7,.8,2]:[Math.PI/2,0]){
        const trial={...def,initial:[{...def.initial[0],theta},{p:{x,y:CONFIG.bodyFloor,z},theta:targetTheta,phi:Math.PI}]},proof=simulate(trial);
        if(valid(proof)){def=trial;expected=proof;found=true;break outer;}
      }
      if(!found)throw Error('No actual-runtime valid contact fixture: '+id);
    }
    if(!valid(expected))throw Error('Invalid actual-runtime fixture: '+id);chapters.push({...def,expected});
  }
  let cursor=0;for(const c of chapters){c.offset=cursor;cursor+=c.duration;}
  const report={version:'orange-tabby-gameplay-v01',date:'2026-10-20',type:'Actual App + GameSession + ArenaPhysics + ArenaView; live key injection and independent labelled resets; review camera only',fps:30,size:[1600,900],loadouts:[cat,opponent],sourceHashes:hashes,acceptedMotion:'orange-tabby-motion-v06',acceptedPresentation:'orange-tabby-all-controls-v07',authoredTravel:false,alternatePhysics:false,duration:cursor,chapters};
  await json(path.join(DATA,'fixtures.json'),report);await json(path.join(PAGE,'gameplay-v01-fixtures.json'),report);
  console.log(JSON.stringify({duration:cursor,chapters:chapters.map(c=>({id:c.id,offset:c.offset,duration:c.duration,height:c.expected.maxHeight,hits:c.expected.events.filter(e=>e.type==='hit'&&e.attacker===0).length,clashes:c.expected.events.filter(e=>e.type==='clash').length}))},null,2));
}else if(command==='verify'){
  const fixture=JSON.parse(await readFile(path.join(DATA,'fixtures.json'))),capture=JSON.parse(await readFile(path.join(OUT,'capture-report.json'))),checks=[];
  const check=(name,passed,detail)=>{checks.push({name,passed:!!passed,detail});if(!passed)console.error('FAIL',name,detail);};
  const matrix=['w','s','a','d','wa','wd','sa','sd'];check('Complete normal-speed input matrix first',matrix.every((id,i)=>capture.chapters[i]?.id===id),capture.chapters.slice(0,8).map(c=>c.id));
  for(const id of matrix){const c=capture.chapters.find(c=>c.id===id),held=c?.samples.filter(s=>s.keys.replaceAll(' + ','').toLowerCase()===id)||[];check(id+' sustained actual held keys',held.length>=45,{samples:held.length,min:held[0]?.time,max:held.at(-1)?.time});}
  for(const c of capture.chapters){check(c.id+' simulation advanced through chapter',c.simulationTime>=c.duration-.12,{simulationTime:c.simulationTime,duration:c.duration});check(c.id+' original source model loaded',c.modelReady===true,c.modelReady);check(c.id+' finite and upright body',c.samples.every(s=>Number.isFinite(s.height+s.x+s.z+s.stamina)&&Math.abs(s.bodyPitch)<1e-8));}
  const s=capture.chapters.find(c=>c.id==='s'),support=s.samples.find(r=>r.support);check('S rises after paw-floor support',support&&support.keys==='S'&&Math.max(...s.samples.filter(r=>r.time<support.time).map(r=>r.height))<.351&&s.maxHeight>1.85,{firstSupport:support,maxHeight:s.maxHeight});
  for(const id of ['vertical-hit','horizontal-hit']){const c=capture.chapters.find(c=>c.id===id);check(id+' real damage event',c.events.some(e=>e.type==='hit'&&e.attacker===0&&(id!=='horizontal-hit'||e.turnShare>.65)),c.events);}
  check('Real weapon clash feedback',capture.chapters.find(c=>c.id==='sword-clash').events.some(e=>e.type==='clash'));
  check('Distant swing misses',!capture.chapters.find(c=>c.id==='near-miss').events.some(e=>e.type==='hit'&&e.attacker===0));
  for(const [file,sha] of Object.entries(fixture.sourceHashes))if(sha)check('Capture source hash '+file,digest(await readFile(path.join(ROOT,file)))===sha);
  const report={version:'orange-tabby-gameplay-v01',date:'2026-10-20',passed:checks.every(c=>c.passed),checks,captureFile:'output/orange-tabby-gameplay-v01/actual-gameplay.webm',recordedDuration:capture.duration};
  await json(path.join(DATA,'verification.json'),report);console.log(JSON.stringify({passed:report.passed,checks:checks.length}));if(!report.passed)process.exitCode=1;
}else throw Error('Use fixtures, serve, or verify');
