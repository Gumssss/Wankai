// Real React/App input + HUD check in Electron. Fixtures use the existing
// debug session API; keyboard events go through App's registered listeners.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.whenReady().then(async()=>{
 const w=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{backgroundThrottling:false}});
 w.webContents.setAudioMuted(true);const errors=[];
 w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const js=s=>w.webContents.executeJavaScript(s);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async expression=>{for(let i=0;i<300;i++){if(await js(expression))return;await wait(50);}throw Error('Timed out: '+expression);};
 const key=(code,type='keydown')=>js(`window.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true}))`);
 let result=0;
 try{
  await w.loadURL('http://127.0.0.1:5196/');await until('!!window.__arena?.session.renderer');
  await key('Enter');await key('Enter','keyup');await wait(300);
  const out=path.resolve('assets/concepts/skills-runtime-v01');const records=[];
  for(const id of ['cr7','mean-girl']){
   await js(`(()=>{const s=__arena.session;s.goHome();s.randomOpponent=false;s.makeAi=()=>({think:()=>({}),reset(){}});s.setLoadouts([{characterId:'${id}',weaponId:'${id==='cr7'?'soccer-ball':'crowned-heart'}'},{characterId:'stickman',weaponId:'sword'}]);s.startRound();})()`);
   await until("__arena.session.state==='playing'");
   // Place the idle opponent safely away so UI activation is not interrupted.
   await js(`(()=>{const s=__arena.session;s.world.players[1].p.x=12;s.world.players[1].p.z=8;s.world.players[0].grounded=true;})()`);
   await key('KeyF');await key('KeyF','keyup');if(id==='cr7')await key('KeyW');
   await until("__arena.session.world.players[0].abilityPhase==='active'");await wait(400);
   const active=await js('({snapshot:__arena.snapshot(),hud:document.querySelector(".skill-text")?.textContent,errors:__arena.session.error})');
   assert.equal(active.snapshot.players[0].abilityPhase,'active');assert.equal(active.errors,null);
   if(id==='cr7'){assert.match(active.hud,/WASD/);assert.equal(active.snapshot.projectiles[0].type,'soccer');}
   fs.writeFileSync(path.join(out,id+'-app.png'),(await w.webContents.capturePage()).toPNG());
   await until("__arena.session.world.players[0].abilityPhase==='idle'");
   if(id==='cr7'){
    assert(await js('__arena.session.world.players[0].releaseGate'));
    await key('KeyW','keyup');await until('__arena.session.world.players[0].releaseGate===false');
    await key('KeyW');await until('__arena.session.world.players[0].abilityAttackGate===false');
    assert.equal(await js('__arena.session.world.players[0].abilityAttackGate'),false);await key('KeyW','keyup');
   }
   records.push({character:id,hud:active.hud,active:active.snapshot.players[0].abilityPhase,projectiles:active.snapshot.projectiles.length,renderer:await js('__arena.rendererInfo()')});
  }
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(path.join(out,'app-check.json'),JSON.stringify({records,errors,note:'Scripted real App keyboard/HUD check, not manual play'},null,2));
  console.log(JSON.stringify(records));
 }catch(e){console.error(e);result=1;}
 app.exit(result);
});
