"""Caption and encode the inspected motion blockout, using Pillow + FFmpeg.

--posters builds a contact sheet without requiring all rendered frames.
The normal path encodes three review videos from deterministic raw PNGs.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess,sys
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/orange-tabby-v01'
DEST=ROOT/'docs/previews/orange-tabby';DEST.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'assets/concepts/orange-tabby/motion-v01'
rows=json.loads((OUT/'frame-captions.json').read_text())
chapters=json.loads((DATA/'chapters.json').read_text())
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def font(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n)
def caption(im,row):
 im=im.convert('RGB');d=ImageDraw.Draw(im)
 paper='#F1F3EE';ink='#233531';muted='#536B65';accent='#216F73' if row['group']=='controls' else '#A35C3D'
 d.rectangle((0,0,1280,138),fill=paper);d.rectangle((0,565,1280,720),fill=paper)
 d.text((35,19),'WANKAI  /  ORANGE TABBY  /  MOTION v01',font=font(17,True),fill=muted)
 d.text((35,48),row['title'],font=font(32,True),fill=ink)
 d.text((35,96),row['detail'],font=font(20),fill=muted)
 d.text((1172,20),row['chapter'],font=font(17),fill=muted)
 d.rounded_rectangle((1035,577,1245,621),radius=10,fill=accent)
 label=row['input'];box=d.textbbox((0,0),label,font=font(22,True));w=box[2]-box[0]
 d.text((1140-w/2,586),label,font=font(22,True),fill='white')
 d.text((35,580),row['status'],font=font(22,True),fill=accent)
 d.text((35,618),row['metric'],font=font(17),fill=muted)
 d.text((35,655),row['evidence'],font=font(17,True),fill=ink)
 d.text((35,687),'Primitive anatomy study. Selected screenshot identity retained for later Tripo production. No ability selected.',font=font(16),fill=muted)
 return im
if '--posters' in sys.argv:
 picks=['w','s','wa','sd','release-reverse','landing','vertical','horizontal','block','clash','postures']
 montage=Image.new('RGB',(1280,6*360),'#F1F3EE')
 for i,id in enumerate(picks):
  row=next(r for r in rows if r['shot_id']==id and r['local_time']>=1.25)
  im=caption(Image.open(OUT/f'poster-{id}.png'),row)
  im.save(DEST/f'{id}-v01.png');montage.paste(im.resize((640,360)),((i%2)*640,(i//2)*360))
 montage.save(OUT/'contact-sheet.jpg',quality=90)
 print(OUT/'contact-sheet.jpg');sys.exit(0)
for group in ['controls','combat','comparison']:
 selected=[r for r in rows if r['group']==group]
 output=DEST/f'orange-tabby-{group}-v01.mp4'
 proc=subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24',
  '-i','-','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=open(OUT/f'encode-{group}.log','w'))
 for row in selected:
  raw=OUT/'raw-frames'/f"{row['frame']:05d}.png"
  proc.stdin.write(caption(Image.open(raw),row).tobytes())
 proc.stdin.close()
 if proc.wait():raise RuntimeError('Encoding failed: '+group)
 print(output,flush=True)
 # Capture actual encoded evidence for visual QA, not raw-frame substitutes.
 subprocess.run(['ffmpeg','-y','-ss','1.35','-i',str(output),'-frames:v','1',str(OUT/f'encoded-{group}.png')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
