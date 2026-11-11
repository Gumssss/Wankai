"""Decode the delivery video and retain encoded-frame review evidence."""
from pathlib import Path
import subprocess, json, hashlib, io, re
from PIL import Image, ImageDraw, ImageChops, ImageStat

root=Path(__file__).resolve().parents[1]
out=root/'assets/concepts/skills-runtime-v01'
video=out/'runtime-skills.mp4'
def frame(t):
    data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
    return Image.open(io.BytesIO(data)).convert('RGB')
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
assert float(info['format']['duration'])==84
assert len(info['streams'])==1 and info['streams'][0]['codec_type']=='video'
assert info['streams'][0]['nb_frames']=='2520'
times=[.5,.6,.8,1.2,3.5,4.2,4.9,7.6,11,15.2,43,44.5]
sheet=Image.new('RGB',(1280,6*380),'#19383f');draw=ImageDraw.Draw(sheet)
for i,t in enumerate(times):
    x=i%2*640;y=i//2*380
    sheet.paste(frame(t).resize((640,360)),(x,y));draw.text((x+8,y+363),f'{t:.2f}s',fill='white')
sheet.save(out/'encoded-review.jpg',quality=92)
crop=(0,100,1050,635)
normal=frame(.8).crop(crop);slow=frame(7.6).crop(crop)
rms=ImageStat.Stat(ImageChops.difference(normal,slow)).rms
assert max(rms)<8, 'same-event frame mismatch'
log=(out/'tests.log').read_text(); passed=int(re.search(r'^# pass (\d+)$',log,re.M).group(1)); failed=int(re.search(r'^# fail (\d+)$',log,re.M).group(1))
result={'file':video.name,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration':84,'fps':30,'frames':2520,'audio':False,'fullDecode':'pass','encodedSeekSamples':times,'sameCR7Event':{'normal':.8,'slow':7.6,'sceneCrop':crop,'rgbPixelRms':rms},'testSuite':{'passed':passed,'failed':failed},'build':'pass (existing bundle-size warning)','appCheck':json.loads((out/'app-check.json').read_text()),'manualPlay':False,'nativeSteamTwoMachine':False}
(out/'verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(result,indent=2,ensure_ascii=False))
