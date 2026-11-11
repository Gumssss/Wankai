import test from 'node:test';
import assert from 'node:assert/strict';
import { quietSession } from './sandbox.js';

const hit = (overrides={}) => ({type:'hit',source:'weapon',weapon:'sword',attacker:0,target:1,damage:24,
 point:{x:1,y:1,z:0},normal:{x:1,y:0,z:0},strength:.8,speed:7,acceleration:12,turnShare:0,...overrides});

test('damage presentation flashes the target and freezes its effect clocks during offline pause',()=>{
 const session=quietSession();session.state='playing';
 const before=session.world.players.map(p=>({health:p.health,p:{...p.p},v:{...p.v}}));
 session.impact(hit());
 assert.equal(session.effects[0].kind,'direct');assert.equal(session.effects[0].heavy,true);
 assert.deepEqual(session.healthFlashes,[0,.15]);
 assert.deepEqual(session.world.players.map(p=>({health:p.health,p:{...p.p},v:{...p.v}})),before);
 session.pause();const life=session.effects[0].life;session.tick(.06);
 assert.equal(session.effects[0].life,life);assert.equal(session.healthFlashes[1],.15);
 session.resume();session.tick(.06);assert(session.effects[0].life<life);assert(session.healthFlashes[1]<.15);
});

test('stack cues and even large bleed ticks do not produce a direct-hit flash or hitstop',()=>{
 const session=quietSession();session.world.players[1].bleedStacks=2;
 session.impact({type:'bleed-stack',source:'perfume',attacker:0,target:1,stacks:2,point:{x:1,y:1,z:0}});
 assert.deepEqual(session.makeSnapshot().bleedStacks,[0,2]);
 assert.equal(session.effects[0].text,'流血 ×2');assert.equal(session.effects[0].damage,undefined);
 session.impact(hit({source:'bleed',damage:30,strength:0}));
 assert.equal(session.freeze,0);assert.deepEqual(session.healthFlashes,[0,0]);
 assert.equal(session.effects[1].kind,'bleed');assert.equal(session.effects[1].heavy,false);
});

test('cosmetic label limit retains recent hits and rematch clears damage presentation',()=>{
 const session=quietSession();
 for(let i=1;i<=30;i++)session.pushEffect({damage:i,life:.95,maxLife:.95});
 assert.equal(session.effects.length,12);assert.equal(session.effects.at(-1).damage,30);
 session.startRound('ai');assert.deepEqual(session.effects,[]);assert.deepEqual(session.healthFlashes,[0,0]);
});


test('direct numbers merge per target without turning small hits into a heavy cue; bleed remains separate',()=>{
 const session=quietSession();session.impact(hit({damage:8}));const id=session.effects[0].id;
 session.tick(.06);session.impact(hit({damage:8}));session.impact(hit({damage:8}));
 assert.equal(session.effects.length,1);assert.equal(session.effects[0].damage,24);
 assert.equal(session.effects[0].id,id);assert.equal(session.effects[0].heavy,false);
 session.impact(hit({source:'bleed',damage:2}));session.impact(hit({target:0,damage:10}));
 assert.equal(session.effects.length,3);
 for(let i=0;i<8;i++)session.tick(.06);
 session.impact(hit({damage:5}));assert.equal(session.effects.length,4);
 assert.equal(session.effects.at(-1).damage,5);
});

test('finishing cue delays presentation only, plays result sound once, and clears on home/rematch',()=>{
 const session=quietSession(),sounds=[];session.sound.result=x=>sounds.push(x);
 session.state='playing';session.world.winner=0;session.finishRound();
 assert.equal(session.state,'result');assert.equal(session.world.winner,0);
 assert.equal(session.finishTime,.6);assert.deepEqual(sounds,[]);
 session.finishRound();assert.equal(session.finishTime,.6);
 for(let i=0;i<12;i++)session.tick(.06);
 assert.equal(session.finishTime,0);assert.deepEqual(sounds,['win']);
 session.goHome();assert.equal(session.finishTime,0);
 session.state='playing';session.world.winner=1;session.finishRound();session.startRound('ai');
 assert.equal(session.finishTime,0);assert.deepEqual(sounds,['win']);
});
