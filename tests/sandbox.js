import {MATCH_ARENA_SCALE} from '../src/physics.js';
import {isPawLoadout} from '../src/loadouts.js';

// One centred fighter on the match-sized arena, for controller and contact checks.
export function sandbox(world,loadout='polearm',arenaScale=MATCH_ARENA_SCALE){
  world.reset(loadout,'polearm',{fighters:1,arenaScale});
  return world;
}

// Two fighters at close range in a round that never ends, for combat checks.
export function sparring(world,first='polearm',second='polearm',arenaScale=1){
  world.reset(first,second,{endless:true,arenaScale});
  world.players[0].p.x=-1.45;
  world.players[1].p.x=1.45;
  if(!isPawLoadout(world.players[1]))world.players[1].theta=.28;
  return world;
}
