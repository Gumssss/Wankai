"""Verify the actual review deliverables, source preservation and study limits."""
from pathlib import Path
import json,hashlib,subprocess,ast
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'assets/concepts/orange-tabby/motion-v01';OUT=ROOT/'output/orange-tabby-v01'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
report={'version':'orange-tabby-motion-v01','user_acceptance':'pending','production_model':None,'runtime_cat':None,'checks':[]}
def check(name,condition,detail):
 report['checks'].append(dict(name=name,passed=bool(condition),detail=detail))
 if not condition:raise AssertionError((name,detail))
baseline=read(OUT/'preexisting-tracked-sha256.json')
changed=[p for p,h in baseline.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]
check('pre-existing tracked files unchanged',not changed,{'count':len(baseline),'changed':changed})
refs=read(ROOT/'assets/concepts/orange-tabby/manifest.json')['inputs']
check('supplied reference originals unchanged',all(sha(ROOT/x['path'])==x['sha256'] for x in refs),[x['path'] for x in refs])
sim=read(DATA/'support-replay.json');shots={s['id']:s for s in sim['shots']}
check('all required input scenarios exist',all(x in shots for x in ['w','s','a','d','wa','wd','sa','sd','release-reverse','yaw-reverse','opposites','landing']),list(shots))
check('forward and reverse contact-driven travel',shots['w']['metrics']['travel'][0]>1 and shots['s']['metrics']['travel'][0]<-1,
 {'w':shots['w']['metrics'],'s':shots['s']['metrics']})
check('no-input start has no artificial launch',all(s['rows'][0]['q']==0 and s['rows'][0]['v']==[0,0,0] for s in shots.values()),'Both initial paw gaps 0.1 above floor; landing has an explicitly external 0.75 drop.')
check('opposite inputs cancel',all(abs(v)<1e-8 for v in shots['opposites']['rows'][-1]['p']) and abs(shots['opposites']['rows'][-1]['q'])<1e-8,'No powered phase or heading movement.')
check('no extra translation from pure steering',all(abs(v)<1e-8 for key in ['a','d'] for v in shots[key]['metrics']['travel']),'Upright yaw stabilization is an approximation, not full-body torque dynamics.')
check('procedural endpoints reachable',max(s['metrics']['maxShoulderToPawDistance'] for s in shots.values())<1.28,'0.62 upper + 0.66 lower; does not validate production joint limits or mesh clearance.')
check('support proxy stays above floor',min(s['metrics']['minimumPawFloorGap'] for s in shots.values())>-.001,'Sphere proxy only; final toe/claw contacts remain unfitted.')
check('landing returns near base floor',shots['landing']['metrics']['finalHeight']<.02,shots['landing']['metrics'])
chapters=read(DATA/'chapters.json');framing=[]
for s in chapters:
 x0,x1,y0,y1=s['bounds'];cx,cy=s['center'];scale=s['scale']
 bounds=[.5+(x0-cx)/scale,.5+(x1-cx)/scale,.512+(y0-cy)*1280/720/scale,.512+(y1-cy)*1280/720/scale]
 framing.append({'id':s['id'],'screen_bounds':bounds})
check('whole-motion framing clears caption areas',all(b['screen_bounds'][0]>.04 and b['screen_bounds'][1]<.96 and b['screen_bounds'][2]>.2153 and b['screen_bounds'][3]<.8083 for b in framing),framing)
media=[]
for group,duration in [('controls',47),('combat',16),('comparison',6)]:
 p=ROOT/f'docs/previews/orange-tabby/orange-tabby-{group}-v01.mp4'
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
 stream=next(x for x in probe['streams'] if x['codec_type']=='video')
 check(group+' encoded media format',stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p' and stream['width']==1280 and stream['height']==720 and abs(float(probe['format']['duration'])-duration)<.05,{'duration':probe['format']['duration'],'codec':stream['codec_name'],'frames':stream['nb_frames']})
 decoded=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,text=True)
 check(group+' complete decode',decoded.returncode==0 and not decoded.stderr,decoded.stderr or 'All encoded frames decode without errors.')
 media.append({'id':f'orange-tabby-{group}-v01','path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size,'duration_seconds':duration,'type':'reduced support model' if group=='controls' else 'authored concept'})
for name in ['scripts/blender/orange_tabby_motion_v01.py','scripts/preview/encode-orange-tabby-v01.py','scripts/preview/verify-orange-tabby-v01.py']:
 ast.parse((ROOT/name).read_text())
check('study Python sources parse',True,'AST parse; no generated pyc in source tree.')
tests=(OUT/'baseline-tests.log').read_text();build=(OUT/'baseline-build.log').read_text()
check('existing game regression baseline','# pass 100' in tests and '# fail 0' in tests,'100 tests passed. Cat is not integrated; these are existing game tests.')
check('existing game production build','built in' in build,'Pass; existing large-bundle warning remains.')
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
report['media']=media;report['limitations']=sim['limitations']+['Lateral drift and heading deflection remain open; no game solver combat proof or user review.']
(DATA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
manifest_path=ROOT/'assets/concepts/orange-tabby/manifest.json';manifest=read(manifest_path)
manifest['stage']='direction/motion v01 ready for review; not accepted'
manifest['assets']=media+[{'id':'orange-tabby-blockout-v01','role':'primitive motion study; never production base','path':str((DATA/'orange-tabby-blockout-v01.blend').relative_to(ROOT)),'sha256':sha(DATA/'orange-tabby-blockout-v01.blend')}]
manifest['moves']=read(DATA/'video-segments.json')
manifest['reviews']=[r for r in manifest['reviews'] if r['stage']=='reference']+[{'stage':'A/B','artifact_version':'orange-tabby-motion-v01','status':'pending','review_page':'docs/previews/orange-tabby/index.html','scope':'posture and ordinary move intent; game-solver support/combat validation remains open'}]
manifest['verification']=[{'path':str((DATA/'verification.json').relative_to(ROOT)),'technical_checks':'passed','user_acceptance':'pending'}]
manifest['delivery']['local']='design, primitive Blender study and three review videos; no cat runtime'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
provenance_path=ROOT/'assets/concepts/orange-tabby/provenance.json';provenance=read(provenance_path)
provenance['local_study_operations']=[{'id':'motion-v01','date':'2026-10-19','tools':['Node.js isolated reduced-coordinate simulator','Blender 5.2.2 LTS Workbench primitive blockout','Pillow captions','FFmpeg 8.1.2 libx264'],
 'inputs':[x['path'] for x in provenance['originals']],'scripts':['scripts/preview/orange-tabby-motion-v01.mjs','scripts/blender/orange_tabby_motion_v01.py','scripts/preview/encode-orange-tabby-v01.py'],
 'production_generation':False,'production_operations':[],'outputs':media,'spending':'no Tripo operation submitted'}]
provenance_path.write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks_passed':len(report['checks']),'media':media,'preexisting_files_preserved':len(baseline)},indent=2))
