"""Check seated detached-paw study artifacts and the untouched runtime source."""
from pathlib import Path
import json,hashlib,subprocess,ast
ROOT=Path(__file__).resolve().parents[2];DATA=ROOT/'assets/concepts/orange-tabby/motion-v03';OUT=ROOT/'output/orange-tabby-v03'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,ok,detail):
 checks.append(dict(name=name,passed=bool(ok),detail=detail))
 if not ok:raise AssertionError((name,detail))
saved=read(OUT/'preserved-source-sha256.json');changed=[p for p,h in saved.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]
check('existing runtime and beagle assets preserved',not changed,{'files':len(saved),'changed':changed})
manifest_path=ROOT/'assets/concepts/orange-tabby/manifest.json';m=read(manifest_path)
check('selected originals unchanged',all(sha(ROOT/x['path'])==x['sha256'] for x in m['inputs']),[x['path'] for x in m['inputs']])
sim=read(DATA/'game-solver-replay.json');shots={s['id']:s for s in sim['shots']};geometry=read(DATA/'geometry-verification.json')
check('current source provenance exact',sha(ROOT/sim['provenance']['source'])==sim['provenance']['sha256'],sim['provenance'])
check('ordinary input matrix present',all(x in shots for x in ['w','s','a','d','wa','wd','sa','sd','release-reverse','yaw-reverse','landing','opposites']),list(shots))
check('body retains the seated orientation',all(abs(p['bodyPitch'])<1e-9 for s in shots.values() for r in s['rows'] for p in r['players']),sim['verification'])
check('both swing directions produce support',shots['w']['stats']['travel'][0]>1 and shots['s']['stats']['travel'][0]<-1 and all(shots[k]['stats']['maxRise']>.3 for k in ['w','s']),{k:shots[k]['stats'] for k in ['w','s']})
check('contact point velocity agrees with transform',sim['verification']['contactVelocityFiniteDifferenceError']<1e-4,sim['verification']['contactVelocityFiniteDifferenceError'])
check('vertical hit is powered and contact confirmed',any(e['type']=='hit' and e['attacker']==0 and e['damage']>0 and e['turnShare']<.1 and .2<e['time']<1.2 for e in shots['vertical-hit']['events']),sim['candidates']['vertical-hit'])
check('horizontal hit is turning dominated',any(e['type']=='hit' and e['attacker']==0 and e['damage']>0 and e['turnShare']>.65 for e in shots['horizontal-hit']['events']),sim['candidates']['horizontal-hit'])
check('weapon interception and recoil are functional',any(e['type']=='clash' and e.get('recoilSpeed',0)>0 for e in shots['sword-clash']['events']),sim['candidates']['sword-clash'])
check('distant target is not hit',shots['near-miss']['stats']['hits']==0,shots['near-miss']['stats'])
check('shared repeat-hit gate is not duplicated',all(all(b-a>.27 for a,b in zip([e['time'] for e in s['events'] if e['type']=='hit' and e['attacker']==0],[e['time'] for e in s['events'] if e['type']=='hit' and e['attacker']==0][1:])) for s in shots.values()),'Multiple paw capsules share the ordinary attacker repeat-hit gate.')
check('opposites do not spend stamina',all(abs(r['players'][0]['stamina']-200)<1e-7 for r in shots['opposites']['rows']),'Gravity/support still act; canceled input supplies no drive or cost.')
check('ordinary shared stamina charges once',abs(shots['w']['stats']['minStamina']-157)<.25 and abs(shots['wa']['stats']['minStamina']-139.8)<.25,{'w':shots['w']['stats']['minStamina'],'wa':shots['wa']['stats']['minStamina']})
check('hands have no visible connectors',geometry['connector_mesh_count']==0 and sim['geometry']['visibleConnection'] is False,geometry)
check('giant hands clear the seated body',geometry['minimum_lateral_hand_body_gap']>.25 and geometry['body_posture']=='seated',geometry)
check('palms are almost twice the previous width',geometry['palm_width']/geometry['previous_palm_width']>1.9 and geometry['palm_width']>1.18,geometry)
refs=read(DATA/'pose-references.json')
check('seated pose references preserved and attributed',len(refs)==2 and all(sha(ROOT/r['path'])==r['sha256'] and r['author'] and r['license'] and r['source_url'] for r in refs),refs)
check('combat starts without overlap',all(shots[k]['stats']['initialOverlap']<1e-6 for k in ['vertical-hit','horizontal-hit','sword-clash','near-miss']),{k:shots[k]['stats']['initialOverlap'] for k in ['vertical-hit','horizontal-hit','sword-clash','near-miss']})
chapters=read(DATA/'chapters.json');bounds=[]
for s in chapters:
 x0,x1,y0,y1=s['bounds'];cx,cy=s['center'];scale=s['scale'];bounds.append([.5+(x0-cx)/scale,.5+(x1-cx)/scale,.512+(y0-cy)*1280/720/scale,.512+(y1-cy)*1280/720/scale])
check('complete motion remains clear of caption overlays',all(x0>.04 and x1<.96 and y0>.2153 and y1<.8083 for x0,x1,y0,y1 in bounds),bounds)
media=[]
for group,duration in [('controls',40),('combat',12.5),('design',4)]:
 p=ROOT/f'docs/previews/orange-tabby/orange-tabby-{group}-v03.mp4'
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));v=next(x for x in probe['streams'] if x['codec_type']=='video')
 check(group+' media format and duration',v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and v['width']==1280 and v['height']==720 and v['r_frame_rate']=='24/1' and abs(float(probe['format']['duration'])-duration)<.05,{'duration':probe['format']['duration'],'frames':v['nb_frames'],'codec':v['codec_name']})
 result=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,text=True)
 check(group+' full decode',result.returncode==0 and not result.stderr,result.stderr or 'All frames decode.')
 media.append({'id':f'orange-tabby-{group}-v03','path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size,'duration_seconds':duration,'role':'authored design turntable' if group=='design' else 'isolated current-game proxy solver replay'})
for rel in ['scripts/blender/orange_tabby_motion_v03.py','scripts/preview/encode-orange-tabby-v03.py','scripts/preview/verify-orange-tabby-v03.py']:ast.parse((ROOT/rel).read_text())
subprocess.run(['node','--check',str(ROOT/'scripts/preview/orange-tabby-motion-v03.mjs')],check=True)
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
report={'version':'orange-tabby-motion-v03','date':'2026-10-19','checks':checks,'media':media,'geometry':geometry,
 'review':{'seated_detached_larger_hands':'user directed','exact_motion':'pending','production_base':None,'runtime_cat':None},
 'limitations':sim['limitations']+['Large paw proxies cause about 2.12 units of rise, lateral drift and gravity-driven movement even on canceled input; tuning is unaccepted. Final mass, hurt shapes and contacts remain unvalidated.','Existing game regression baseline remains applicable to unchanged source; no cat runtime integration was tested.']}
(DATA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
m['stage']='seated detached-paw motion-v03 ready for model and motion review';m['current_motion']='orange-tabby-motion-v03'
for review in m['reviews']:
 if review.get('artifact_version') in ['orange-tabby-motion-v01','orange-tabby-motion-v02']:review['status']='superseded by user seated/detached/larger-hand request'
m['assets']=[x for x in m['assets'] if not x['id'].endswith('-v03')]+media+[{'id':'orange-tabby-blockout-v03','role':'primitive seated detached-paw study, never production base','path':str((DATA/'orange-tabby-seated-floating-paws-v03.blend').relative_to(ROOT)),'sha256':sha(DATA/'orange-tabby-seated-floating-paws-v03.blend')}]
m['moves']=read(DATA/'video-segments.json');m['reviews']=[x for x in m['reviews'] if x.get('artifact_version')!='orange-tabby-motion-v03']+[{'stage':'B revised motion','artifact_version':'orange-tabby-motion-v03','status':'pending','scope':'revised proportions and motion; seated pose, detached hands and further enlargement explicitly user requested'}]
m['verification']=[x for x in m.get('verification',[]) if 'motion-v03' not in x.get('path','')]+[{'path':str((DATA/'verification.json').relative_to(ROOT)),'technical_checks':'passed','motion_acceptance':'pending'}]
m['delivery']['local']='seated detached-paw design and proxy solver motion videos; no cat runtime or Tripo operation';manifest_path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
p=ROOT/'assets/concepts/orange-tabby/provenance.json';pr=read(p);pr['local_study_operations']=[x for x in pr.get('local_study_operations',[]) if x['id']!='motion-v03']+[{'id':'motion-v03','date':'2026-10-19','tools':['current local game solver in memory','Blender 5.2.2 LTS primitive blockout','Pillow captions','FFmpeg libx264'],'source_physics_sha256':sim['provenance']['sha256'],'changes':sim['provenance']['adaptations'],'scripts':['scripts/preview/orange-tabby-motion-v03.mjs','scripts/blender/orange_tabby_motion_v03.py','scripts/preview/encode-orange-tabby-v03.py'],'output_media':media,'production_generation':False,'spending':'no Tripo operation submitted'}]
pr['pose_references']=refs
if 'secondary_posture_reference' in pr:pr['secondary_posture_reference']['status']='historical; standing direction superseded by seated v03'
p.write_text(json.dumps(pr,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks_passed':len(checks),'source_files_preserved':len(saved),'media':media},indent=2))
