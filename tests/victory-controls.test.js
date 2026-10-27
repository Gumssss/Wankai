import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../src/game-session.js';

const quiet=game=>{game.sound.unlock=async()=>{};game.sound.tone=()=>{};return game;};

test('the winner can move after victory while the defeated fighter stays frozen',()=>{
 for(const winner of [0,1]){
  const game=quiet(new GameSession());
  game.startRound('ai');game.world.winner=winner;game.world.players[1-winner].health=0;game.finishRound();
  const dead=structuredClone(game.world.players[1-winner]);
  const before=game.world.players[winner].phi;
  // Drive the winner directly so either side can be checked without remote input.
  game.getInputs=()=>{const inputs=[{},{}];inputs[winner]={theta:1,phi:1};return inputs;};
  for(let i=0;i<60;i++)game.tick(1/60);
  assert.equal(game.state,'result');assert.equal(game.world.winner,winner);
  assert.deepEqual(game.world.players[1-winner],dead);
  assert.notEqual(game.world.players[winner].phi,before);
  assert.equal(game.world.players[winner].health,100);assert.equal(game.world.events.length,0);
  game.startRound();assert.equal(game.world.winner,null);assert.ok(game.world.players.every(p=>p.health===100));
 }
});

test('a defeated local player cannot press keys after the round',()=>{
 const game=quiet(new GameSession());
 game.startRound('ai');game.world.winner=1;game.finishRound();
 game.keyDown('KeyW');assert.deepEqual(game.getSnapshot().pressed,[]);
});

test('draw leaves both players frozen',()=>{
 const game=quiet(new GameSession());game.world.winner=-1;game.finishRound();
 const before=structuredClone(game.world.players);game.keyDown('KeyW');game.tick(.05);
 assert.deepEqual(game.world.players,before);
});
