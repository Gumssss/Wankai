from pathlib import Path
import subprocess,json,hashlib,io
from PIL import Image,ImageDraw,ImageChops,ImageStat
root=Path(__file__).resolve().parents[1];out=root/'assets/concepts/cr7-f-v03';p=out/'cr7-wasd-preview.mp4'
def frame(t):
 b=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
 return Image.open(io.BytesIO(b)).convert('RGB')
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True)
sets={'lifecycle':[.6,1.4,2.8,3.85,3.95,4.25,5.5,9,18.95,19.4,20,20.6], 'matrix':[40,45,50,55,60,65,70,75], 'edges':[23.4,23.9,24.6,25.5,28.8,34.6]}
for name,times in sets.items():
 sheet=Image.new('RGB',(1280,((len(times)+1)//2)*380),'#17363c');draw=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  x=i%2*640;y=i//2*380;sheet.paste(frame(t).resize((640,360)),(x,y));draw.text((x+8,y+363),f'{t:.2f}s',fill='white')
 sheet.save(out/(name+'-encoded-review.jpg'),quality=92)
a=frame(1.4).crop((335,275,1240,630));b=frame(9).crop((335,275,1240,630));rms=ImageStat.Stat(ImageChops.difference(a,b)).rms
result={'file':p.name,'duration':info['format']['duration'],'streams':[{'type':s['codec_type'],'codec':s['codec_name'],'frames':s.get('nb_frames'),'fps':s.get('r_frame_rate')}for s in info['streams']],'decode':'pass','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'encodedSeekSamples':sets,'sameEventCheck':{'normalTime':1.4,'slowTime':9,'sceneCrop':[335,275,1240,630],'pixelRmsRgb':rms},'productionTestsRun':False}
(out/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
