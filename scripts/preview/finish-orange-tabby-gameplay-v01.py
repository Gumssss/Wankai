"""Preserve real gameplay at 1x; append a labeled 0.25x copy of its S contact."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess,hashlib,shutil
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/orange-tabby-gameplay-v01';DEST=ROOT/'docs/previews/orange-tabby';DATA=ROOT/'assets/concepts/orange-tabby/gameplay-v01'
normal=DEST/'orange-tabby-gameplay-normal-v01.mp4';slow=DEST/'orange-tabby-gameplay-slow-v01.mp4';final=DEST/'orange-tabby-gameplay-v01.mp4'
# Chrome emits full-range pixels. Convert to video range explicitly so the
# normal and Pillow-captioned replay share the same encoded range.
subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'actual-gameplay.webm'),'-vf','fps=30,scale=in_range=pc:out_range=tv','-color_range','tv','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(normal)],check=True)
probe=lambda p:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
meta=probe(normal);duration=float(meta['format']['duration'])
raw=subprocess.check_output(['ffmpeg','-v','error','-ss','4','-i',str(normal),'-t','1.2','-vf','fps=30','-f','rawvideo','-pix_fmt','rgb24','-'])
size=1600*900*3;assert len(raw)==36*size
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
proc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1600x900','-r','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(slow)],stdin=subprocess.PIPE)
for i in range(36):
 im=Image.frombytes('RGB',(1600,900),raw[i*size:(i+1)*size]);draw=ImageDraw.Draw(im)
 draw.rectangle((945,0,1600,47),fill='#f5f2e9');draw.text((975,20),'SAME RECORDED S CONTACT / 0.25x REPLAY',font=font,fill='#3c5348')
 for repeat in range(4):proc.stdin.write(im.tobytes())
proc.stdin.close();assert proc.wait()==0
listing=OUT/'concat.txt';listing.write_text("file '"+str(normal)+"'\nfile '"+str(slow)+"'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(final)],check=True)
shutil.copyfile(OUT/'gameplay-poster.png',DEST/'gameplay-poster-v01.png')
cap=json.loads((OUT/'capture-report.json').read_text());chapters=[{'id':c['id'],'title':c['title'],'start':c['offset'],'end':c['offset']+c['recordedDuration'],'simulation_duration':c['simulationTime'],'speed':1} for c in cap['chapters']]
chapters.append({'id':'s-slow','title':'Same recorded S contact / 0.25x','start':duration,'end':duration+4.8,'speed':.25,'source_encoded_interval':[4,5.2]})
(DATA/'encoded-chapters.json').write_text(json.dumps(chapters,indent=2)+'\n')
checks=[];media=[]
for p in [normal,slow,final]:
 meta=probe(p);v=next(s for s in meta['streams'] if s['codec_type']=='video')
 assert v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and (v['width'],v['height'])==(1600,900) and v['r_frame_rate']=='30/1'
 decoded=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,text=True);assert decoded.returncode==0 and not decoded.stderr
 media.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'duration':float(meta['format']['duration']),'frames':int(v['nb_frames']),'fps':30,'resolution':[1600,900],'full_decode':True})
(DATA/'media-verification.json').write_text(json.dumps({'date':'2026-10-20','normal_speed_preserved':True,'original_capture':'output/orange-tabby-gameplay-v01/actual-gameplay.webm','slow_replay':'Identical normal-video frames 4.0–5.2 s repeated four times, with 0.25x label replacing normal speed label. No different physics or stronger event.','media':media},indent=2)+'\n')
print(json.dumps(media,indent=2))
