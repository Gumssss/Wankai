"""Verify support-driven S lift and the user-selected functional video standard."""
from pathlib import Path
import json,hashlib,subprocess,ast
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'assets/concepts/orange-tabby';DATA=BASE/'motion-v06';PREP=BASE/'prepared-v02';OUT=ROOT/'output/orange-tabby-v06'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,ok,detail):
 checks.append({'name':name,'passed':bool(ok),'detail':detail})
 if not ok:raise AssertionError((name,detail))
sim=read(DATA/'game-solver-replay.json');shots={s['id']:s for s in sim['shots']};lift=sim['verification']['liftProof']
check('S support precedes the visible lift',lift['firstSupportInput']=='S' and abs(lift['maximumHeightBeforeFirstContact']-.35)<1e-6 and lift['riseAboveRest']>1.5,lift)
check('S has a genuine airborne phase and recovery',any(not r['players'][0]['contact'] and r['players'][0]['p']['y']-.59>1 and r['players'][0]['v']['y']>0 for r in shots['s']['rows']) and lift['finalBaseHeight']<.45,lift)
check('no scripted body translation or normal launch impulse',sim['provenance']['scriptedTranslation'] is False and sim['provenance']['normalLaunchImpulse'] is False,sim['provenance'])
check('body stays seated and upright',all(abs(p['bodyPitch'])<1e-9 for s in shots.values() for r in s['rows'] for p in r['players']),'Paws pitch; body only translates and follows heading.')
check('all ordinary inputs, combinations and recovery exist',all(k in shots for k in ['w','s','a','d','wa','wd','sa','sd','release-reverse','yaw-reverse','landing','opposites']),list(shots))
check('shared ordinary stamina is charged once',abs(shots['w']['stats']['minStamina']-157)<.25 and abs(shots['wa']['stats']['minStamina']-139.8)<.25,{k:shots[k]['stats']['minStamina'] for k in ['w','wa']})
check('opposite inputs cancel powered cost',shots['opposites']['stats']['minStamina']==200,shots['opposites']['stats'])
check('hits, clash and miss start without overlap',all(shots[k]['stats']['initialOverlap']==0 for k in ['vertical-hit','horizontal-hit','sword-clash','near-miss']) and shots['vertical-hit']['stats']['hits']>0 and shots['horizontal-hit']['stats']['hits']>0 and shots['sword-clash']['stats']['clashes']>0 and shots['near-miss']['stats']['hits']==0,sim['candidates'])
check('analytical point velocities match motion',sim['verification']['contactVelocityFiniteDifferenceError']<1e-4,sim['verification']['contactVelocityFiniteDifferenceError'])
loader=read(PREP/'loader-verification.json');check('prepared GLB and neutral appearance checks pass',all(c['passed'] for c in loader['checks']),{'loader_checks':len(loader['checks'])})
check('actual video model has recorded export hash',sha(PREP/'orange-tabby-prepared-v02.glb')==sim['geometry']['modelSha256'],sim['geometry']['modelSha256'])
check('original Tripo source remains unchanged',sha(BASE/'tripo-v01/orange-tabby-tripo-v01-source.glb')=='4241a26dbfb8f87e4c16c34b07c9319dd368523263b18b50ae3cdaa2e0485912','Selected source preserved; no new generation.')
check('recorded source physics matches current source',sha(ROOT/sim['provenance']['source'])==sim['provenance']['sha256'],sim['provenance']['sha256'])
(DATA/'source-physics-snapshot.txt').write_bytes((ROOT/sim['provenance']['source']).read_bytes())
reference=read(DATA/'reference-analysis.json');check('user-supplied beagle reference remains unchanged',sha(Path(reference['source']))==reference['sha256'],reference['sha256'])
rows=read(OUT/'frame-captions.json');chapters=read(DATA/'chapters.json');bounds=[]
for chapter in chapters:
 r=[x for x in rows if x['shot_id']==chapter['id']]
 check('fixed camera height: '+chapter['id'],max(x['camera_z'] for x in r)-min(x['camera_z'] for x in r)<1e-6,{'camera_z':r[0]['camera_z']})
 check('recorded replay timing: '+chapter['id'],all(abs(x['physical_time']-(chapter['offset']+i/30*chapter['speed']))<1e-8 for i,x in enumerate(r)),{'speed':chapter['speed'],'offset':chapter['offset'],'frames':len(r)})
 x0,x1,y0,y1=chapter['bounds'];cx,cy=chapter['center'];scale=chapter['scale'];bounds.append([.48+(x0-cx)/scale,.48+(x1-cx)/scale,.5+(y0-cy)*1600/900/scale,.5+(y1-cy)*1600/900/scale])
check('whole action and floor stay between compact HUD areas',all(x0>.14 and x1<.82 and y0>.11 and y1<.89 for x0,x1,y0,y1 in bounds),bounds)
for id in ['s','vertical-hit','horizontal-hit','sword-clash']:
 pair=[s for s in chapters if s['id'].removesuffix('-slow')==id]
 check('normal first then same-event slow replay: '+id,len(pair)==2 and pair[0]['speed']==1 and pair[1]['speed']==.25 and pair[0]['start']<pair[1]['start'] and pair[0]['scale']==pair[1]['scale'],pair)
media=[]
for group in ['lift','controls','combat']:
 p=ROOT/f'docs/previews/orange-tabby/orange-tabby-{group}-v06.mp4';expected=sum(1 for r in rows if r['group']==group)/30
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));v=next(v for v in probe['streams'] if v['codec_type']=='video')
 check(group+' format and duration',v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and (v['width'],v['height'])==(1600,900) and v['r_frame_rate']=='30/1' and abs(float(probe['format']['duration'])-expected)<.05,{'duration':expected,'frames':v['nb_frames']})
 decoded=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,text=True);check(group+' full encoded decode',decoded.returncode==0 and not decoded.stderr,decoded.stderr or 'All frames decode.')
 media.append({'id':f'orange-tabby-{group}-v06','path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size,'duration_seconds':expected,'role':'Actual prepared Tripo mesh / isolated game-solver functional replay, beagle v07 format'})
for rel in ['scripts/blender/repivot_orange_tabby_v02.py','scripts/blender/orange_tabby_functional_v06.py','scripts/preview/encode-orange-tabby-v06.py','scripts/preview/verify-orange-tabby-v06.py']:ast.parse((ROOT/rel).read_text())
for rel in ['scripts/preview/orange-tabby-motion-v06.mjs','scripts/preview/verify-orange-tabby-v06.mjs','docs/previews/orange-tabby/try-v06.mjs']:subprocess.run(['node','--check',str(ROOT/rel)],check=True)
report={'version':'prepared-v02 / functional motion-v06','date':'2026-10-20','checks':checks,'loader_checks':len(loader['checks']),'lift_proof':lift,'media':media,'reference_analysis':'reference-analysis.json','review':'v05 rejected; v06 prepared for motion review; no runtime integration','limitations':['Ordinary idle hover uses declared bounded external lift; extra S rise is contact-driven.','The 48 interior paw spheres retain up to about 0.14 units of cosmetic surface undercoverage.','Virtual pivot height is a new motion proposal; actual-game balance/performance and playable acceptance remain pending.']}
(DATA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
m=read(BASE/'manifest.json');m['assets']=[a for a in m['assets'] if not a['id'].endswith('-v06') and a['id']!='orange-tabby-prepared-v02']+media+[{'id':'orange-tabby-prepared-v02','path':str((PREP/'orange-tabby-prepared-v02.glb').relative_to(ROOT)),'sha256':sha(PREP/'orange-tabby-prepared-v02.glb'),'role':'Neutral appearance unchanged; virtual paw pivots lowered for support lift; candidate, not runtime export'}]
m['verification']=[a for a in m['verification'] if 'motion-v06' not in a.get('path','')]+[{'path':str((DATA/'verification.json').relative_to(ROOT)),'technical_checks':'passed','user_acceptance':'v06 motion review pending'}]
m['reviews']=[r for r in m['reviews'] if r.get('artifact_version')!='orange-tabby-motion-v06']+[{'stage':'B/E revised motion and rig','artifact_version':'orange-tabby-motion-v06','asset_version':'orange-tabby-prepared-v02','status':'pending','scope':'S-driven paw-floor lift with unchanged neutral appearance, functional beagle-style videos'}]
moves=[]
for group in ['lift','controls','combat']:
 clock=0
 for shot in [s for s in chapters if s['group']==group]:
  moves.append({'id':shot['id'],'group':group,'start':round(clock,5),'end':round(clock+shot['duration'],5),'title':shot['title'],'speed':shot['speed'],'record_id':shot['id'].removesuffix('-slow'),'physical_offset':shot['offset']});clock+=shot['duration']
(DATA/'video-segments.json').write_text(json.dumps(moves,indent=2)+'\n')
m['moves']=moves
m['prepared_candidate']['review']='v06 motion/rig ready for user review; lower invisible pivots, original neutral geometry and atlas preserved'
m['stage']='v06 S support lift and beagle-style functional videos ready for review; v05 rejected'
m['interactive_preview']={'page':'docs/previews/orange-tabby/try-v06.html','review':'docs/previews/orange-tabby/review-v06.html','solver':'docs/previews/orange-tabby/physics-v06.mjs','model':'assets/concepts/orange-tabby/prepared-v02/orange-tabby-prepared-v02.glb','type':'Actual-model isolated functional solver; not integrated gameplay'}
m['delivery']['local']='Neutral-preserving lower-pivot asset v02, S-driven support lift and functional beagle-style v06 videos; installed/repo video standard updated and validated. No runtime integration or publication.'
(BASE/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'delivery_checks_passed':len(checks),'loader_checks_passed':len(loader['checks']),'lift':lift,'media':media},indent=2))
