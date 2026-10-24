"""Encoded pre-integration blockout: same inputs, production vs staged solver."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math,subprocess
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/cat-paws-v3'
replay=json.loads((OUT/'preview-replay.json').read_text());W,H,FPS=1280,720,30
fontpath='/System/Library/Fonts/Supplemental/Arial.ttf'
f=ImageFont.truetype(fontpath,18);bold=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',23)
video=OUT/'motion-comparison.mp4'
proc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],stdin=subprocess.PIPE)
# Stable oblique floor view. Translation follows horizontally only; vertical
# rise stays measured against the fixed floor and resting-height reference.
def projection(p,cx,cz,pane):
 x,y,z=p['x']-cx,p['y'],p['z']-cz
 return (pane*640+320+38*(x*.72-z*.69),530-38*(y+.28*x+.29*z))
for chapter,shot in enumerate(replay['shots']):
 for frame in range(round(shot['duration']*FPS)):
  im=Image.new('RGB',(W,H),'#e9e8df');d=ImageDraw.Draw(im)
  d.rectangle((0,0,W,70),fill='#263a36');d.text((20,10),'CAT PAWS 2x -> 1.3x   |   PRE-INTEGRATION SOLVER BLOCKOUT',font=bold,fill='white')
  d.text((20,42),f"{chapter+1:02}/{len(replay['shots'])}   {shot['weapon']}   {shot['key']}   {shot['speed']}x",font=f,fill='#d8e9dc')
  d.line((640,70,640,H),fill='#acb8ac',width=2)
  for pane,rows in enumerate(shot['trials']):
   index=min(len(rows)-1,int(frame*shot['speed']));r=rows[index];p=r['players'][0];cx,cz=p['p']['x'],p['p']['z']
   d.text((pane*640+20,86),'BEFORE: 2x PAWS / 150 HP' if pane==0 else 'PROPOSED: 1.3x ORIGINAL PAWS / 150 HP',font=f,fill='#294740')
   for a in range(-10,11):
    for u,v in [({'x':cx+a,'y':0,'z':cz-10},{'x':cx+a,'y':0,'z':cz+10}),({'x':cx-10,'y':0,'z':cz+a},{'x':cx+10,'y':0,'z':cz+a})]:d.line((projection(u,cx,cz,pane),projection(v,cx,cz,pane)),fill='#c2cbc0')
   # Floor trace and resting-height reference use recorded positions.
   trace=[projection({**x['players'][0]['p'],'y':0},cx,cz,pane) for x in rows[:index+1:3]]
   if len(trace)>1:d.line(trace,fill='#809b89',width=2)
   rest=.94 if shot['weapon']=='cat-paws' else .59
   d.line((projection({'x':cx-2,'y':rest,'z':cz},cx,cz,pane),projection({'x':cx+2,'y':rest,'z':cz},cx,cz,pane)),fill='#9eae9d',width=1)
   for player in r['players']:
    for shape in player.get('visuals',[]):d.line((projection(shape['a'],cx,cz,pane),projection(shape['b'],cx,cz,pane)),fill='#b7bab0',width=max(1,int(shape['radius']*76)))
   shapes=[]
   for player in r['players']:
    for shape in player['body']:shapes.append((shape,'#bd6048' if player['id']==0 else '#4f858a'))
    for shape in player['segments']:shapes.append((shape,'#e3b347' if shot['weapon']=='cat-paws' and player['id']==0 else '#b17a4c' if player['id']==0 else '#6f969a'))
   for shape,color in sorted(shapes,key=lambda item:item[0]['a']['z'],reverse=True):
    a,b=projection(shape['a'],cx,cz,pane),projection(shape['b'],cx,cz,pane);radius=shape['radius']*38
    d.line((a,b),fill=color,width=max(1,int(radius*2)))
    for q in [a,b]:d.ellipse((q[0]-radius,q[1]-radius,q[0]+radius,q[1]+radius),fill=color,outline='#58665b')
   if p['support']:
    contact=min(p['segments'],key=lambda s:min(s['a']['y'],s['b']['y'])-s['radius'])
    q=projection({**contact['a'],'y':0},cx,cz,pane);d.ellipse((q[0]-12,q[1]-5,q[0]+12,q[1]+5),outline='#1c9c78',width=3)
   inp=r['input'];held=set()
   if inp['theta']:held.add('W' if inp['theta']>0 else 'S')
   if inp['phi']:held.add('D' if inp['phi']>0 else 'A')
   for key,(x,y) in {'W':(70,135),'A':(30,175),'S':(70,175),'D':(110,175)}.items():
    x+=pane*640;d.rounded_rectangle((x,y,x+34,y+34),4,fill='#367e71' if key in held else '#f5f3e9');d.text((x+9,y+5),key,font=f,fill='white' if key in held else '#294740')
   d.text((pane*640+20,225),('F: ACTIVE / ROTOR' if p['skill'] else 'ORDINARY / RECOVERY'),font=f,fill='#294740')
   d.text((pane*640+20,615),f"HP {p['health']:.0f}/{p['maxHealth']}   STAMINA {p['stamina']:.0f}/200",font=f,fill='#294740')
   if len(r['players'])>1:d.text((pane*640+440,140),f"TARGET HP {r['players'][1]['health']:.0f}",font=f,fill='#4f858a')
   for event in r['events']:
    if event['type'] not in ['hit','clash']:continue
    q=projection(event['point'],cx,cz,pane);d.ellipse((q[0]-13,q[1]-13,q[0]+13,q[1]+13),outline='#cd442c',width=3)
    d.text((q[0]+15,q[1]-25),'CLASH' if event['type']=='clash' else str(event['damage']),font=bold,fill='#bd6048')
   d.text((pane*640+20,645),f"BASE HEIGHT {p['p']['y']-.59:.2f}u   {'FLOOR SUPPORT' if p['support'] else 'AIR / FREE'}",font=f,fill='#294740')
   d.text((pane*640+20,675),'Physical capsules / body proxies; no scripted travel',font=f,fill='#6d776c')
  proc.stdin.write(im.tobytes())
proc.stdin.close();assert proc.wait()==0
print(video)
