import {MATCH_ARENA_SCALE} from '../src/physics.js';
import {GameSession} from '../src/game-session.js';

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
  world.players[1].theta=.28;
  return world;
}

// A silent session. By default the AI opponent stands still so tests control both fighters.
export const silentAudio=()=>({enabled:true,unlock:async()=>{},tick(){},impact(){},tone(){}});
export function quietSession({ai=false}={}){
  return new GameSession({audio:silentAudio(),randomOpponent:false,...(ai?{}:{makeAi:()=>({think:()=>({theta:0,phi:0})})})});
}
