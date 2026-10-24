import {writeFile} from 'node:fs/promises';
import {ArenaPhysics,CONFIG,STAMINA,WEAPONS,makePlayer,hurtSegments,damageForImpact,v3} from '../src/physics.js';
import {CHARACTER_CATALOG} from '../src/character-catalog.js';
import {PLAYABLE_LOADOUTS} from '../src/loadouts.js';
import {ROUND_RULES,ROTOR_RESOURCE,HOVER_DRAG} from '../src/combat-settings.js';

// Repeatable diagnostics, not a bot win-rate estimate. Projected capsule-union
// area measures exposure only; it does not establish visible mesh accuracy or
// equivalent player skill. All movement uses the live fixed-step world.
function exposure(selection){
 const p=makePlayer(0,selection);p.p=v3();let sum=0;
 for(let view=0;view<12;view++){
  p.phi=view*Math.PI/12;const shapes=hurtSegments(p);let samples=0;
  for(let x=-1;x<=1;x+=.025)for(let y=-.65;y<=1.2;y+=.025){
   if(shapes.some(s=>{const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y;
    const t=Math.max(0,Math.min(1,((x-s.a.x)*dx+(y-s.a.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(x-s.a.x-t*dx,y-s.a.y-t*dy)<=s.radius;}))samples++;
  }
  sum+=samples*.025**2;
 }
 return sum/12;
}
function run(selection,stamina,input,seconds=1.5){
 const w=new ArenaPhysics();w.reset(false,true,selection);const p=w.players[0];p.stamina=stamina;
 const start={...p.p};let peak=p.p.y,travel=0,last={...p.p},contacts=0;
 for(let i=0;i<Math.round(seconds/CONFIG.step);i++){
  w.step([input]);peak=Math.max(peak,p.p.y);travel+=Math.hypot(p.p.x-last.x,p.p.z-last.z);last={...p.p};contacts+=Number(p.staffGrounded);
 }
 const active={stamina:p.stamina,theta:p.theta,phi:p.phi,wt:p.wt,wp:p.wp};
 const releaseStart={...p.p};for(let i=0;i<90;i++)w.step([{}]);
 return {selection,initialStamina:stamina,input,activeSeconds:seconds,active,
  horizontalTravel:travel,peakRise:peak-start.y,supportSteps:contacts,
  releaseDistance:Math.hypot(p.p.x-releaseStart.x,p.p.z-releaseStart.z),finalStamina:p.stamina};
}
const characters=CHARACTER_CATALOG.map(c=>{const selection=PLAYABLE_LOADOUTS.find(p=>p.characterId===c.id);
 return {characterId:c.id,maxHealth:makePlayer(0,selection).maxHealth,projectedHurtArea:exposure(selection)};});
const baseline=characters.find(c=>c.characterId==='basic-fighter').projectedHurtArea;
for(const c of characters)c.relativeExposure=c.projectedHurtArea/baseline;
const rotor=new ArenaPhysics();rotor.reset(false,true,'beagle');
for(let i=0;i<900;i++)rotor.step([{skill:true}]);
const hover=new ArenaPhysics();hover.reset(false,true,{characterId:'orange-tabby',weaponId:'cat-paws'});hover.players[0].v.x=4;
for(let i=0;i<90;i++)hover.step([{}]);
const report={schemaVersion:1,trial:'coordinated-combat-v1',stamina:STAMINA,rotorResource:ROTOR_RESOURCE,
 hoverDrag:HOVER_DRAG,round:ROUND_RULES,characters,
 checks:{rotorFiveSecondStamina:rotor.players[0].stamina,rotorEnded:!rotor.players[0].skillActive,
  catHalfSecondRetention:hover.players[0].v.x/4,
  hammerHeadDamage:[8,10,100].map(speed=>({speed,shaft:damageForImpact(speed,0),head:Math.round(damageForImpact(speed,0)*WEAPONS.hammer.colliders[1].damageScale)}))},
 movement:PLAYABLE_LOADOUTS.flatMap(selection=>[200,40,0].flatMap(stamina=>
  [{theta:1},{theta:-1},{phi:1},{theta:1,phi:1}].map(input=>run(selection,stamina,input)))),
 limits:['Constructed movement trials do not establish matchup fairness.',
  'Counterbalanced human matches across players, loadouts and keyboard sides remain necessary.',
  'Optional passive-damage and extra hammer-braking trials remain conditional on match evidence.']};
const json=JSON.stringify(report,null,2)+'\n';
if(process.argv[2]){await writeFile(process.argv[2],json);console.log(JSON.stringify({path:process.argv[2],checks:report.checks,characters}));}
else process.stdout.write(json);
