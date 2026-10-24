// Combat contacts only: forces, resources and ground support remain owned by
// the fixed-step world. Geometry/physics functions are injected to avoid a
// circular dependency and to exercise the same solver with small test shapes.
export const CONTACT_RULES=Object.freeze({
  hitCooldown:.28, separationDelay:.045, tolerance:1e-5,
  refinementPasses:10, impulsePasses:6,
});
const v=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=a=>Math.hypot(a.x,a.y,a.z);
const unit=(a,fallback=v())=>norm(a)>1e-8?mul(a,1/norm(a)):fallback;
const pose=p=>({...p,p:{...p.p},v:{...p.v}});
const lerp=(a,b,t)=>a+(b-a)*t;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const group=s=>s.side||s.ear||'weapon';
// Moving across fitted capsules of the same anatomical surface is an ongoing
// constraint, not a succession of new collisions with repeated restitution.
const physicalKey=c=>`${c.kind}:${c.a}>${c.b}:${c.part}|${c.kind==='clash'?c.sb.group:'body'}`;
const pointKey=p=>[p.x,p.y,p.z].map(n=>n.toFixed(9)).join(',');
const shapeKey=s=>{
  const ends=[pointKey(s.localA),pointKey(s.localB)].sort();
  return `${group(s)}:${ends.join(':')}:${s.radius}:${s.anchor||''}:${s.damageScale||1}`;
};
function unique(shapes){
  const found=new Map();
  for(const s of shapes){const key=shapeKey(s);if(!found.has(key))found.set(key,{...s,key,group:group(s)});}
  return [...found.values()];
}
function bounds(shapes){
  const min=v(Infinity,Infinity,Infinity),max=v(-Infinity,-Infinity,-Infinity);
  for(const s of shapes)for(const p of [s.a,s.b])for(const axis of ['x','y','z']){
    min[axis]=Math.min(min[axis],p[axis]-s.radius);
    max[axis]=Math.max(max[axis],p[axis]+s.radius);
  }
  return {min,max};
}
const overlaps=(a,b)=>['x','y','z'].every(k=>a.min[k]<=b.max[k]+CONTACT_RULES.tolerance&&b.min[k]<=a.max[k]+CONTACT_RULES.tolerance);
const segmentBounds=s=>({min:v(Math.min(s.a.x,s.b.x)-s.radius,Math.min(s.a.y,s.b.y)-s.radius,Math.min(s.a.z,s.b.z)-s.radius),
  max:v(Math.max(s.a.x,s.b.x)+s.radius,Math.max(s.a.y,s.b.y)+s.radius,Math.max(s.a.z,s.b.z)+s.radius)});

export class CombatContacts {
  constructor(world,physics){this.world=world;this.physics=physics;this.episodes=new Map();}

  episode(attacker,target,part){
    const key=`${attacker}>${target}:${part}`;
    if(!this.episodes.has(key))this.episodes.set(key,{processed:false,separated:1});
    return this.episodes.get(key);
  }

  geometry(players,options){
    const {weaponSegments,hurtSegments,closestSegments}=this.physics;
    const weapons=players.map(p=>weaponSegments(p)),bodies=players.map(p=>hurtSegments(p));
    const wb=weapons.map(bounds),bb=bodies.map(bounds),contacts=[];
    // Aggregate bounds are unchanged by duplicate capsules. Only build stable
    // shape keys and per-capsule bounds for pairs that can actually touch.
    const prepared=new Map();
    const prepare=shapes=>{
      if(!prepared.has(shapes)){
        const result=unique(shapes);
        for(const s of result)s.bounds=segmentBounds(s);
        prepared.set(shapes,result);
      }
      return prepared.get(shapes);
    };
    const inspect=(kind,a,b,first,second)=>{
      const firstShapes=prepare(first),secondShapes=prepare(second);
      for(const sa of firstShapes)for(const sb of secondShapes){
        if(!overlaps(sa.bounds,sb.bounds))continue;
        const c=closestSegments(sa.a,sa.b,sb.a,sb.b),depth=sa.radius+sb.radius-c.distance;
        if(depth < -CONTACT_RULES.tolerance)continue;
        contacts.push({kind,a,b,sa,sb,c,depth,part:sa.group,
          key:`${kind}:${a}>${b}:${sa.key}|${sb.key}`});
      }
    };
    if(options.clashes&&overlaps(wb[0],wb[1]))inspect('clash',0,1,weapons[0],weapons[1]);
    for(const a of options.attackers){const b=1-a;if(overlaps(wb[a],bb[b]))inspect('hit',a,b,weapons[a],bodies[b]);}
    return {contacts,groups:weapons.map(shapes=>new Set(shapes.map(group)))};
  }

  frame(p,s,t){return this.physics.weaponPointFrame(p,add(s.localA,mul(sub(s.localB,s.localA),t)),s.anchor);}

  impact(contact,players){
    const a=players[contact.a],b=players[contact.b],fa=this.frame(a,contact.sa,contact.c.s);
    const fb=contact.kind==='clash'?this.frame(b,contact.sb,contact.c.t):{velocity:b.v,jt:v(),jp:v()};
    const relative=sub(fa.velocity,fb.velocity);
    const fallback=unit(sub(a.p,b.p),unit(mul(relative,-1)));
    const normal=unit(sub(contact.c.a,contact.c.b),fallback);
    const closing=-dot(relative,normal);
    const mass=this.physics.effectiveMass(a,fa,normal)+(contact.kind==='clash'?this.physics.effectiveMass(b,fb,normal):this.physics.invMass);
    const incoming=Math.max(0,closing)/mass;
    const driving=add(mul(fa.jt,a.driveT),mul(fa.jp,a.driveP));
    const acceleration=Math.max(0,dot(driving,unit(sub(fa.velocity,a.v))));
    const turning=Math.max(0,-dot(mul(fa.jp,a.wp),normal));
    const swinging=Math.max(0,-dot(mul(fa.jt,a.wt),normal));
    const moving=Math.max(0,-dot(sub(a.v,b.v),normal));
    const total=turning+swinging+moving,turnShare=total>1e-8?turning/total:0;
    const damage=contact.kind==='hit'?Math.round(this.physics.damageForImpact(closing,acceleration)*
      (contact.sa.damageScale||1)*(1-(1-this.physics.config.turnDamageScale)*turnShare)):0;
    return {...contact,fa,fb,normal,closing,mass,incoming,acceleration,turnShare,damage};
  }

  observe(geometry,elapsed,options){
    const touching=new Set(geometry.contacts.filter(c=>c.kind==='hit').map(c=>`${c.a}:${c.part}`));
    for(const a of options.attackers){
      const record=this.world.contacts[a],any=geometry.contacts.some(c=>c.kind==='hit'&&c.a===a);
      record.separated=any?0:record.separated+elapsed;
      for(const part of geometry.groups[a]){
        const state=this.episode(a,1-a,part);
        if(touching.has(`${a}:${part}`)){
          if(state.separated>CONTACT_RULES.separationDelay)state.processed=false;
          state.separated=0;
        }else state.separated+=elapsed;
      }
    }
    if(options.clashes){
      if(geometry.contacts.some(c=>c.kind==='clash'))this.world.clashSeparated=0;
      else this.world.clashSeparated+=elapsed;
      if(this.world.clashSeparated>=this.physics.clash.separationDelay)this.world.clashArmed=true;
    }
  }

  // A manifold is a small set of independent contact patches. Source capsule
  // order and duplicated source shapes never become extra attacks or forces.
  manifold(contacts){
    const ordered=[...contacts].sort((a,b)=>b.incoming-a.incoming||b.depth-a.depth||this.orderKey(a).localeCompare(this.orderKey(b)));
    const result=[];
    for(const c of ordered){
      const duplicate=result.some(p=>p.kind===c.kind&&p.a===c.a&&p.b===c.b&&p.part===c.part&&
        (c.kind!=='clash'||p.sb.group===c.sb.group)&&dot(p.normal,c.normal)>.95&&
        norm(sub(mul(add(p.c.a,p.c.b),.5),mul(add(c.c.a,c.c.b),.5)))<
          Math.min(p.sa.radius+p.sb.radius,c.sa.radius+c.sb.radius)*.5);
      if(!duplicate)result.push(c);
    }
    return result.sort((a,b)=>this.orderKey(a).localeCompare(this.orderKey(b)));
  }

  orderKey(c){
    const n=c.normal,sign=n.x||n.y||n.z;
    return `${pointKey(mul(add(c.c.a,c.c.b),.5))}:${pointKey(sign<0?mul(n,-1):n)}:${c.kind}:${[c.sa.key,c.sb.key].sort().join('|')}`;
  }

  resolveBatch(raw,players,dt,clock,handled){
    const world=this.world,impacts=raw.filter(c=>c.depth>0).map(c=>this.impact(c,players));
    // Previously active patches stay in the coupled constraint set, but only
    // new impacts receive restitution. Later impulses can load an old contact.
    const physical=this.manifold(impacts.map(c=>({...c,newImpact:!handled.has(physicalKey(c))})));
    this.lastStep.batches++;
    this.lastStep.physicalContacts+=physical.length;
    const work=players.map(pose),lambdas=physical.map(()=>0);
    // Coupled constraints run on private working velocities; every damage
    // calculation above reads the common incoming state, never P1's result.
    for(let pass=0;pass<CONTACT_RULES.impulsePasses;pass++)for(const [index,c]of physical.entries()){
      const a=work[c.a],b=work[c.b],fa=this.frame(a,c.sa,c.c.s);
      const fb=c.kind==='clash'?this.frame(b,c.sb,c.c.t):{velocity:b.v};
      const normalVelocity=dot(sub(fa.velocity,fb.velocity),c.normal);
      const bounce=c.newImpact?Math.max(0,c.closing)*(c.kind==='clash'?.35:.12):0;
      const bias=Math.min(4,c.kind==='clash'?c.depth*.13/dt:Math.max(0,c.depth-.008)*.12/dt);
      const next=Math.max(0,lambdas[index]+(bounce+bias-normalVelocity)/c.mass);
      const force=mul(c.normal,next-lambdas[index]);lambdas[index]=next;
      this.physics.impulse(a,fa,force,players[c.a]);
      if(c.kind==='clash')this.physics.impulse(b,this.frame(b,c.sb,c.c.t),mul(force,-1),players[c.b]);
      else b.v=sub(b.v,mul(force,this.physics.invMass));
    }
    for(const c of impacts)handled.add(physicalKey(c));

    const hits=[];
    for(const a of [0,1]){
      const candidates=impacts.filter(c=>c.kind==='hit'&&c.a===a&&c.damage>0&&players[a].health>0&&players[c.b].health>0&&
        !this.episode(c.a,c.b,c.part).processed);
      if(!candidates.length)continue;
      // Consume all qualifying parts, including cooldown-suppressed impacts.
      // An intrinsically harmless touch consumes nothing and is rechecked.
      for(const c of candidates)this.episode(c.a,c.b,c.part).processed=true;
      if(clock-players[a].lastAttackAt<=CONTACT_RULES.hitCooldown)continue;
      candidates.sort((x,y)=>y.incoming-x.incoming||this.orderKey(x).localeCompare(this.orderKey(y)));
      hits.push(candidates[0]);
    }
    hits.sort((a,b)=>this.orderKey(a).localeCompare(this.orderKey(b)));
    for(const c of hits){
      const a=world.players[c.a],b=world.players[c.b];
      b.health=Math.max(world.practice?1:0,b.health-c.damage);
      b.hitFlash=1;b.lastHitAt=clock;
      a.lastAttackAt=clock;a.lastDamage=c.damage;a.totalDamage+=c.damage;
      work[c.b].v=sub(work[c.b].v,mul(c.normal,c.damage*.07));
      world.lastHit={damage:c.damage,speed:c.closing,acceleration:c.acceleration,turnShare:c.turnShare,attacker:a.id};
      world.events.push({type:'hit',point:c.c.a,normal:mul(c.normal,-1),attacker:a.id,target:b.id,
        damage:c.damage,speed:c.closing,acceleration:c.acceleration,turnShare:c.turnShare,
        strength:this.physics.clamp(c.damage/30,.12,1),time:clock});
    }
    const clashes=impacts.filter(c=>c.kind==='clash'&&c.closing>this.physics.clash.minSpeed);
    if(clashes.length&&world.clashArmed&&clock-world.lastClash>this.physics.clash.cooldown){
      clashes.sort((a,b)=>b.incoming-a.incoming||this.orderKey(a).localeCompare(this.orderKey(b)));
      const c=clashes[0],settings=this.physics.clash;
      world.lastClash=clock;world.clashArmed=false;
      const effort=this.physics.clamp((c.closing-settings.minSpeed)/(settings.fullSpeed-settings.minSpeed),0,1);
      const recoilSpeed=settings.minRecoilSpeed+(settings.maxRecoilSpeed-settings.minRecoilSpeed)*effort;
      const axis=unit(v(work[1].p.x-work[0].p.x,0,work[1].p.z-work[0].p.z),
        unit(v(-c.normal.x,0,-c.normal.z),v(1,0,0)));
      this.physics.recoilFromClash(work[0],recoilSpeed,mul(axis,-1));
      this.physics.recoilFromClash(work[1],recoilSpeed,axis);
      world.events.push({type:'clash',point:mul(add(c.c.a,c.c.b),.5),
        strength:this.physics.clamp(c.closing/settings.fullSpeed,.2,1),recoilSpeed,axis,time:clock});
    }
    for(const [id,p]of world.players.entries()){
      const limit=this.physics.weaponStats(p).maxAngularSpeed,speed=norm(work[id].v);
      p.v=speed>15?mul(work[id].v,15/speed):work[id].v;
      p.wt=this.physics.clamp(work[id].wt,-limit,limit);
      p.wp=this.physics.clamp(work[id].wp,-limit,limit);
    }
    return physical.length>0;
  }

  sample(path,t){
    return path.map(({start,end})=>({...start,
      p:add(start.p,mul(sub(end.p,start.p),t)),theta:lerp(start.theta,end.theta,t),phi:lerp(start.phi,end.phi,t),
      earSpread:lerp(start.earSpread||0,end.earSpread||0,t),earLag:lerp(start.earLag||0,end.earLag||0,t)}));
  }

  find(path,handled,options){
    const motions=path.map(({start,end})=>this.physics.contactMotion(end,start));
    const samples=this.physics.clamp(Math.ceil((motions[0].travel+motions[1].travel)/
      (Math.min(motions[0].radius,motions[1].radius)*this.physics.config.contactTravelFraction)),1,this.physics.config.maxContactSubsteps);
    const observations=[],released=new Set();
    const inspect=t=>{
      const players=this.sample(path,t),geometry=this.geometry(players,options);
      const active=geometry.contacts.filter(c=>{
        if(c.depth<=0)return false;
        if(!handled.has(physicalKey(c))||released.has(physicalKey(c)))return true;
        return c.kind==='hit'&&players[c.a].health>0&&players[c.b].health>0&&
          !this.episode(c.a,c.b,c.part).processed&&this.impact(c,players).damage>0;
      });
      return {t,players,geometry,active};
    };
    for(let index=0;index<=samples;index++){
      let current=inspect(index/samples);
      const present=new Set(current.geometry.contacts.map(physicalKey));
      for(const key of handled)if(!present.has(key))released.add(key);
      if(current.active.length){
        if(index>0){
          let low=(index-1)/samples,high=index/samples;
          for(let pass=0;pass<CONTACT_RULES.refinementPasses;pass++){
            const middle=(low+high)/2,probe=inspect(middle);
            if(probe.active.length){high=middle;current=probe;}else low=middle;
          }
        }
        observations.push(current);
        return {current,observations,released};
      }
      observations.push(current);
    }
    return {current:null,observations,released};
  }

  resolve(previous,dt,{attackers=[0,1],clashes=true}={}){
    const world=this.world,options={attackers,clashes};
    if(world.players.length!==2)return false;
    this.lastStep={batches:0,physicalContacts:0};
    let path=world.players.map(p=>{
      const end=pose(p),old=previous?.[p.id];
      const start=old?{...pose(p),...old,p:{...old.p}}:pose(p);
      end.phi=start.phi+wrap(end.phi-start.phi);
      return {start,end};
    });
    let remaining=dt,elapsed=0,changed=false;
    const handled=new Set();
    // Each pass consumes a new physical patch or a new logical impact episode.
    // There is no arbitrary event-count cutoff that silently drops later hits.
    while(true){
      const {current,observations,released}=this.find(path,handled,options);
      let last=0,prior=null;
      for(const observation of observations){
        // Conservatively require an entire observed interval to be clear
        // before advancing separation timers; sampling cannot rearm early.
        const present=prior?{...observation.geometry,contacts:[...prior.contacts,...observation.geometry.contacts]}:observation.geometry;
        this.observe(present,(observation.t-last)*remaining,options);
        this.observe(observation.geometry,0,options);
        last=observation.t;prior=observation.geometry;
      }
      if(!current){
        for(const [id,p]of world.players.entries())this.setPose(p,path[id].end);
        break;
      }
      const used=current.t*remaining;elapsed+=used;remaining-=used;
      for(const [id,p]of world.players.entries())this.setPose(p,current.players[id]);
      const before=world.players.map(pose);
      for(const key of released)handled.delete(key);
      changed=this.resolveBatch(current.geometry.contacts,before,dt,(previous?world.time-dt:world.time)+elapsed,handled)||changed;
      if(!previous){
        this.observe(current.geometry,dt,options);
        break; // Public single-pose contact queries do not integrate motion.
      }
      path=world.players.map((p,id)=>{
        const start=pose(p),end={...path[id].end,
          p:add(path[id].end.p,mul(sub(p.v,before[id].v),remaining)),
          theta:path[id].end.theta+(p.wt-before[id].wt)*remaining,
          phi:path[id].end.phi+(p.wp-before[id].wp)*remaining};
        return {start,end};
      });
      if(remaining<1e-12)break;
    }
    return changed;
  }

  setPose(p,other){
    p.p={...other.p};p.theta=other.theta;p.phi=other.phi%(Math.PI*2);
    p.earSpread=other.earSpread;p.earLag=other.earLag;
  }
}
