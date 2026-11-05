from pathlib import Path
import json,subprocess
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1];out=root/'assets/concepts/restored-animals-v01';report=json.loads((out/'capture-report.json').read_text());source=out/('actual-gameplay.webm' if (out/'actual-gameplay.webm').exists() else 'actual-gameplay.mp4')
chapters=report['chapters'];cat=next(c for c in chapters if c['title']=='ORANGE CAT / S / 1x');rotor=next(c for c in chapters if 'expiry and landing' in c['title']);contact=next(c for c in chapters if c['title'].startswith('BEAGLE / physical'))
clips=[(cat['offset']+.7,'SAME EVENT / CAT FLOOR SUPPORT / 0.25x'),(rotor['offset']+4.9,'SAME EVENT / ROTOR EXPIRY / 0.25x'),(contact['offset']+.15,'SAME EVENT / WEAPON CONTACT / 0.25x')]
parts=['[0:v]split=4[main][c0][c1][c2]','[main]setpts=PTS-STARTPTS,fps=30,format=yuv420p[m]']
font='/System/Library/Fonts/Supplemental/Arial.ttf'
inputs=[]
banners=root/'.local/restoration-2026-11-02/banners';banners.mkdir(parents=True,exist_ok=True)
for i,(start,label) in enumerate(clips):
 banner=banners/f'{i}.png';im=Image.new('RGB',(1280,96),'#30372e');ImageDraw.Draw(im).text((24,24),label,fill='white',font=ImageFont.truetype(font,24));im.save(banner)
 inputs+=['-i',str(banner)]
 parts.append(f"[c{i}]trim=start={start:.6f}:duration=1.1,setpts=4*(PTS-STARTPTS),fps=30[a{i}]")
 parts.append(f"[a{i}][{i+1}:v]overlay=0:0,format=yuv420p[s{i}]")
parts.append('[m][s0][s1][s2]concat=n=4:v=1:a=0[v]')
subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),*inputs,'-filter_complex',';'.join(parts),'-map','[v]','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'movement-review.mp4')],check=True)
(out/'same-event-replays.json').write_text(json.dumps([{'source':source.name,'start':s,'sourceDuration':1.1,'playbackSpeed':.25,'label':l} for s,l in clips],indent=2)+'\n')
print(out/'movement-review.mp4')
