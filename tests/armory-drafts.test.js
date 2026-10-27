import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LOADOUTS,PLAYABLE_LOADOUTS} from '../src/loadouts.js';
import {createDrafts,updateDraft,toggleReady,visiblePlayers,canConfirm,confirmedLoadouts} from '../src/armory-drafts.js';

const basic=weaponId=>({characterId:'basic-fighter',weaponId});
const beagle=weaponId=>({characterId:'beagle',weaponId});
const cat={characterId:'orange-tabby',weaponId:'cat-paws'};

test('opening selection creates unready drafts without mutating committed loadouts',()=>{
 const committed=[Object.freeze(beagle('sword')),Object.freeze({...cat})];
 const drafts=createDrafts(committed);
 assert.deepEqual(drafts,[{...committed[0],ready:false},{...committed[1],ready:false}]);
 assert.notEqual(drafts[0],committed[0]);assert.notEqual(drafts[1],committed[1]);
 const changed=updateDraft(drafts,0,{weaponId:'hammer'});
 assert.equal(changed[0].weaponId,'hammer');assert.equal(drafts[0].weaponId,'sword');
 assert.deepEqual(committed,[beagle('sword'),cat]);
});

test('only the local player readies; an AI match also needs a valid AI loadout',()=>{
 assert.deepEqual(visiblePlayers('ai'),[0,1]);assert.deepEqual(visiblePlayers('browse'),[0]);
 const drafts=createDrafts(DEFAULT_LOADOUTS);
 assert.equal(toggleReady(drafts,1),drafts,'the AI slot has no ready toggle');
 for(const mode of ['ai','browse'])assert.equal(canConfirm(drafts,mode),false);
 const ready=toggleReady(drafts,0);
 for(const mode of ['ai','browse']){
  assert.equal(canConfirm(ready,mode),true);
  assert.deepEqual(confirmedLoadouts(ready,mode),DEFAULT_LOADOUTS);
 }
 assert.deepEqual(Object.keys(confirmedLoadouts(ready,'ai')[0]).sort(),['characterId','weaponId']);
 const incompleteAi=updateDraft(ready,1,{characterId:'orange-tabby'});
 assert.equal(canConfirm(incompleteAi,'ai'),false);assert.equal(confirmedLoadouts(incompleteAi,'ai'),null);
 assert.equal(canConfirm(incompleteAi,'browse'),true,'browsing ignores the AI slot');
});

test('changing the local fighter clears readiness, while reselecting the same choice keeps it',()=>{
 const ready=toggleReady(createDrafts([beagle('sword'),cat]),0);
 assert.equal(updateDraft(ready,0,{characterId:'beagle',weaponId:'sword'})[0].ready,true);
 const changed=updateDraft(ready,0,{weaponId:'long-ears'});
 assert.equal(changed[0].weaponId,'long-ears');assert.equal(changed[0].ready,false);
 assert.deepEqual(changed[1],ready[1]);
 assert.equal(ready[0].ready,true,'draft updates must not mutate the prior state');
});

test('character changes retain compatible equipment and clear incompatible signatures',()=>{
 const drafts=createDrafts([basic('sword'),cat]);
 assert.deepEqual(updateDraft(drafts,0,{characterId:'beagle'})[0],{...beagle('sword'),ready:false});
 const ears=createDrafts([beagle('long-ears'),basic('hammer')]);
 const basicAgain=updateDraft(ears,0,{characterId:'basic-fighter'});
 assert.deepEqual(basicAgain[0],{characterId:'basic-fighter',weaponId:null,ready:false});
 assert.equal(toggleReady(basicAgain,0),basicAgain);
 assert.equal(canConfirm(basicAgain,'ai'),false);
});

test('changing to the cat clears ordinary equipment and requires its approved paws before Ready',()=>{
 const selectingCat=updateDraft(createDrafts([beagle('sword'),basic('polearm')]),0,{characterId:'orange-tabby'});
 assert.deepEqual(selectingCat[0],{characterId:'orange-tabby',weaponId:null,ready:false});
 assert.equal(toggleReady(selectingCat,0)[0].ready,false);
 const complete=toggleReady(updateDraft(selectingCat,0,{weaponId:'cat-paws'}),0);
 assert.deepEqual(confirmedLoadouts(complete,'ai'),[cat,basic('polearm')]);
});

test('invalid character, weapon, owner and slot updates cannot corrupt a ready selection',()=>{
 const ready=toggleReady(createDrafts([beagle('sword'),cat]),0);
 for(const [id,patch]of [[0,{characterId:'missing'}],[0,{weaponId:'missing'}],
  [0,{weaponId:'cat-paws'}],[1,{weaponId:'long-ears'}],[1,{weaponId:'sword'}],
  [-1,{weaponId:'hammer'}],[2,{weaponId:'hammer'}]]){
  assert.equal(updateDraft(ready,id,patch),ready,JSON.stringify({id,patch}));
 }
 for(const id of [-1,2])assert.equal(toggleReady(ready,id),ready);
 assert.deepEqual(confirmedLoadouts(ready,'ai'),[beagle('sword'),cat]);
});

test('every supported pairing can confirm an AI match without changing either configuration',()=>{
 for(const first of PLAYABLE_LOADOUTS)for(const second of PLAYABLE_LOADOUTS){
  const drafts=createDrafts([first,second]);
  assert.equal(confirmedLoadouts(drafts,'ai'),null);
  assert.deepEqual(confirmedLoadouts(toggleReady(drafts,0),'ai'),[first,second]);
  assert.equal(drafts[0].ready,false);
 }
});
