import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '/src/App.jsx';
import {GameSession} from '/src/game-session.js';

const session=new GameSession();
let patterned=true,frozen=false;
const tick=session.tick.bind(session);
session.tick=delta=>tick(frozen&&session.state==='playing'&&session.countdown>=0?0:delta);
function start(mode='duel-fixed'){
  session.goHome();
  session.setLoadouts([{characterId:'beagle',weaponId:'long-ears'},{characterId:'orange-tabby',weaponId:'cat-paws'}]);
  session.startRound(mode);
}
function FloorStudy(){
  const [selected,setSelected]=useState(patterned),[freeze,setFreeze]=useState(frozen),[mode,setMode]=useState('duel-fixed'),[status,setStatus]=useState({});
  useEffect(()=>{
    start();
    const timer=setInterval(()=>{
      const view=session.view;
      view?.setArenaFloorPatternEnabled(patterned);
      const texture=view?.colosseum?.floorAppearance?.texture;
      setStatus({mode:session.mode,environment:view?.environmentState,floorTexture:view?.floorTextureState,
        patterned:view?.colosseum?.floorAppearance?.enabled,textureSize:texture?[texture.image?.width,texture.image?.height]:null,
        position:view?.camera.position.toArray(),displayRotation:view?.fixedDisplayRotation,arenaRadius:session.world.arenaRadius,
        visualScale:view?.colosseum?.root.scale.x,rendererMemory:view?{...view.renderer.info.memory}:null,
        frozen,worldTime:session.world.time,players:session.world.players.map(p=>({id:p.id,p:{...p.p},phi:p.phi}))});
    },80);
    return()=>clearInterval(timer);
  },[]);
  return <><App session={session}/><aside aria-label="Floor comparison" style={{position:'fixed',top:8,left:'50%',transform:'translateX(-50%)',zIndex:1000,padding:'10px 14px',border:'1px solid #c9bfa9',borderRadius:12,background:'#fffdf5f5',boxShadow:'0 3px 18px #29201718',font:'12px system-ui',color:'#373b31',maxWidth:'94vw'}}>
    <div style={{fontWeight:700,marginBottom:6}}>ROMAN FLOOR · ACTUAL GAME COMPARISON</div>
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[[false,'Original floor'],[true,'Patterned floor']].map(([value,label])=><button key={label} aria-pressed={selected===value} onClick={()=>{patterned=value;setSelected(value);}} style={{padding:'6px 10px',borderRadius:6,border:'1px solid #a5a58e',background:selected===value?'#39594a':'#f5f1e7',color:selected===value?'white':'#373b31'}}>{label}</button>)}
      <button onClick={()=>{frozen=!frozen;setFreeze(frozen);}}>{freeze?'Unfreeze pose':'Freeze pose'}</button><button onClick={()=>start(mode)}>Reset comparison</button>
      <select aria-label="Game mode" value={mode} onChange={e=>{setMode(e.target.value);start(e.target.value);}}><option value="duel-fixed">Fixed camera</option><option value="duel">Split screen</option><option value="solo">Solo orbit</option><option value="practice">Practice</option></select>
    </div>
    <div style={{fontSize:10,marginTop:5}}>{status.environment} · floor texture {status.floorTexture} · {freeze?'matched pose frozen':'live controls'} · same model, camera and physics</div>
    <details style={{fontSize:10,marginTop:4}}><summary>Comparison measurements</summary><pre id="floor-study-status" style={{maxHeight:130,overflow:'auto'}}>{JSON.stringify(status,null,2)}</pre></details>
  </aside></>;
}
createRoot(document.getElementById('root')).render(<FloorStudy/>);
