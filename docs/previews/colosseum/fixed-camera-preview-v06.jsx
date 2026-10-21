// Isolated camera-height comparison. All game source/settings remain unchanged.
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PerspectiveCamera} from 'three';
import App from '/src/App.jsx';
import {GameSession} from '/src/game-session.js';
import {HISTORICAL_FIXED_CAMERA as FIXED_CAMERA,disableFixedDisplayRotation} from '/docs/previews/colosseum/fixed-camera-preview-helpers.js';

const session=new GameSession();
let choice='lower',frozen=false,rendererBinding=null;
const studies={
  current:{label:'Before · earlier game camera',height:FIXED_CAMERA.position[1]},
  lower:{label:'Proposed · lower and flatter',height:16},
  mild:{label:'Alternative · milder lowering',height:18},
};
const previewCameras=new Map(Object.entries(studies).filter(([,value])=>value.height).map(([key,value])=>{
  const camera=new PerspectiveCamera(FIXED_CAMERA.fov,1,FIXED_CAMERA.near,FIXED_CAMERA.far);
  camera.position.set(FIXED_CAMERA.position[0],value.height,FIXED_CAMERA.position[2]);
  camera.lookAt(...FIXED_CAMERA.target);camera.updateMatrixWorld();
  return [key,camera];
}));
const tick=session.tick.bind(session);
session.tick=delta=>tick(frozen&&session.state==='playing'&&session.countdown>=0?0:delta);

function selectedCamera(view,original){
  if(session.mode!=='duel-fixed')return original;
  const camera=previewCameras.get(choice),aspect=Math.max(1,view.width)/Math.max(1,view.height);
  if(camera.aspect!==aspect){camera.aspect=aspect;camera.updateProjectionMatrix();}
  return camera;
}

function prepare(view){
  if(!view||view.lowerCameraStudy)return;
  disableFixedDisplayRotation(view);
  view.lowerCameraStudy=true;
  if(rendererBinding?.renderer!==view.renderer){
    rendererBinding?.restore();
    const renderer=view.renderer,render=renderer.render;
    const wrapped=function(scene,original){
      const currentView=session.view;
      if(!currentView||currentView.renderer!==renderer)return render.call(renderer,scene,original);
      const selected=selectedCamera(currentView,original);
      if(selected!==original)currentView.prepareArenaCamera(selected,session.world.players);
      return render.call(renderer,scene,selected);
    };
    renderer.render=wrapped;
    rendererBinding={renderer,restore:()=>{if(renderer.render===wrapped)renderer.render=render;}};
  }
  const project=view.project.bind(view);
  view.project=(point,camera,viewport)=>project(point,selectedCamera(view,camera||view.camera),viewport);
}

function start(){
  session.goHome();
  session.setLoadouts([{characterId:'beagle',weaponId:'long-ears'},{characterId:'orange-tabby',weaponId:'cat-paws'}]);
  session.startRound('duel-fixed');
}

function LowerCameraStudy(){
  const [selected,setSelected]=useState(choice),[freeze,setFreeze]=useState(frozen),[status,setStatus]=useState({});
  useEffect(()=>{
    start();
    const timer=setInterval(()=>{
      prepare(session.view);
      const view=session.view,camera=view?selectedCamera(view,view.camera):null;
      const dx=camera?camera.position.x-FIXED_CAMERA.target[0]:0,dz=camera?camera.position.z-FIXED_CAMERA.target[2]:0;
      setStatus({environment:view?.environmentState||'loading',mode:session.mode,choice,
        position:camera?.position.toArray(),target:FIXED_CAMERA.target,fov:camera?.fov,
        downwardAngleDegrees:camera?Math.atan2(camera.position.y-FIXED_CAMERA.target[1],Math.hypot(dx,dz))*180/Math.PI:null,
        radius:session.world.arenaRadius,visualScale:view?.colosseum?.root.scale.x,
        fixed:session.mode==='duel-fixed',frozen,worldTime:session.world.time,
        cutaway:view?.colosseum?.lastOcclusion.get(camera?.uuid)||[],productCameraChanged:false});
    },80);
    return()=>{clearInterval(timer);rendererBinding?.restore();rendererBinding=null;};
  },[]);
  return <><App session={session}/><aside aria-label="Lower camera study" style={{position:'fixed',top:10,left:'50%',transform:'translateX(-50%)',zIndex:1000,padding:'9px 14px',border:'1px solid #c9bfa9',borderRadius:12,background:'#fffdf5f5',boxShadow:'0 3px 18px #29201718',font:'13px system-ui',color:'#373b31',maxWidth:'94vw'}}>
    <div style={{fontWeight:700,marginBottom:6}}>LOWER AND FLATTER · PREVIEW ONLY · game unchanged</div>
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Object.entries(studies).map(([key,value])=><button key={key} aria-pressed={key===selected} onClick={()=>{choice=key;setSelected(key);}} style={{padding:'7px 11px',borderRadius:7,border:'1px solid #a5a58e',background:key===selected?'#39594a':'#f5f1e7',color:key===selected?'white':'#373b31',cursor:'pointer'}}>{value.label}</button>)}<button onClick={()=>{frozen=!frozen;setFreeze(frozen);}}>{freeze?'Unfreeze pose':'Freeze pose'}</button><button onClick={start}>Reset comparison</button></div>
    <div style={{fontSize:11,marginTop:5}}>{status.environment} · same large arena, horizontal position and field of view · {freeze?'pose frozen for comparison':'W/S/A/D and arrow controls'}</div>
    <details style={{fontSize:10,marginTop:4}}><summary>Preview measurements</summary><pre id="fixed-camera-study-status" style={{maxHeight:140,overflow:'auto'}}>{JSON.stringify(status,null,2)}</pre></details>
  </aside></>;
}
createRoot(document.getElementById('root')).render(<LowerCameraStudy/>);
