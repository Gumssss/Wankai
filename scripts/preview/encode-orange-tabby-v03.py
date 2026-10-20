"""Caption and encode seated detached-paw solver replays; preserve earlier studies."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from functools import lru_cache
import json,subprocess,sys
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/orange-tabby-v03'
DEST=ROOT/'docs/previews/orange-tabby';DEST.mkdir(parents=True,exist_ok=True)
rows=json.loads((OUT/'frame-captions.json').read_text())
for row in rows:row['detail']=row['detail'].replace('same connected paw pair','same detached paw pair')
@lru_cache(None)
def font(n,bold=False):return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if bold else '')+'.ttf',n)
def caption(im,row):
 im=im.convert('RGB');d=ImageDraw.Draw(im);ink='#233531';muted='#536B65';accent='#216F73'
 d.rectangle((0,0,1280,138),fill='#F1F3EE');d.rectangle((0,565,1280,720),fill='#F1F3EE')
 d.text((35,19),'WANKAI / SEATED ORANGE TABBY / FLOATING PAWS v03',font=font(17,True),fill=muted)
 d.text((35,48),row['title'],font=font(32,True),fill=ink)
 d.text((35,96),row['detail'],font=font(20),fill=muted)
 d.text((1172,20),row['chapter'],font=font(17),fill=muted)
 d.rounded_rectangle((1035,577,1245,621),radius=10,fill=accent)
 text=row['input'];box=d.textbbox((0,0),text,font=font(22,True));d.text((1140-(box[2]-box[0])/2,586),text,font=font(22,True),fill='white')
 d.text((35,580),row['status'],font=font(21,True),fill=accent)
 d.text((35,618),row['metric'],font=font(17),fill=muted)
 d.text((35,655),row['evidence'],font=font(17,True),fill=ink)
 d.text((35,687),'Primitive motion study. Seated body. Enormous detached paws. No arms or connectors. Primitive study.',font=font(16),fill=muted)
 return im
if '--posters' in sys.argv:
 picks=['seated-floating-paws','w','wa','sd','landing','sword-clash']
 montage=Image.new('RGB',(1280,1080),'#F1F3EE')
 posterframes=json.loads((OUT/'poster-frames.json').read_text())
 for i,id in enumerate(picks):
  row=rows[posterframes[id]-1]
  im=caption(Image.open(OUT/f'poster-{id}.png'),row);im.save(DEST/f'{id}-v03.png')
  montage.paste(im.resize((640,360)),(i%2*640,i//2*360))
 montage.save(OUT/'contact-sheet.jpg',quality=90);print(OUT/'contact-sheet.jpg');sys.exit(0)
for group in ['controls','combat','design']:
 selected=[r for r in rows if r['group']==group];dest=DEST/f'orange-tabby-{group}-v03.mp4'
 with (OUT/f'encode-{group}.log').open('w') as log:
  proc=subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','-','-an',
   '-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
  for row in selected:proc.stdin.write(caption(Image.open(OUT/'raw-frames'/f"{row['frame']:05d}.png"),row).tobytes())
  proc.stdin.close()
  if proc.wait():raise RuntimeError('Encoding failed: '+group)
 print(dest,flush=True)
 subprocess.run(['ffmpeg','-y','-ss','1.15','-i',str(dest),'-frames:v','1',str(OUT/f'encoded-{group}.png')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
