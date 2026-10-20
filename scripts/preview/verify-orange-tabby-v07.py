"""Verify complete video coverage while preserving the accepted v06 motion."""
from pathlib import Path
import hashlib,json,subprocess
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/concepts/orange-tabby';DATA=BASE/'motion-v07';OUT=ROOT/'output/orange-tabby-v07'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,ok,detail):
    checks.append({'name':name,'passed':bool(ok),'detail':detail})
    if not ok:raise AssertionError((name,detail))

plan=read(DATA/'presentation-plan.json');rows=read(OUT/'frame-captions.json')
source_path=ROOT/'output/orange-tabby-v06/frame-captions.json';source={r['frame']:r for r in read(source_path)}
chapters=read(DATA/'chapters.json');required=['w','s','a','d','wa','wd','sa','sd']
check('all eight cases lead the primary video at normal speed',
      [c['id'] for c in chapters[:8]]==required and all(c['speed']==1 for c in chapters[:8]) and chapters[7]['end']==27,
      [{'id':c['id'],'start':c['start'],'end':c['end'],'speed':c['speed']} for c in chapters[:8]])
check('all source motion and telemetry preserved',all(
    {k:v for k,v in r.items() if k not in ['frame','source_frame','group','title','chapter']} ==
    {k:v for k,v in source[r['source_frame']].items() if k not in ['frame','group','title','chapter']}
    for r in rows), 'Every source-frame body height, input, physical time, event, stamina and camera/ruler field is identical.')
check('source captions unchanged',sha(source_path)==plan['source_captions_sha256'],sha(source_path))
check('frame count and unique source mapping',len(rows)==1494 and len({r['source_frame'] for r in rows})==1494,'1494 frames / 49.8 seconds')
coverage=[]
for chapter in chapters:
    selected=[r for r in rows if r['shot_id']==chapter['id']]
    check('continuous encoded chapter: '+chapter['id'],len(selected)==round(chapter['duration']*30) and
          selected[0]['frame']==round(chapter['start']*30)+1 and selected[-1]['frame']==round(chapter['end']*30),chapter)
    if chapter['id'] not in required:continue
    keys=' + '.join(chapter['id'].upper());held=[r for r in selected if r['input']==keys]
    check('real simultaneous key set: '+keys,len(held)>=60 and set(r['input'] for r in selected)=={'RELEASE',keys},
          {'held_frames':len(held),'physical_first':held[0]['physical_time'],'physical_last':held[-1]['physical_time']})
    coverage.append({'keys':keys,'start':chapter['start'],'end':chapter['end'],'speed':1,
                     'held_start':(held[0]['frame']-1)/30,'held_end_exclusive':held[-1]['frame']/30,
                     'sample_frame':held[len(held)//2]['frame'],'source_frame':held[len(held)//2]['source_frame']})
check('accepted S lift retained exactly',all(r['source_frame']==i+1 for i,r in enumerate(x for x in rows if x['shot_id']=='s')),
      'Original 180 normal-speed S frames are unchanged; only header/chapter labels were updated.')
sim=read(BASE/'motion-v06/game-solver-replay.json')
check('prepared model unchanged',sha(ROOT/sim['geometry']['model'])==sim['geometry']['modelSha256'],sim['geometry']['modelSha256'])
check('original Tripo source unchanged',sha(BASE/'tripo-v01/orange-tabby-tripo-v01-source.glb')=='4241a26dbfb8f87e4c16c34b07c9319dd368523263b18b50ae3cdaa2e0485912','Original source preserved.')
check('combat supplement unchanged',sha(ROOT/'docs/previews/orange-tabby/orange-tabby-combat-v06.mp4')=='53c9793b51ef6a73321857f1068335847c0e4d2e44649983927da952feac4449','Existing v06 combat remains supplementary.')
video=ROOT/'docs/previews/orange-tabby/orange-tabby-all-controls-v07.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
v=next(v for v in probe['streams'] if v['codec_type']=='video')
check('encoded format and duration',v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and (v['width'],v['height'])==(1600,900)
      and v['r_frame_rate']=='30/1' and int(v['nb_frames'])==1494 and abs(float(probe['format']['duration'])-49.8)<.01,
      {'duration':probe['format']['duration'],'frames':v['nb_frames'],'size':[v['width'],v['height']],'fps':v['r_frame_rate']})
decoded=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],capture_output=True,text=True)
check('full encoded video decode',decoded.returncode==0 and not decoded.stderr,decoded.stderr or 'All 1494 frames decode.')
sheet=Image.new('RGB',(1600,1800))
for i,case in enumerate(coverage):
    sample=OUT/f"encoded-{required[i]}.png"
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(video),'-vf',f"select=eq(n\\,{case['sample_frame']-1})",'-frames:v','1',str(sample)],check=True)
    with Image.open(sample) as im:sheet.paste(im.resize((800,450)),(i%2*800,i//2*450))
sheet.save(OUT/'encoded-directions-contact-sheet.jpg',quality=92)
skill=[]
for name in ['SKILL.md','references/motion-and-reviews.md']:
    repo=ROOT/'skills/game-character-pipeline'/name;installed=Path('/Users/haojun/.codex/skills/game-character-pipeline')/name
    check('installed skill matches repository: '+name,repo.read_bytes()==installed.read_bytes(),sha(repo))
    skill.append({'file':name,'sha256':sha(repo),'installed_matches_repo':True})
check('complete matrix required in main skill',all(t in (ROOT/'skills/game-character-pipeline/SKILL.md').read_text() for t in ['W+A','W+D','S+A','S+D','main movement video']), 'All four directions and all four diagonal combinations are mandatory.')
(DATA/'skill-update.json').write_text(json.dumps({'date':'2026-10-20','scope':'Mandatory self-contained eight-case main movement video, true simultaneous key highlights and encoded coverage timecodes.',
    'files':skill,'repo_validation':'Skill is valid!','installed_validation':'Skill is valid!'},indent=2)+'\n')
report={'version':plan['version'],'date':'2026-10-20','presentation_only':True,'controller':'orange-tabby-motion-v06','model':'orange-tabby-prepared-v02',
        'checks':checks,'coverage':coverage,'media':{'id':'orange-tabby-all-controls-v07','path':str(video.relative_to(ROOT)),'sha256':sha(video),
        'bytes':video.stat().st_size,'duration_seconds':49.8,'role':'Primary complete-controls video / unchanged actual-model isolated v06 solver replay'},
        'unchanged_replay_sha256':sha(BASE/'motion-v06/game-solver-replay.json'),
        'scope':'User accepted S lift and requested all directions/combinations. No physics, model or runtime edit.',
        'limitations':['Independent control fixtures reset between chapters.','Full recovery is demonstrated in dedicated S/recovery chapters, not every three-second diagonal shot.','Actual-game integration and playable acceptance remain outstanding.']}
(DATA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checks_passed':len(checks),'coverage':coverage,'media':report['media']},indent=2))
