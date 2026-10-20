"""Verify actual-model review delivery, encoded playback and provenance."""
from pathlib import Path
import json,hashlib,subprocess,ast
ROOT=Path(__file__).resolve().parents[2];DATA=ROOT/'assets/concepts/orange-tabby/motion-v05'
PREP=ROOT/'assets/concepts/orange-tabby/prepared-v01'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,ok,detail):
 checks.append({'name':name,'passed':bool(ok),'detail':detail})
 if not ok:raise AssertionError((name,detail))
m=read(ROOT/'assets/concepts/orange-tabby/manifest.json');sim=read(DATA/'game-solver-replay.json');shots={s['id']:s for s in sim['shots']}
check('selected supplied/reference originals remain unchanged',all(sha(ROOT/x['path'])==x['sha256'] for x in m['inputs']),[x['path'] for x in m['inputs']])
check('original Tripo source remains unchanged',sha(ROOT/'assets/concepts/orange-tabby/tripo-v01/orange-tabby-tripo-v01-source.glb')=='4241a26dbfb8f87e4c16c34b07c9319dd368523263b18b50ae3cdaa2e0485912','No replacement generation or source edits.')
check('replay uses the recorded physics source',sha(ROOT/sim['provenance']['source'])==sim['provenance']['sha256'],sim['provenance']['sha256'])
(DATA/'source-physics-snapshot.txt').write_bytes((ROOT/sim['provenance']['source']).read_bytes())
check('actual prepared export is the video model',sha(PREP/'orange-tabby-prepared-v01.glb')==sim['geometry']['modelSha256'],sim['geometry']['modelSha256'])
check('body remains upright',all(abs(p['bodyPitch'])<1e-9 for s in shots.values() for r in s['rows'] for p in r['players']),'Seated body follows common heading, not paw pitch.')
check('opposite input and idle cost nothing and remain stationary',all(abs(s['stats']['travel'][0])+abs(s['stats']['travel'][1])<1e-6 and s['stats']['minStamina']==200 for s in [shots['hover-idle'],shots['opposites']]),'Canceled input supplies no motor or stamina drain.')
check('both swing directions produce opposite support travel',shots['w']['stats']['travel'][0]>1 and shots['s']['stats']['travel'][0]<-1 and all(shots[k]['stats']['contactSamples']>0 for k in ['w','s']),{k:shots[k]['stats'] for k in ['w','s']})
check('ordinary low hover and paw-contact rise stay bounded',abs(sim['verification']['idleBaseClearance']-.35)<1e-7 and all(.35<shots[k]['stats']['maxRise']<.7 for k in ['w','s','wa','wd','sa','sd']),{k:shots[k]['stats']['maxRise'] for k in ['w','s','wa','wd','sa','sd']})
check('analytical contact velocity agrees with transform',sim['verification']['contactVelocityFiniteDifferenceError']<1e-4,sim['verification']['contactVelocityFiniteDifferenceError'])
check('repeat-hit gates are shared across the paw pair',all(all(b-a>.27 for a,b in zip(times,times[1:])) for times in [[e['time'] for e in s['events'] if e['type']=='hit' and e['attacker']==0] for s in shots.values()]),'One attacker hit gate, not one award per contact sphere.')
check('ordinary stamina is charged once for both paws',abs(shots['w']['stats']['minStamina']-157)<.25 and abs(shots['wa']['stats']['minStamina']-139.8)<.25,{k:shots[k]['stats']['minStamina'] for k in ['w','wa']})
loader=read(PREP/'loader-verification.json');check('actual export loader/control checks pass',len(loader['checks'])==26 and all(c['passed'] for c in loader['checks']),{'checks':len(loader['checks'])})
chapters=read(DATA/'chapters.json');bounds=[]
for s in chapters:
 x0,x1,y0,y1=s['bounds'];cx,cy=s['center'];scale=s['scale'];bounds.append([.5+(x0-cx)/scale,.5+(x1-cx)/scale,.512+(y0-cy)*1280/720/scale,.512+(y1-cy)*1280/720/scale])
check('full-motion mesh bounds stay clear of captions',all(x0>.04 and x1<.96 and y0>.2153 and y1<.8083 for x0,x1,y0,y1 in bounds),bounds)
media=[]
for group,duration in [('controls',44),('combat',12.5),('design',4)]:
 p=ROOT/f'docs/previews/orange-tabby/orange-tabby-{group}-v05.mp4'
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));v=next(x for x in probe['streams'] if x['codec_type']=='video')
 check(group+' video format/duration',v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and v['width']==1280 and v['height']==720 and v['r_frame_rate']=='24/1' and abs(float(probe['format']['duration'])-duration)<.05,{'duration':probe['format']['duration'],'frames':v['nb_frames'],'codec':v['codec_name']})
 result=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,text=True)
 check(group+' full encoded decode',result.returncode==0 and not result.stderr,result.stderr or 'All encoded frames decode.')
 media.append({'id':f'orange-tabby-{group}-v05','path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size,'duration_seconds':duration,'role':'actual prepared Tripo asset turntable' if group=='design' else 'actual prepared Tripo mesh / isolated game solver replay'})
for name in ['prepare_orange_tabby_v01','fit_orange_tabby_contacts_v01','review_orange_tabby_v01','orange_tabby_motion_v05']:ast.parse((ROOT/f'scripts/blender/{name}.py').read_text())
for name in ['encode-orange-tabby-v05','verify-orange-tabby-v05']:ast.parse((ROOT/f'scripts/preview/{name}.py').read_text())
for rel in ['scripts/preview/orange-tabby-motion-v05.mjs','scripts/preview/verify-orange-tabby-v05.mjs','docs/previews/orange-tabby/try-v05.mjs']:subprocess.run(['node','--check',str(ROOT/rel)],check=True)
report={'version':'orange-tabby-motion-v05 / prepared-v01','date':'2026-10-20','checks':checks,'media':media,'loader_checks_passed':len(loader['checks']),'body_radius_correction':{'reproduced':.38,'correct_measured':.58,'root_cause':'Preview loadout normalization retained basic-fighter characterStats despite the new weapon profile. Corrected the isolated character profile.','control_rows_unchanged':True},'review':{'motion_B':'pending','prepared_asset_E':'pending','runtime':None},'limitations':sim['limitations']+['Paw mesh surface undercoverage reaches about 0.14 units; ear tips and tail are cosmetic.','Low damage and travel pace are trial balance; actual-game integration/acceptance remain future work.']}
(DATA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
m['assets']=[x for x in m['assets'] if not x['id'].endswith('-v05') and x['id']!='orange-tabby-prepared-v01']+media+[{'id':'orange-tabby-prepared-v01','path':str((PREP/'orange-tabby-prepared-v01.glb').relative_to(ROOT)),'sha256':sha(PREP/'orange-tabby-prepared-v01.glb'),'bytes':(PREP/'orange-tabby-prepared-v01.glb').stat().st_size,'role':'actual optimized Tripo mesh; candidate for integration review, not selected runtime export'}]
m['reviews']=[x for x in m['reviews'] if x.get('artifact_version')!='orange-tabby-motion-v05']+[{'stage':'B/E combined','artifact_version':'orange-tabby-motion-v05','asset_version':'orange-tabby-prepared-v01','status':'pending','decision':'Use this actual prepared model and presented ordinary motion for character-scoped runtime integration.'}]
m['verification']=[x for x in m['verification'] if 'motion-v05' not in x.get('path','')]+[{'path':str((DATA/'verification.json').relative_to(ROOT)),'technical_checks':'passed','user_acceptance':'motion B / asset E pending'}]
(ROOT/'assets/concepts/orange-tabby/manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'delivery_checks_passed':len(checks),'loader_checks_passed':len(loader['checks']),'media':media},indent=2))
