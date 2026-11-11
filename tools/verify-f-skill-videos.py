from pathlib import Path
import json, subprocess, hashlib, io
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];out=root/'assets/concepts/f-skills-v01';timeline=json.loads((out/'timeline.json').read_text())
def frame(p,t):
 b=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
 return Image.open(io.BytesIO(b)).convert('RGB')
verification=[]
for entry in timeline['entries']:
 p=out/(entry['id']+'.mp4')
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
 subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True,stdout=subprocess.DEVNULL)
 sheet=Image.new('RGB',(1280,5*260),'#14282f');draw=ImageDraw.Draw(sheet)
 for i,ch in enumerate(timeline['chapters']):
  t=ch['start']+(2 if ch['mode']=='replay' else .95)
  im=frame(p,t).resize((426,240));x=i%3*426;y=i//3*260;sheet.paste(im,(x,y));draw.text((x+6,y+242),f'{t:05.2f}s {ch["label"]}',fill='white')
 sheet.save(out/(entry['id']+'-encoded-sheet.jpg'),quality=90)
 verification.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'duration':info['format']['duration'],'streams':[{'type':s['codec_type'],'codec':s['codec_name'],'frames':s.get('nb_frames'),'width':s.get('width'),'height':s.get('height')} for s in info['streams']],'decode':'pass'})
(out/'media-verification.json').write_text(json.dumps(verification,indent=2)+'\n')
print(json.dumps(verification,indent=2))
# Reused normal controls: encoded frames, not telemetry-only assertions.
checks=[]
for folder in ['restored-animals-v01','drive-characters-v01']:
 d=json.loads((root/'assets/concepts'/folder/'capture-report.json').read_text());clips=[c for c in d['chapters'] if c['loadout']['characterId'] in ['orange-tabby','cr7','mean-girl','maodie'] and (' / 1x' in c['title']) and 'physical' not in c['title'] and 'common' not in c['title'] and 'F has' not in c['title']]
 sheet=Image.new('RGB',(1280,((len(clips)+2)//3)*260),'#14282f');draw=ImageDraw.Draw(sheet)
 for i,c in enumerate(clips):
  t=round(c['offset']+(1.7 if folder=='drive-characters-v01' else .9),2);im=frame(root/'assets/concepts'/folder/'movement-review.mp4',t).resize((426,240));x=i%3*426;y=i//3*260;sheet.paste(im,(x,y));draw.text((x+4,y+242),f'{t:.2f}s {c["title"]}',fill='white');checks.append({'source':folder+'/movement-review.mp4','seek':t,'expectedLabel':c['title']})
 sheet.save(out/(folder+'-reuse-sheet.jpg'),quality=90)
(out/'reuse-seek-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
