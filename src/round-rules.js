import {ROUND_RULES} from './combat-settings.js';

export function pressureAt(time,radius,enabled=true){
  const progress=enabled?Math.max(0,Math.min(1,(time-ROUND_RULES.pressureStart)/ROUND_RULES.contractionTime)):0;
  return {active:enabled&&time>=ROUND_RULES.pressureStart,
    radius:radius*(1-(1-ROUND_RULES.finalRadiusFraction)*progress),
    startsIn:Math.max(0,ROUND_RULES.pressureStart-time)};
}

// Called once after all chronological contacts, never by a collision slice.
// Pressure is continuous health loss and does not become an attack, hit pause
// or delayed contact episode. Both sides receive it before victory is decided.
export function updateRound(world,dt){
  const competitive=!world.practice&&!world.solo;
  world.pressure=pressureAt(world.time,world.arenaRadius,competitive);
  if(!competitive)return;
  // A chronological knockout has already finished combat this tick. Later
  // environmental loss cannot retroactively turn it into a trade.
  const defeated=world.players.map(p=>p.health<=0);
  if(defeated.some(Boolean)){
    world.winner=defeated[0]&&defeated[1]?-1:defeated[0]?1:0;
    world.endReason='knockout';return;
  }
  let pressureDefeat=false;
  const pressureDt=Math.min(dt,Math.max(0,world.time-ROUND_RULES.pressureStart));
  for(const p of world.players){
    const outside=world.pressure.active&&Math.hypot(p.p.x,p.p.z)>world.pressure.radius;
    if(!outside){p.zoneOutside=0;continue;}
    const before=p.zoneOutside;p.zoneOutside+=pressureDt;
    const damageTime=Math.max(0,p.zoneOutside-ROUND_RULES.outsideGrace)-Math.max(0,before-ROUND_RULES.outsideGrace);
    const wasAlive=p.health>0;
    const next=p.health-damageTime*p.maxHealth*ROUND_RULES.outsideDamageFraction;
    p.health=next<1e-8?0:next;
    pressureDefeat ||= wasAlive&&p.health<=0;
  }
  const dead=world.players.map(p=>p.health<=0);
  if(dead.some(Boolean)){
    world.winner=dead[0]&&dead[1]?-1:dead[0]?1:0;
    world.endReason=pressureDefeat?'pressure':'knockout';
  }else if(world.time>=ROUND_RULES.duration-1e-8){
    const delta=world.players[0].health/world.players[0].maxHealth-world.players[1].health/world.players[1].maxHealth;
    world.winner=Math.abs(delta)<1e-6?-1:delta>0?0:1;
    world.endReason='timeout';
  }
}
