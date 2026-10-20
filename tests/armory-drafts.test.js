import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LOADOUTS,PLAYABLE_LOADOUTS} from '../src/loadouts.js';
import {createDrafts,updateDraft,toggleReady,requiredPlayers,canConfirm,confirmedLoadouts} from '../src/armory-drafts.js';

const basic=weaponId=>({characterId:'basic-fighter',weaponId});
const beagle=weaponId=>({characterId:'beagle',weaponId});
const cat={characterId:'orange-tabby',weaponId:'cat-paws'};
const readyBoth=drafts=>toggleReady(toggleReady(drafts,0),1);

test('opening selection creates two independent unready drafts without mutating committed loadouts',()=>{
 const committed=[Object.freeze(beagle('sword')),Object.freeze({...cat})];
 const drafts=createDrafts(committed);
 assert.deepEqual(drafts,[{...committed[0],ready:false},{...committed[1],ready:false}]);
 assert.notEqual(drafts[0],committed[0]);assert.notEqual(drafts[1],committed[1]);
 const changed=updateDraft(drafts,0,{weaponId:'hammer'});
 assert.equal(changed[0].weaponId,'hammer');assert.equal(drafts[0].weaponId,'sword');
 assert.deepEqual(committed,[beagle('sword'),cat]);
});

test('both readiness states are independent and final confirmation waits for both players',()=>{
 const drafts=createDrafts(DEFAULT_LOADOUTS),p1Ready=toggleReady(drafts,0);
 assert.equal(p1Ready[0].ready,true);assert.equal(p1Ready[1].ready,false);
 assert.equal(canConfirm(p1Ready,'duel'),false);assert.equal(confirmedLoadouts(p1Ready,'duel'),null);
 const both=toggleReady(p1Ready,1);
 assert.equal(canConfirm(both,'duel'),true);
 assert.deepEqual(confirmedLoadouts(both,'duel'),DEFAULT_LOADOUTS);
 assert.deepEqual(Object.keys(confirmedLoadouts(both,'duel')[0]).sort(),['characterId','weaponId']);
 const unready=toggleReady(both,0);
 assert.equal(unready[0].ready,false);assert.equal(unready[1].ready,true);
 assert.equal(canConfirm(unready,'duel'),false);
});

test('changing one player invalidates only that readiness, while reselecting the same choice keeps it',()=>{
 const both=readyBoth(createDrafts([beagle('sword'),cat]));
 const unchanged=updateDraft(both,0,{characterId:'beagle',weaponId:'sword'});
 assert.equal(unchanged[0].ready,true);assert.equal(unchanged[1].ready,true);
 const changed=updateDraft(both,0,{weaponId:'long-ears'});
 assert.equal(changed[0].weaponId,'long-ears');assert.equal(changed[0].ready,false);
 assert.deepEqual(changed[1],both[1]);assert.equal(changed[1].ready,true);
 assert.equal(both[0].ready,true,'draft updates must not mutate the prior state');
});

test('character changes retain compatible equipment and clear incompatible signatures',()=>{
 const swordReady=readyBoth(createDrafts([basic('sword'),cat]));
 const beagleSword=updateDraft(swordReady,0,{characterId:'beagle'});
 assert.deepEqual(beagleSword[0],{...beagle('sword'),ready:false});assert.equal(beagleSword[1].ready,true);
 const ears=readyBoth(createDrafts([beagle('long-ears'),basic('hammer')]));
 const basicAgain=updateDraft(ears,0,{characterId:'basic-fighter'});
 assert.deepEqual(basicAgain[0],{characterId:'basic-fighter',weaponId:null,ready:false});
 assert.equal(basicAgain[1].ready,true);
 assert.equal(canConfirm(basicAgain,'duel'),false);
});

test('changing to the cat clears ordinary equipment and requires its approved paws before Ready',()=>{
 const both=readyBoth(createDrafts([beagle('sword'),basic('polearm')]));
 const selectingCat=updateDraft(both,0,{characterId:'orange-tabby'});
 assert.deepEqual(selectingCat[0],{characterId:'orange-tabby',weaponId:null,ready:false});
 assert.equal(selectingCat[1].ready,true);
 assert.equal(toggleReady(selectingCat,0)[0].ready,false);
 assert.equal(confirmedLoadouts(selectingCat,'duel'),null);
 const equipped=updateDraft(selectingCat,0,{weaponId:'cat-paws'});
 assert.equal(equipped[0].ready,false);assert.equal(equipped[1].ready,true);
 const complete=toggleReady(equipped,0);
 assert.deepEqual(confirmedLoadouts(complete,'duel'),[cat,basic('polearm')]);
});

test('invalid character, weapon, owner and player updates cannot corrupt a ready selection',()=>{
 const both=readyBoth(createDrafts([beagle('sword'),cat]));
 for(const [id,patch]of [[0,{characterId:'missing'}],[0,{weaponId:'missing'}],
  [0,{weaponId:'cat-paws'}],[1,{weaponId:'long-ears'}],[1,{weaponId:'sword'}],
  [-1,{weaponId:'hammer'}],[2,{weaponId:'hammer'}]]){
  assert.equal(updateDraft(both,id,patch),both,JSON.stringify({id,patch}));
 }
 for(const id of [-1,2])assert.equal(toggleReady(both,id),both);
 assert.deepEqual(confirmedLoadouts(both,'duel'),[beagle('sword'),cat]);
});

test('solo confirms only P1 while preserving the unready P2 configuration; other modes require both',()=>{
 assert.deepEqual(requiredPlayers('solo'),[0]);
 for(const mode of ['duel','duel-fixed','practice','browse'])assert.deepEqual(requiredPlayers(mode),[0,1]);
 const drafts=toggleReady(createDrafts([cat,beagle('long-ears')]),0);
 assert.equal(canConfirm(drafts,'solo'),true);
 assert.deepEqual(confirmedLoadouts(drafts,'solo'),[cat,beagle('long-ears')]);
 assert.equal(drafts[1].ready,false);
 for(const mode of ['duel','duel-fixed','practice','browse']){
  assert.equal(canConfirm(drafts,mode),false);assert.equal(confirmedLoadouts(drafts,mode),null);
 }
});

test('every supported pairing can confirm together without changing either player configuration',()=>{
 for(const first of PLAYABLE_LOADOUTS)for(const second of PLAYABLE_LOADOUTS){
  const drafts=createDrafts([first,second]);
  assert.equal(confirmedLoadouts(drafts,'duel'),null);
  const both=readyBoth(drafts);
  assert.deepEqual(confirmedLoadouts(both,'duel'),[first,second]);
  assert.equal(drafts[0].ready,false);assert.equal(drafts[1].ready,false);
 }
});
