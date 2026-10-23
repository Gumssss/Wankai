import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../src/game-session.js';
for(const winner of [0,1])test(`P${winner+1} can move after victory while defeated player stays frozen`,()=>{
 const game=new GameSession();game.sound.unlock=async()=>{};game.sound.tone=()=>{};
 game.startRound('duel');game.world.winner=winner;game.world.players[1-winner].health=0;game.finishRound();
 const dead=structuredClone(game.world.players[1-winner]);
 const before=game.world.players[winner].phi;
 game.keyDown(winner===0?'KeyD':'ArrowRight');game.keyDown(winner===0?'ArrowUp':'KeyW');
 for(let i=0;i<60;i++)game.tick(1/60);
 assert.equal(game.state,'result');assert.equal(game.world.winner,winner);
 assert.deepEqual(game.world.players[1-winner],dead);
 assert.notEqual(game.world.players[winner].phi,before);
 assert.equal(game.world.players[winner].health,100);assert.equal(game.world.events.length,0);
 game.startRound();assert.equal(game.world.winner,null);assert.ok(game.world.players.every(p=>p.health===100));
});
test('draw leaves both players frozen',()=>{
 const game=new GameSession();game.sound.tone=()=>{};game.world.winner=-1;game.finishRound();
 const before=structuredClone(game.world.players);game.keyDown('KeyW');game.tick(.05);
 assert.deepEqual(game.world.players,before);
});
