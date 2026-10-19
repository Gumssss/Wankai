/** Isolated replay of the merged upright beagle, for a movement design video.
 * No production file is changed. The full-width skill is authored separately.
 */
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'output/beagle-normal-skill');
const SNAPSHOT=path.join(OUT,'baseline');
const COMMIT='aa3e4c6c27ba2f56c6b173adf94987f7802467f5';
await mkdir(SNAPSHOT,{recursive:true});
const hashes={};
for(const name of ['physics.js','beagle-profile.js']){
  const bytes=execFileSync('git',['show',`${COMMIT}:src/${name}`],{cwd:ROOT});
  hashes[name]=createHash('sha256').update(bytes).digest('hex');
  await writeFile(path.join(SNAPSHOT,name),bytes);
}
const {ArenaPhysics,CONFIG,v3}=await import(pathToFileURL(path.join(SNAPSHOT,'physics.js')));
const definitions=[
  {id:'w',keys:'W',title:'Normal move / forward ear stroke',detail:'Parallel ears swing; ground contact carries the body',theta:1,phi:0,duration:4},
  {id:'s',keys:'S',title:'Normal move / backward ear stroke',detail:'Reverse ear drive; same attached weapon surfaces',theta:-1,phi:0,duration:4},
  {id:'d',keys:'D',title:'Normal turn / parallel ears, no rotor spread',detail:'Turn the body and swing plane; long reach still remains',theta:0,phi:1,duration:3},
  {id:'wd',keys:'W + D',title:'Combined input / forward stroke + right turn',detail:'The stroke continues while its vertical plane turns',theta:1,phi:1,duration:4.5},
  {id:'sa',keys:'S + A',title:'Combined input / backward stroke + left turn',detail:'Parallel ears stay together; the body follows contact',theta:-1,phi:-1,duration:4.5},
];
const scenarios=[];
for(const def of definitions){
  const arena=new ArenaPhysics();
  arena.reset(false,true,'beagle','beagle',20);
  const p=arena.players[0];p.p=v3(0,CONFIG.bodyFloor,0);p.phi=0;
  p.theta=def.theta>0?-.4:def.theta<0?.4:-1.55;
  const rows=[];
  // 0.8x replay exposes the ground-contact phase without changing physics.
  const physicsDuration=def.duration*.8;
  for(let tick=0;tick<=Math.ceil(physicsDuration/CONFIG.step);tick++){
    const time=tick*CONFIG.step;
    const active=time>=.2&&time<physicsDuration-.35;
    // Proposal: slower A/D steering plus finite motor assistance against
    // incidental yaw during a W/S stroke. Ground impulses still deflect it.
    const steering=active?Math.max(-1,Math.min(1,(def.phi*1.15-p.wp)*.7)):0;
    const inputs=[{theta:active?def.theta:0,phi:steering}];
    if(tick)arena.step(inputs,CONFIG.step);
    if(tick%3===0)rows.push({time,theta:p.theta,phi:p.phi,p:{...p.p},v:{...p.v},wt:p.wt,wp:p.wp,
      grounded:p.grounded,contact:p.staffGrounded,steeringMotor:steering,input:active?def.keys:'RELEASE'});
  }
  for(const axis of ['theta','phi']){
    let raw=rows[0][axis],unwrapped=raw;
    for(const row of rows.slice(1)){
      const next=row[axis];unwrapped+=Math.atan2(Math.sin(next-raw),Math.cos(next-raw));raw=next;row[axis]=unwrapped;
    }
  }
  const maxRise=Math.max(...rows.map(r=>r.p.y-CONFIG.bodyFloor));
  if(def.theta&&maxRise<.3)throw Error(`Missing contact-driven body lift: ${def.id}`);
  if(rows.some(r=>!Number.isFinite(r.theta+r.phi+r.p.x+r.p.y+r.p.z)))throw Error('Nonfinite replay');
  scenarios.push({...def,playbackSpeed:.8,rows,stats:{maxRise,
    maxHeadingChange:Math.max(...rows.map(r=>Math.abs(r.phi))),contactFrames:rows.filter(r=>r.contact).length}});
}
const report={purpose:'Compact normal W/S+A/D compared with a proposed wide-spin skill',
  baseline:{commit:COMMIT,sha256:hashes,simulationHz:1/CONFIG.step,productionModified:false},
  bodyFloor:CONFIG.bodyFloor,normalMotion:'Merged upright contact physics plus proposed yaw-rate motor assistance; 0.8x playback; no launch impulse',
  proposedSteering:{yawRate:1.15,feedbackGain:.7,finiteMotor:true},
  skillMotion:'Authored horizontal deployment and yaw; not a gameplay simulation',scenarios};
await writeFile(path.join(OUT,'motion.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({baseline:COMMIT,scenarios:scenarios.map(s=>({id:s.id,...s.stats}))},null,2));
