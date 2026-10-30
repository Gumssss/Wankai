// Separate fixed-camera study. Product source and duel-fixed physics stay intact.
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PerspectiveCamera} from 'three';
import App from '/src/App.jsx';
import {GameSession} from '/src/game-session.js';
import {disableFixedDisplayRotation} from '/docs/previews/colosseum/fixed-camera-preview-helpers.js';
import {ARENA_PROFILE} from '/src/arena-profile.js';

const session = new GameSession();
let choice = 'shared', frozen = false, openForeground = false, rendererBinding = null;
const tick = session.tick.bind(session);
session.tick = delta => tick(frozen && session.state === 'playing' && session.countdown >= 0 ? 0 : delta);
const studies = {
  current: {label:'Before · current fixed view'},
  shared: {label:'Proposed · low shared view', position:[0,5.39,16]},
  diagonal: {label:'Alternative · slight diagonal', position:[6,5.39,15]},
};
const previewCameras = new Map(Object.entries(studies).filter(([,v])=>v.position).map(([key,value])=>{
  const camera = new PerspectiveCamera(55,1,.1,120);
  camera.position.set(...value.position);camera.lookAt(0,1.4,0);camera.updateMatrixWorld();
  return [key,camera];
}));

function selectedCamera(view, original) {
  if(session.mode !== 'duel-fixed' || choice === 'current') return original;
  const camera = previewCameras.get(choice);
  const aspect = Math.max(1,view.width)/Math.max(1,view.height);
  if(camera.aspect !== aspect) {camera.aspect=aspect;camera.updateProjectionMatrix();}
  return camera;
}

function prepare(view) {
  if(!view || view.fixedCameraStudy) return;
  disableFixedDisplayRotation(view);
  view.fixedCameraStudy = true;
  // Render this page's actual scene through an alternate camera. The original
  // renderer is restored on teardown, and product camera classes are unchanged.
  if(rendererBinding?.renderer !== view.renderer) {
    rendererBinding?.restore();
    const renderer=view.renderer, render=renderer.render;
    const wrapped=function(scene,original) {
      const currentView=session.view;
      if(!currentView || currentView.renderer !== renderer) return render.call(renderer,scene,original);
      const selected=selectedCamera(currentView,original);
      if(selected !== original) {
        currentView.prepareArenaCamera(selected,session.world.players);
        // Deliberate shared-view cutaway: open the near arc even when its wall
        // misses the fighter-centre rays. Geometry and collisions stay intact.
        const arena=currentView.colosseum;
        if(arena && openForeground) {
          const tau=Math.PI*2,angle=(Math.atan2(-selected.position.z,selected.position.x)+tau)%tau;
          const index=Math.floor(angle/(Math.PI/4));
          const names=new Set(arena.lastOcclusion.get(selected.uuid) || []);
          for(const offset of [-1,0,1]) names.add(ARENA_PROFILE.sectorPrefix+String((index+offset+8)%8).padStart(2,'0'));
          for(const {mesh} of arena.sectors) if(names.has(mesh.name)){mesh.material.opacity=0;mesh.material.depthWrite=false;}
          arena.lastOcclusion.set(selected.uuid,[...names]);
        }
      }
      return render.call(renderer,scene,selected);
    };
    renderer.render=wrapped;
    rendererBinding={renderer,restore:()=>{if(renderer.render===wrapped)renderer.render=render;}};
  }
  const project=view.project.bind(view);
  view.project=(point,camera,viewport)=>project(point,selectedCamera(view,camera || view.camera),viewport);
}

function start() {
  session.goHome();
  session.setLoadouts([{characterId:'beagle',weaponId:'long-ears'},{characterId:'orange-tabby',weaponId:'cat-paws'}]);
  session.startRound('duel-fixed');
}

function FixedCameraStudy() {
  const [selected,setSelected]=useState(choice),[freeze,setFreeze]=useState(frozen),[openWall,setOpenWall]=useState(openForeground),[status,setStatus]=useState({});
  useEffect(()=>{
    start();
    const timer=setInterval(()=>{
      prepare(session.view);
      const view=session.view,camera=view?selectedCamera(view,view.camera):null;
      setStatus({environment:view?.environmentState || 'loading',mode:session.mode,radius:session.world.arenaRadius,
        cameras:1,fixed:true,choice,position:camera?.position.toArray(),target:choice==='current'?[0,0,-.3]:[0,1.4,0],fov:camera?.fov || null,
        projection:camera?.isPerspectiveCamera?'perspective':'orthographic',openForeground,worldTime:session.world.time,
        cutaway:view?.colosseum?.lastOcclusion.get(camera?.uuid) || []});
    },80);
    return()=>{clearInterval(timer);rendererBinding?.restore();rendererBinding=null;};
  },[]);
  return <><App session={session}/><style>{'.arena-coordinate{display:none}'}</style><aside aria-label="Fixed camera study" style={{position:'fixed',top:10,left:'50%',transform:'translateX(-50%)',zIndex:1000,padding:'9px 14px',border:'1px solid #c9bfa9',borderRadius:12,background:'#fffdf5f5',boxShadow:'0 3px 18px #29201718',font:'13px system-ui',color:'#373b31',maxWidth:'94vw'}}>
    <div style={{fontWeight:700,marginBottom:6}}>ONE FIXED CAMERA · PREVIEW ONLY · game unchanged</div>
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Object.entries(studies).map(([key,value])=><button key={key} aria-pressed={key===selected} onClick={()=>{choice=key;setSelected(key);}} style={{padding:'7px 11px',borderRadius:7,border:'1px solid #a5a58e',background:key===selected?'#39594a':'#f5f1e7',color:key===selected?'white':'#373b31',cursor:'pointer'}}>{value.label}</button>)}<button aria-pressed={openWall} onClick={()=>{openForeground=!openForeground;setOpenWall(openForeground);}}>{openWall?'Restore foreground':'Open foreground wall'}</button><button onClick={()=>{frozen=!frozen;setFreeze(frozen);}}>{freeze?'Unfreeze pose':'Freeze pose'}</button><button onClick={start}>Reset fixed duel</button></div>
    <div style={{fontSize:11,marginTop:5}}>{status.environment} · one shared view · {freeze?'pose frozen for comparison':'existing W/S/A/D and arrow controls'} · camera stays fixed, looking at the arena centre</div>
    <details style={{fontSize:10,marginTop:4}}><summary>Preview measurements</summary><pre id="fixed-camera-study-status" style={{maxHeight:140,overflow:'auto'}}>{JSON.stringify(status,null,2)}</pre></details>
  </aside></>;
}
createRoot(document.getElementById('root')).render(<FixedCameraStudy/>);
