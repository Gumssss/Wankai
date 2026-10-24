"""Retain CFR gameplay plus labelled slow replays from the exact same capture."""
from pathlib import Path
import json,subprocess
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/beagle-cat-balance-v2'
r=json.loads((OUT/'actual-gameplay-report.json').read_text());parts=[]
def run(args):subprocess.run(['ffmpeg','-v','error','-y',*args],check=True)
normal=OUT/'gameplay-normal.mp4'
if not normal.exists() or normal.stat().st_mtime<(OUT/'actual-gameplay.webm').stat().st_mtime:run(['-i',str(OUT/'actual-gameplay.webm'),'-vf','fps=30','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p',str(normal)])
parts.append(normal)
label=Image.new('RGB',(600,36),'#f5f2e9');ImageDraw.Draw(label).text((40,7),'0.25x - SAME RECORDED EVENT',font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20),fill='#397e78');label.save(OUT/'slow-label.png')
coverage=[{'id':c['id'],'offset':c['offset'],'duration':c['recordedDuration'],'speed':1} for c in r['chapters']]
offset=r['duration']
for i,(id,kind) in enumerate([('cat-paws-s','support'),('long-ears-f-rotor-d-expiry-land','expiry'),('cat-block-clash','hit'),('cat-horizontal-hit','hit'),('cat-block-clash','clash'),('identical-character-trade','hit')]):
 c=next(c for c in r['chapters'] if c['id']==id)
 if id.endswith('-s'):t=next(s['time'] for s in c['samples'] if s['support'])
 elif id.startswith('long-ears-f'):t=5
 else:t=next((e['time'] for e in c['events'] if e['type']==kind),.4)
 start=c['offset']+max(0,t-.15)*c['recordedDuration']/c['simulationTime']
 p=OUT/f'gameplay-slow-{i}.mp4'
 vf="[0:v]setpts=4*(PTS-STARTPTS),fps=30[slow];[slow][1:v]overlay=1000:0:shortest=1[v]"
 run(['-ss',str(start),'-t','1','-i',str(OUT/'actual-gameplay.webm'),'-loop','1','-i',str(OUT/'slow-label.png'),'-filter_complex',vf,'-map','[v]','-t','4','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p',str(p)]);parts.append(p)
 coverage.append({'id':id+'-'+kind+'-same-event-slow','offset':offset,'sourceOffset':start,'duration':4,'speed':.25});offset+=4
concat=OUT/'gameplay-parts.txt';concat.write_text(''.join("file '"+str(p)+"'\n" for p in parts))
run(['-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(OUT/'actual-gameplay-complete.mp4')])
(OUT/'actual-gameplay-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
print(OUT/'actual-gameplay-complete.mp4')
