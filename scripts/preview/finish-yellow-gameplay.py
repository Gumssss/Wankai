"""Encode the actual game capture and replay its same support/contact intervals."""
import json,re,subprocess,sys,hashlib
from pathlib import Path
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/yellow-blob-gameplay-v01';DATA=ROOT/'assets/concepts/yellow-blob/gameplay-v01'
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();source=OUT/'actual-gameplay.webm';result=OUT/'actual-gameplay-with-replays.mp4'
probe=subprocess.run([ffmpeg,'-hide_banner','-i',str(source)],capture_output=True,text=True)
m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',probe.stderr);duration=int(m[1])*3600+int(m[2])*60+float(m[3])
report=json.loads((OUT/'capture-report.json').read_text());ratio=duration/report['duration'];filters=[];labels=[];chapters=[];cursor=0
font=next(p for p in [Path('/System/Library/Fonts/Helvetica.ttc'),Path('/System/Library/Fonts/Supplemental/Arial.ttf')] if p.exists())
for c in report['chapters']:
 start=c['offset']*ratio;end=(c['offset']+c['recordedDuration'])*ratio
 for speed,stop in [(1,end)]+([(0.25,min(end,start+1.2))] if c['id'] in ['S','vertical-hit','horizontal-hit','clash'] else []):
  label=f'v{len(labels)}';f=f'[0:v]trim=start={start}:end={stop},setpts={1/speed}*(PTS-STARTPTS),fps=30,setsar=1'
  if speed<1:f+=f",drawbox=x=1020:y=0:w=580:h=40:color=0xf5f2e9:t=fill,drawtext=fontfile={font}:text='0.25x SAME RECORDED EVENT':x=1030:y=10:fontsize=20:fontcolor=0x30372e"
  filters.append(f+'['+label+']');labels.append('['+label+']');length=(stop-start)/speed
  chapters.append({'id':c['id'],'speed':speed,'start':cursor,'end':cursor+length,'source_interval':[start,stop]});cursor+=length
filters.append(''.join(labels)+f'concat=n={len(labels)}:v=1:a=0[out]')
subprocess.run([ffmpeg,'-y','-v','error','-i',str(source),'-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(result)],check=True)
subprocess.run([ffmpeg,'-v','error','-i',str(result),'-f','null','-'],check=True)
subprocess.run([ffmpeg,'-y','-v','error','-ss','0.3','-i',str(result),'-frames:v','1',str(OUT/'actual-front-swing.png')],check=True)
checks={'all_models_loaded':all(c['modelReady'] for c in report['chapters']),'eight_inputs':all(any(c['id']==name for c in report['chapters']) for name in ['W','S','A','D','W+A','W+D','S+A','S+D']),'both_hit_directions':all(any(e['type']=='hit' and e['attacker']==0 for c in report['chapters'] if c['id']==name for e in c['events']) for name in ['vertical-hit','horizontal-hit']),'clash':any(e['type']=='clash' for c in report['chapters'] if c['id']=='clash' for e in c['events']),'encoded_full_decode':True}
assert all(checks.values());hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [*ROOT.glob('src/*.js'),ROOT/'public/models/yellow-blob-static-v03.glb',ROOT/'public/models/yellow-staff.glb']}
DATA.mkdir(exist_ok=True);(DATA/'verification.json').write_text(json.dumps({'checks':checks,'source':str(source.relative_to(ROOT)),'video':str(result.relative_to(ROOT)),'chapters':chapters,'sourceHashes':hashes,'raw_encoded_duration':duration,'chapter_boundary_scale':ratio,'slow_replay':'same encoded frames; no new simulation'},indent=2))
print(json.dumps({'checks':checks,'video':str(result),'duration':cursor}))
