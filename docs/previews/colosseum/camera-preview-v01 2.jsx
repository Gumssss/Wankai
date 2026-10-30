// Unbundled, local comparison of previous and current camera framing.
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '/src/App.jsx';
import {GameSession} from '/src/game-session.js';
import {FREE_CAMERA, SPLIT_CAMERA, resetFreeCamera} from '/src/free-camera.js';

const session = new GameSession();
let proposal = 'closer', freezePose = false;
const tick = session.tick.bind(session);
session.tick = delta => tick(freezePose && session.state === 'playing' && session.countdown >= 0 ? 0 : delta);
const originalSplitCamera = {...SPLIT_CAMERA, pitch:0.35, distance:10.5};
const studies = {
  current: {label:'Previous', pitch:originalSplitCamera.pitch, distance:originalSplitCamera.distance},
  wide: {label:'Previous · farther view', pitch:0.15, distance:24},
  closer: {label:'Current · closer', pitch:SPLIT_CAMERA.pitch, distance:SPLIT_CAMERA.distance},
  raised: {label:'Previous raised view', pitch:0.68, distance:24},
  high: {label:'Higher overview', pitch:0.82, distance:30},
};

// Only this page wraps its own view instance. No source camera or solver edits.
function prepare(view) {
  if (view.cameraStudy) return;
  view.cameraStudy = true;
  const update = view.update.bind(view);
  let applied = null;
  view.update = (...args) => {
    if (applied !== proposal) {
      for (const rig of [...view.duelCameras, ...(view.soloCamera ? [view.soloCamera] : [])]) {
        const base = rig.frameFighter ? originalSplitCamera : FREE_CAMERA;
        const study = studies[proposal];
        rig.settings = proposal === 'current' ? base : {...base, pitch:study.pitch, distance:study.distance};
        rig.pitch = rig.settings.pitch;
        resetFreeCamera(rig);
      }
      applied = proposal;
    }
    update(...args);
  };
}

function start(mode = 'duel') {
  session.goHome();
  session.setLoadouts([{characterId:'beagle',weaponId:'long-ears'}, {characterId:'orange-tabby',weaponId:'cat-paws'}]);
  session.startRound(mode);
}

function CameraStudy() {
  const [choice, setChoice] = useState(proposal);
  const [frozen, setFrozen] = useState(freezePose);
  const [status, setStatus] = useState('Loading actual game…');
  useEffect(() => {
    start();
    const timer = setInterval(() => {
      if (session.view) prepare(session.view);
      setStatus(`${session.view?.environmentState || 'loading'} · ${session.mode === 'duel' ? 'split screen' : 'solo'} · preview only`);
    }, 80);
    return () => clearInterval(timer);
  }, []);
  const select = key => {proposal = key; setChoice(key);};
  return <><App session={session}/><aside aria-label="Camera preview controls" style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:1000,padding:'9px 14px',border:'1px solid #c9bfa9',borderRadius:12,background:'#fffdf5f5',boxShadow:'0 3px 18px #29201718',font:'13px system-ui',color:'#373b31',maxWidth:'90vw'}}>
    <div style={{fontWeight:700,marginBottom:6}}>CAMERA COMPARISON · closer view applied</div>
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Object.entries(studies).map(([key,study])=><button key={key} aria-pressed={key===choice} onClick={()=>select(key)} style={{padding:'7px 11px',borderRadius:7,border:'1px solid #a5a58e',background:key===choice?'#39594a':'#f5f1e7',color:key===choice?'white':'#373b31',cursor:'pointer'}}>{study.label}</button>)}<button onClick={()=>{freezePose=!freezePose;setFrozen(freezePose);}}>{frozen?'Unfreeze pose':'Freeze pose'}</button><button onClick={()=>start('duel')}>Reset split</button><button onClick={()=>start('solo')}>Solo</button></div>
    <div role="status" style={{fontSize:11,marginTop:5}}>{status} · {frozen?'matched pose frozen for comparison':'existing play and camera controls work'}</div>
  </aside></>;
}
createRoot(document.getElementById('root')).render(<CameraStudy/>);
