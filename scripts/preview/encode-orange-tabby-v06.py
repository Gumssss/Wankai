"""Compact beagle-v07 functional HUD over actual-model solver replay frames."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from functools import lru_cache
import json,subprocess,sys
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/orange-tabby-v06';DEST=ROOT/'docs/previews/orange-tabby'
rows=json.loads((OUT/'frame-captions.json').read_text());W,H,FPS=1600,900,30
@lru_cache(None)
def font(size,bold=False):return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if bold else '')+'.ttf',size)
def caption(im,r):
 im=im.convert('RGBA');hud=Image.new('RGBA',(W,H));d=ImageDraw.Draw(hud)
 panel=(238,236,221,238);ink='#313B33';muted='#636A5D';teal='#397E78';amber='#B48A32'
 d.rectangle((0,0,W,49),fill=panel);d.rectangle((0,815,W,H),fill=panel)
 d.text((28,12),'GIANT PAWS / CONTACT-DRIVEN LIFT + WEAPON CONTROL',font=font(23,True),fill=ink)
 d.text((1490,15),r['chapter'],font=font(19),fill=muted)
 title=r['title'].replace(' / same event, 0.25x','')
 d.text((264,64),title,font=font(23,True),fill=ink)
 speed='0.25x / SAME EVENT' if r['speed']!=1 else '1x / NORMAL SPEED'
 d.rounded_rectangle((1290,57,1570,94),radius=5,fill=panel);d.text((1307,65),speed,font=font(19,True),fill=teal)
 # Parse controls, never letters in the word RELEASE.
 held={part for part in r['input'].replace(' ','').split('+') if part in {'W','A','S','D'}}
 for key,(x,y) in {'W':(84,111),'A':(35,160),'S':(84,160),'D':(133,160)}.items():
  d.rounded_rectangle((x,y,x+43,y+43),radius=4,fill=teal if key in held else panel,outline='#A9AD99',width=1)
  d.text((x+13,y+9),key,font=font(23,True),fill='white' if key in held else ink)
 d.text((32,221),'BODY BASE / ABOVE FLOOR',font=font(15,True),fill=muted)
 d.text((32,246),f"{r['base_height']:.2f} u",font=font(31,True),fill=teal)
 d.text((32,288),f"+{max(0,r['height_above_rest']):.2f} u above rest",font=font(18),fill=ink)
 d.text((32,315),'Resting hover: 0.35 u',font=font(16),fill=muted)
 d.text((1310,118),'SHARED STAMINA',font=font(16,True),fill=muted)
 d.rectangle((1310,144,1540,157),fill='#F2F1E4');d.rectangle((1310,144,1310+230*max(0,min(1,r['stamina']/200)),157),fill=teal)
 d.text((1480,165),str(round(r['stamina']))+' / 200',font=font(16),fill=muted)
 if r['opponent_health'] is not None:
  d.text((1310,201),'OPPONENT HP',font=font(16,True),fill=muted)
  d.rectangle((1310,227,1540,240),fill='#F2F1E4');d.rectangle((1310,227,1310+230*max(0,r['opponent_health']/100),240),fill=amber)
  d.text((1505,248),str(round(r['opponent_health'])),font=font(17,True),fill=ink)
 # A projected world-space ruler makes vertical rise readable against the floor.
 bottom,rest,top=[tuple(p) for p in r['ruler']]
 d.line((bottom,top),fill=teal,width=2)
 for p in [bottom,top]:d.line((p[0]-6,p[1],p[0]+6,p[1]),fill=teal,width=2)
 d.line((rest[0]-8,rest[1],rest[0]+8,rest[1]),fill=amber,width=3)
 if r['base_height']>.75:
  d.text((top[0]-77,top[1]-25),f"+{r['height_above_rest']:.2f} u",font=font(18,True),fill=teal,stroke_width=2,stroke_fill=panel)
 if r['event']:
  x,y=r['event_screen'];age=r['physical_time']-r['event']['time'];rad=max(6,20-age*24)
  d.ellipse((x-rad,y-rad,x+rad,y+rad),outline=amber,width=4)
  text=str(r['event']['damage']) if r['event']['type']=='hit' else 'CLASH'
  d.text((x+15,y-48-age*35),text,font=font(34,True),fill=amber,stroke_width=2,stroke_fill='#F3EFDC')
 d.text((30,827),r['status'],font=font(23,True),fill=teal)
 d.text((30,869),'Actual Tripo cat + isolated current-game solver / no scripted launch / teal rings: registered floor support',font=font(17),fill=ink)
 return Image.alpha_composite(im,hud).convert('RGB')
if '--posters' in sys.argv:
 picks=json.loads((OUT/'poster-frames.json').read_text());ids=['s','s-slow','w','sa','vertical-hit','sword-clash'];sheet=Image.new('RGB',(1600,1350))
 for i,id in enumerate(ids):
  r=rows[picks[id]-1];im=caption(Image.open(OUT/f'poster-{id}.png'),r);im.save(DEST/f'{id}-v06.png');sheet.paste(im.resize((800,450)),(i%2*800,i//2*450))
 sheet.save(OUT/'contact-sheet.jpg',quality=92);print(OUT/'contact-sheet.jpg');sys.exit(0)
groups=['lift','controls','combat']
if '--group' in sys.argv:groups=[sys.argv[sys.argv.index('--group')+1]]
for group in groups:
 selected=[r for r in rows if r['group']==group];dest=DEST/f'orange-tabby-{group}-v06.mp4'
 with (OUT/f'encode-{group}.log').open('w') as log:
  proc=subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
  for r in selected:proc.stdin.write(caption(Image.open(OUT/'raw-frames'/f"{r['frame']:05d}.png"),r).tobytes())
  proc.stdin.close()
  if proc.wait():raise RuntimeError('Encoding failed: '+group)
 subprocess.run(['ffmpeg','-v','error','-y','-ss','1.55' if group=='lift' else '1.2','-i',str(dest),'-frames:v','1',str(OUT/f'encoded-{group}.png')],check=True)
 print(dest,flush=True)
