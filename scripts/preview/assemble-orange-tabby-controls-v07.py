"""Present the accepted v06 behavior as one complete movement-matrix video.

Reuses unchanged actual-model v06 render frames and functional HUD. No new
physics, character geometry, camera path or animation is generated.
"""
from pathlib import Path
import json,subprocess,sys,hashlib
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'output/orange-tabby-v06';OUT=ROOT/'output/orange-tabby-v07';OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'assets/concepts/orange-tabby/motion-v07';DATA.mkdir(parents=True,exist_ok=True)
DEST=ROOT/'docs/previews/orange-tabby';FPS=30
rows=json.loads((SOURCE/'frame-captions.json').read_text())
chapters={c['id']:c for c in json.loads((ROOT/'assets/concepts/orange-tabby/motion-v06/chapters.json').read_text())}
order=['w','s','a','d','wa','wd','sa','sd','s-slow','release-reverse','yaw-reverse','opposites','landing','hover-idle']
names={'w':'W / forward paw drive','s':'S / paw-floor support lifts the cat','a':'A / left heading sweep','d':'D / right heading sweep',
 'wa':'W + A / forward drive and left steering','wd':'W + D / forward drive and right steering',
 'sa':'S + A / reverse drive and left steering','sd':'S + D / reverse drive and right steering',
 's-slow':'S lift / same accepted support event, 0.25x'}
main=[];frames=[];clock=0
for index,id in enumerate(order):
 original=chapters[id];selected=[r for r in rows if r['shot_id']==id]
 assert len(selected)==round(original['duration']*FPS)
 main.append({'id':id,'title':names.get(id,original['title']),'start':round(clock,5),'end':round(clock+original['duration'],5),
  'duration':original['duration'],'speed':original['speed'],'source_frame_start':original['start'],'source_frame_end':original['end'],'reset':'Independent v06 fixture; unchanged replay.'})
 for r in selected:
  frames.append({**r,'source_frame':r['frame'],'frame':len(frames)+1,'group':'all-controls','title':names.get(id,r['title']),'chapter':f'{index+1:02}/{len(order):02}'})
 clock+=original['duration']
assert len(frames)==1494
packet={'version':'orange-tabby-complete-controls-v07','date':'2026-10-20','presentation_only':True,
 'model':'orange-tabby-prepared-v02','controller':'orange-tabby-motion-v06','accepted_scope':'User: this is correct — existing S lift accepted; request is complete directional video coverage.',
 'source_replay':'assets/concepts/orange-tabby/motion-v06/game-solver-replay.json','source_captions':'output/orange-tabby-v06/frame-captions.json',
 'source_captions_sha256':hashlib.sha256((SOURCE/'frame-captions.json').read_bytes()).hexdigest(),
 'fps':FPS,'resolution':[1600,900],'duration':clock,'chapters':main,'required_cases':order[:8],
 'change':'Consolidate all eight normal-speed cases into the primary video, followed by unchanged slow support and recovery/cancel chapters.'}
(DATA/'presentation-plan.json').write_text(json.dumps(packet,indent=2)+'\n')
(DATA/'chapters.json').write_text(json.dumps(main,indent=2)+'\n')
(OUT/'frame-captions.json').write_text(json.dumps(frames,indent=2)+'\n')
# Reuse only the existing caption constructors, not its encoding side effects.
helper=ROOT/'scripts/preview/encode-orange-tabby-v06.py'
prefix=helper.read_text().split("if '--posters' in sys.argv:")[0]
prefix=prefix.replace('GIANT PAWS / CONTACT-DRIVEN LIFT + WEAPON CONTROL','ALL DIRECTIONS / W S A D + COMBINED PAW CONTROL')
scope={'__file__':str(helper)};exec(compile(prefix,'v06_functional_hud','exec'),scope)
caption=scope['caption']
poster_frames={}
sheet=Image.new('RGB',(1600,1800),'#eeecdf')
for index,id in enumerate(order[:8]):
 selected=[r for r in frames if r['shot_id']==id]
 target=1.52 if id=='s' else 1.6 if id.startswith('s') else 1.0
 r=min(selected,key=lambda r:abs(r['physical_time']-target));poster_frames[id]=r['frame']
 im=caption(Image.open(SOURCE/'raw-frames'/f"{r['source_frame']:05d}.png"),r)
 im.save(DEST/f'{id}-controls-v07.png');sheet.paste(im.resize((800,450)),(index%2*800,index//2*450))
sheet.save(OUT/'all-directions-contact-sheet.jpg',quality=92)
(OUT/'poster-frames.json').write_text(json.dumps(poster_frames,indent=2)+'\n')
if '--posters-only' in sys.argv:
 print(OUT/'all-directions-contact-sheet.jpg');sys.exit(0)
dest=DEST/'orange-tabby-all-controls-v07.mp4'
with (OUT/'encode.log').open('w') as log:
 proc=subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1600x900','-r','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
 for r in frames:proc.stdin.write(caption(Image.open(SOURCE/'raw-frames'/f"{r['source_frame']:05d}.png"),r).tobytes())
 proc.stdin.close()
 if proc.wait():raise RuntimeError('Complete-controls encoding failed')
print(dest,flush=True)
