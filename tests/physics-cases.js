import { ArenaPhysics, CONFIG, staffFrame, damageForImpact, closestSegments, v3 } from '../src/physics.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const near = (a, b, tolerance = 1e-8) => assert(Math.abs(a - b) <= tolerance, `Expected ${a} ≈ ${b} (±${tolerance})`);
const idle = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
function run(world, seconds, input = idle) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) {
    world.step(typeof input === 'function' ? input(i * CONFIG.step) : input);
    events.push(...world.events.map(e => ({ ...e, time: world.time })));
  }
  return events;
}
function isolated() {
  const world = new ArenaPhysics();
  world.players[0].p.x = -1.5;
  world.players[1].p.x = 5;
  world.players[1].p.z = -3;
  return world;
}
function attackSetup() {
  const world = new ArenaPhysics();
  const [a, b] = world.players;
  a.p = v3(0, CONFIG.bodyFloor, 0); a.theta = Math.PI / 2; a.phi = -0.6; a.wp = 4;
  b.p = v3(2, CONFIG.bodyFloor, 0); b.theta = 0.12; b.phi = Math.PI;
  return world;
}

export const cases = [
  ['静止角色不会自主漂移或掉血', () => {
    const w = new ArenaPhysics(); w.players.forEach(p => { p.theta = 0; }); const before = w.players.map(p => ({ ...p.p }));
    run(w, 5);
    w.players.forEach((p, i) => { near(p.p.x, before[i].x); near(p.p.z, before[i].z); near(p.p.y, CONFIG.bodyFloor); assert(p.health === 100, 'idle damage'); });
  }],
  ['棍子在整个角度范围始终保持固定长度', () => {
    const w = isolated(); const p = w.players[0];
    for (let i = 0; i < 600; i++) {
      p.theta = (i / 600 * 8 - 4) * Math.PI; p.phi = i * 0.7;
      const tip = staffFrame(p).point;
      near(Math.hypot(tip.x - p.p.x, tip.y - p.p.y, tip.z - p.p.z), CONFIG.staffOffset + CONFIG.staffLength);
      const base = staffFrame(p, 0).point;
      near(Math.hypot(base.x - p.p.x, base.y - p.p.y, base.z - p.p.z), CONFIG.staffOffset);
      near(Math.hypot(tip.x - base.x, tip.y - base.y, tip.z - base.z), CONFIG.staffLength);
    }
  }],
  ['悬空棍子转过头顶和身体各方向都保留间隙', () => {
    const w = isolated(); const p = w.players[0];
    const headCenter = v3(p.p.x, p.p.y + 0.76, p.p.z);
    for (let i = 0; i <= 64; i++) {
      p.theta = i / 64 * Math.PI * 2; p.phi = i * 0.7;
      const base = staffFrame(p, 0).point, tip = staffFrame(p).point;
      const bodyGap = closestSegments(base, tip, p.p, p.p).distance - 0.55 - CONFIG.staffRadius;
      const headGap = closestSegments(base, tip, headCenter, headCenter).distance - 0.4 - CONFIG.staffRadius;
      assert(bodyGap > 0.05 && headGap > 0.05, 'floating staff must clear the entire character');
    }
  }],
  ['身体与悬空棍子之间的空隙不会造成伤害或击退', () => {
    const w = new ArenaPhysics(); const [a, b] = w.players;
    a.p = v3(0, 10, 0); a.theta = Math.PI / 2; a.phi = 0; a.wp = 4;
    b.p = v3(0.75, 10, 0.1);
    w.solveAttack(a, b, CONFIG.step);
    assert(b.health === 100 && w.events.length === 0, 'empty gap must not deal damage');
    near(Math.hypot(b.v.x, b.v.y, b.v.z), 0); near(a.wp, 4);
  }],
  ['另一根棍子穿过悬空间隙不会触发格挡', () => {
    const w = new ArenaPhysics(); const [a, b] = w.players;
    a.p = v3(0, 10, 0); b.p = v3(0.75, 10.03, -1.6);
    a.theta = b.theta = Math.PI / 2; a.phi = 0; b.phi = Math.PI / 2;
    a.wt = -3; b.wt = 3;
    w.solveStaffClash(CONFIG.step);
    near(a.wt, -3); near(b.wt, 3);
    near(Math.hypot(a.v.x, a.v.y, a.v.z), 0); near(Math.hypot(b.v.x, b.v.y, b.v.z), 0);
    assert(w.events.length === 0, 'empty gap must not block another staff');
  }],
  ['悬空棍子的内端接触对手也能正常命中', () => {
    const w = new ArenaPhysics(); const [a, b] = w.players;
    a.p = v3(0, 10, 0); a.theta = Math.PI / 2; a.phi = 0; a.wp = 4;
    b.p = v3(CONFIG.staffOffset - 0.15, 10, 0.25);
    w.solveAttack(a, b, CONFIG.step);
    assert(b.health < 100 && w.events.some(e => e.type === 'hit'), 'solid inner end must hit');
    near(w.events[0].point.x, CONFIG.staffOffset);
  }],
  ['空中挥棍不会无接触推动主体', () => {
    const w = isolated(); const p = w.players[0]; p.p.y = 15; const before = { ...p.p };
    run(w, 0.4, [{ theta: 1, phi: 1 }, {}]);
    near(p.p.x, before.x); near(p.p.z, before.z); near(p.v.x, 0); near(p.v.z, 0);
    assert(p.p.y < before.y, 'gravity should act'); assert(!p.staffGrounded, 'staff should be airborne');
  }],
  ['松键保留惯性，阻尼持续减速', () => {
    const w = isolated(); const p = w.players[0]; p.theta = 0.8;
    run(w, 0.15, [{ phi: 1 }, {}]); const speed = p.wp, angle = p.phi;
    run(w, 0.2);
    assert(p.wp > 0 && p.wp < speed, 'must coast with decay'); assert(p.phi > angle, 'must keep moving after release');
    near(p.wp, speed * Math.exp(-CONFIG.damping * 0.2), 1e-6);
  }],
  ['反向输入先刹车，然后反转', () => {
    const w = isolated(); const p = w.players[0]; p.theta = 0.8; p.wp = 5;
    w.step([{ phi: -1 }, {}]); assert(p.wp > 0 && p.wp < 5, 'should not reverse instantly');
    run(w, 0.35, [{ phi: -1 }, {}]); assert(p.wp < 0, 'should eventually reverse');
  }],
  ['双方在不同方位按住上下键都能到达边界并提前减速', () => {
    for (const id of [0, 1]) for (const direction of [-1, 1]) {
      for (const phi of [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
        const w = isolated(); const p = w.players[id]; p.p.y = 100; p.phi = phi;
        const target = direction < 0 ? 0 : Math.PI;
        const inputs = [{}, {}]; inputs[id] = { theta: direction };
        let peak = 0, braked = false;
        for (let i = 0; i < 360; i++) {
          const before = p.theta, speed = Math.abs(p.wt);
          w.step(inputs);
          assert(p.theta >= 0 && p.theta <= Math.PI, 'overshot pole');
          assert(direction * (p.theta - before) >= -1e-10, 'bounced');
          peak = Math.max(peak, Math.abs(p.wt));
          if (speed > 0.2 && Math.abs(p.wt) < speed) braked = true;
          if (before !== target && p.theta === target) assert(speed < 0.2, 'did not brake before endpoint');
        }
        near(p.theta, target); near(p.wt, 0);
        assert(peak > 1 && braked, 'missing acceleration/braking');
      }
    }
  }],
  ['双方松手保留瞬时角速度，并在重力作用下改变转速', () => {
    for (const id of [0, 1]) for (const direction of [-1, 1]) {
      const w = isolated(); const p = w.players[id]; p.p.y = 100;
      const input = [{}, {}]; input[id] = { theta: direction };
      run(w, 0.1, input); const angle = p.theta, speed = p.wt;
      w.setPolarInput(id, 0);
      near(p.theta, angle); near(p.wt, speed);
      assert(p.thetaTarget === null, 'release must remove motor target');
      w.step(idle);
      assert(p.theta !== angle && p.wt !== 0, 'release must not freeze motion');
      assert(p.wt > speed, 'gravity must accelerate toward lower pose');
    }
  }],
  ['松手后再次按键继续转动，也能反方向调整', () => {
    const w = isolated(); const p = w.players[0]; p.p.y = 100; p.theta = Math.PI / 2;
    run(w, 0.15, [{ theta: -1 }, {}]); w.step(idle); const stopped = p.theta;
    run(w, 0.1, [{ theta: -1 }, {}]); assert(p.theta < stopped, 'resume should move up');
    const speed = p.wt; w.step([{ theta: 1 }, {}]);
    assert(p.wt < 0 && p.wt > speed, 'reversing held input should brake first');
    run(w, 2, [{ theta: 1 }, {}]); near(p.theta, Math.PI); near(p.wt, 0);
  }],
  ['自由摆动会越过 180 度、回摆并通过阻尼耗能', () => {
    const w = isolated(); const p = w.players[0]; p.p.y = 10000;
    p.theta = Math.PI / 2;
    const center = CONFIG.staffOffset + CONFIG.staffLength / 2;
    const gravity = CONFIG.gravity * center / (center ** 2 + CONFIG.staffLength ** 2 / 12);
    const energy = () => p.wt ** 2 / 2 + gravity * (1 + Math.cos(p.theta));
    const initialEnergy = energy(); let crossed = false, returned = false;
    for (let i = 0; i < 1800; i++) {
      w.step(idle);
      if (p.theta > Math.PI) crossed = true;
      if (crossed && p.wt < 0) returned = true;
    }
    assert(crossed && returned, 'must overshoot and swing back');
    assert(energy() < initialEnergy * 0.01, 'damping must dissipate swing energy');
  }],
  ['上甩松手可越过 0 度，不被边界截停', () => {
    const w = isolated(); const p = w.players[0]; p.p.y = 100;
    p.theta = 0.02; p.wt = -2; p.polarInput = -1; p.thetaTarget = 0;
    w.setPolarInput(0, 0); run(w, 0.1);
    assert(p.theta < 0 && p.wt < 0, 'upper pole must not clamp free motion');
  }],
  ['上甩松手最多越过顶点十度，停稳后松手不产生运动', () => {
    const w = isolated(); const p = w.players[0]; p.p.y = 100;
    p.theta = 0.02; p.wt = -2; p.polarInput = -1; p.thetaTarget = 0;
    w.setPolarInput(0, 0);
    let furthest = 0;
    for (let i = 0; i < 180; i++) {
      w.step(idle); furthest = Math.min(furthest, p.theta);
    }
    assert(furthest < 0 && furthest >= -CONFIG.upFollowThrough - 1e-8, 'release exceeded ten degrees');
    const stopped = isolated(); const top = stopped.players[0]; top.p.y = 100;
    top.theta = 0; top.wt = 0; top.thetaTarget = 0; top.polarInput = -1;
    stopped.setPolarInput(0, 0); run(stopped, 0.2);
    near(top.theta, 0); near(top.wt, 0);
  }],
  ['在顶点按下砸延续上甩方向，不反转', () => {
    for (const [start, sign] of [[0.6, -1], [-0.6, 1]]) {
      const w = isolated(); const p = w.players[0]; p.p.y = 100; p.theta = start;
      run(w, 2, [{ theta: -1 }, {}]);
      near(p.theta, 0); near(p.wt, 0);
      w.setPolarInput(0, 1);
      near(p.thetaTarget, sign * Math.PI);
      run(w, 0.1, [{ theta: 1 }, {}]);
      assert(sign * p.theta > 0, 'down input reversed at the top');
    }
  }],
  ['越过极点后重新按键仍正确向上或向下', () => {
    for (const angle of [-0.4, Math.PI + 0.4, 2 * Math.PI + 0.4]) {
      for (const direction of [-1, 1]) {
        const w = isolated(); const p = w.players[0]; p.p.y = 100;
        p.theta = angle; const height = Math.cos(angle);
        run(w, 0.1, [{ theta: direction }, {}]);
        assert(direction * (Math.cos(p.theta) - height) < 0, 'wrong vertical direction after pole crossing');
        run(w, 2, [{ theta: direction }, {}]);
        near(Math.cos(p.theta), direction < 0 ? 1 : -1); near(p.wt, 0);
      }
    }
  }],
  ['持续下砸仍能撑地并停在 180 度', () => {
    const w = isolated(); const p = w.players[0]; p.phi = 0;
    const startX = p.p.x; let highest = p.p.y;
    for (let i = 0; i < 900; i++) {
      w.step([{ theta: 1 }, {}]); highest = Math.max(highest, p.p.y);
      assert(staffFrame(p).point.y > -0.1, 'staff penetrated floor');
    }
    assert(p.p.x > startX + 0.5 && highest > CONFIG.bodyFloor + 0.8, 'ground propulsion lost');
    near(p.theta, Math.PI); near(p.wt, 0);
  }],
  ['达到转速上限后不会持续获得加速度加成', () => {
    const w = isolated(); const p = w.players[0]; p.theta = 0.8; p.p.y = 100;
    run(w, 2, [{ phi: 1 }, {}]);
    near(p.wp, CONFIG.maxAngularSpeed); assert(Math.abs(p.driveP) < 0.01, 'capped motor must have zero net acceleration');
  }],
  ['撑地能抬起主体，并朝棍端落点移动', () => {
    const w = isolated(); const p = w.players[0]; p.phi = 0; const x = p.p.x;
    let highest = p.p.y, minimumTip = Infinity;
    for (let i = 0; i < 180; i++) {
      w.step([{ theta: 1 }, {}]); highest = Math.max(highest, p.p.y);
      minimumTip = Math.min(minimumTip, staffFrame(p).point.y);
    }
    assert(p.p.x > x + 0.5, 'ground contact should propel body');
    assert(highest > CONFIG.bodyFloor + 0.8, 'pole should lift body');
    assert(minimumTip > -0.1, `excessive floor penetration: ${minimumTip}`);
  }],
  ['改变方位角会改变撑地的移动方向', () => {
    const w = isolated(); const p = w.players[0]; p.phi = Math.PI / 2; const before = { ...p.p };
    run(w, 0.8, [{ theta: 1 }, {}]);
    assert(p.p.z > before.z + 0.5, 'should move along +Z'); near(p.p.x, before.x, 0.02);
  }],
  ['轻触不伤血，速度与有效加速度增加伤害且有上限', () => {
    assert(damageForImpact(1, 10000) === 0, 'slow touch must not hurt');
    assert(damageForImpact(8, 0) > damageForImpact(4, 0), 'speed must matter');
    assert(damageForImpact(8, 40) > damageForImpact(8, 0), 'acceleration must matter');
    assert(damageForImpact(8, -100) === damageForImpact(8, 0), 'braking must not boost damage');
    assert(damageForImpact(10000, 10000) === 34, 'damage cap');
    assert(damageForImpact(8, 0) > 0, 'fast coasting swing still hurts');
  }],
  ['一次实际挥击扣血、产生反馈事件并击退对手', () => {
    const w = attackSetup(); const target = w.players[1]; const before = { ...target.p };
    const events = run(w, 0.55, [{ phi: 1 }, {}]); const hits = events.filter(e => e.type === 'hit' && e.attacker === 0);
    assert(hits.length >= 1, 'swing must hit'); assert(target.health < 100, 'target must lose health');
    assert(Math.hypot(target.p.x - before.x, target.p.z - before.z) > 0.1, 'target must be knocked back');
    assert(hits[0].speed >= 1.65 && hits[0].strength > 0 && hits[0].damage > 0, 'feedback needs impact data');
  }],
  ['持续贴住身体不会每帧重复伤害', () => {
    const w = attackSetup(); const [a, b] = w.players;
    const events = run(w, 0.8, [{ phi: 1 }, {}]).filter(e => e.type === 'hit' && e.attacker === 0);
    for (let i = 1; i < events.length; i++) assert(events[i].time - events[i - 1].time >= 0.28, 'duplicate hit');
    a.p = v3(0, CONFIG.bodyFloor, 0); b.p = v3(2, CONFIG.bodyFloor, 0);
    a.theta = Math.PI / 2; a.phi = 0; a.wp = 0; a.wt = 0; a.v = v3(); b.v = v3();
    const health = b.health;
    for (let i = 0; i < 100; i++) { w.events.length = 0; w.solveAttack(a, b, CONFIG.step); }
    assert(b.health === health, 'resting overlap must not drain health');
  }],
  ['归零判胜、结算后停止物理、重开完整复位', () => {
    const w = attackSetup(); w.players[1].health = 1;
    run(w, 0.5, [{ phi: 1 }, {}]);
    assert(w.winner === 0, 'P1 should win'); assert(w.players[1].health === 0, 'health should clamp at zero');
    const t = w.time; w.step([{ phi: 1 }, { theta: 1 }]); near(w.time, t);
    w.reset(); assert(w.winner === null && w.time === 0 && w.events.length === 0, 'reset round state');
    assert(w.players.every(p => p.health === 100 && p.wp === 0 && p.wt === 0 && p.thetaTarget === null), 'reset players and polar targets');
  }],
  ['练习模式不会结束，木桩在停止受击后回血', () => {
    const w = attackSetup(); w.practice = true; w.players[1].health = 1;
    run(w, 0.5, [{ phi: 1 }, {}]);
    assert(w.winner === null && w.players[1].health >= 1, 'practice cannot end');
    w.players[0].p = v3(-5, CONFIG.bodyFloor, 0); w.players[1].p = v3(5, CONFIG.bodyFloor, 0);
    w.players.forEach(p => { p.v = v3(); p.wp = 0; p.wt = 0; p.theta = 0.4; });
    run(w, 3); assert(w.players[1].health === 100, 'dummy should recover');
  }],
  ['武器交叉接触会改变双方转速', () => {
    const w = new ArenaPhysics(); const [a, b] = w.players;
    a.p = v3(-1.5, 1, 0); b.p = v3(1.5, 1.03, 0);
    a.theta = b.theta = Math.PI / 2; a.phi = 0.5; b.phi = Math.PI - 0.5; a.wt = -3; b.wt = 3;
    w.solveStaffClash(CONFIG.step);
    assert(a.wt > -3 && b.wt < 3, 'both weapons should deflect');
    assert(w.events.some(e => e.type === 'clash'), 'clash feedback');
  }],
  ['90 秒混合输入保持数值稳定、长度固定、角色留在圆台', () => {
    const w = new ArenaPhysics(); w.practice = true;
    let seed = 379;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let inputs = idle;
    for (let i = 0; i < 90 * 180; i++) {
      if (i % 27 === 0) inputs = [0, 1].map(() => ({ theta: Math.floor(random() * 3) - 1, phi: Math.floor(random() * 3) - 1 }));
      w.step(inputs);
      for (const p of w.players) {
        for (const value of [p.p.x, p.p.y, p.p.z, p.v.x, p.v.y, p.v.z, p.wt, p.wp]) assert(Number.isFinite(value), 'non-finite physics state');
        assert(p.p.y >= CONFIG.bodyFloor - 0.01 && p.p.y < 15, `invalid height ${p.p.y}`);
        assert(Math.hypot(p.p.x, p.p.z) <= CONFIG.arenaRadius - CONFIG.bodyRadius + 0.05, 'escaped arena');
        assert(Number.isFinite(p.theta), 'non-finite polar angle');
        const r = staffFrame(p).r; near(Math.hypot(r.x, r.y, r.z), CONFIG.staffOffset + CONFIG.staffLength);
      }
    }
  }],
  ['碰撞最近点计算支持相交、平行和退化线段', () => {
    near(closestSegments(v3(-1, 0, 0), v3(1, 0, 0), v3(0, 0, -1), v3(0, 0, 1)).distance, 0);
    near(closestSegments(v3(), v3(2, 0, 0), v3(0, 1, 0), v3(2, 1, 0)).distance, 1);
    near(closestSegments(v3(), v3(), v3(0, 3, 0), v3(0, 3, 0)).distance, 3);
  }],
];

export function runPhysicsTests() {
  return cases.map(([name, fn]) => {
    const started = performance.now();
    try { fn(); return { name, passed: true, ms: Math.round(performance.now() - started) }; }
    catch (error) { return { name, passed: false, error: error.message }; }
  });
}
