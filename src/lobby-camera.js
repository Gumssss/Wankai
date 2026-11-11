const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*x*(x*(x*6-15)+10); };

// One camera path owns both the entrance and the idle menu, including their seam.
export function advanceLobbyCamera(intro, delta, reducedMotion = false) {
  const dt = Math.min(Math.max(delta, 0), .06);
  if (intro.phase === 'returning') {
    intro.returnTime = (intro.returnTime || 0) + dt;
    const duration = reducedMotion ? .25 : 4;
    const blend = smooth(intro.returnTime / duration);
    const angle = intro.returnAngle + (reducedMotion ? 0 : intro.returnTime * .055);
    const target = {x: Math.sin(angle)*35, y:22, z:Math.cos(angle)*35, zoom:.37};
    const pose = {};
    for (const key of ['x','y','z','zoom']) pose[key] = intro.returnFrom[key] + (target[key]-intro.returnFrom[key])*blend;
    intro.angle = angle;
    intro.lastPose = pose;
    return {...pose, returned: blend === 1};
  }
  let progress = intro.phase === 'done' ? 1 : 0;
  if (intro.phase === 'cover') {
    intro.elapsed += dt;
    intro.angle = (intro.orbitBase ?? -.72) + (reducedMotion ? 0 : intro.elapsed * .055);
  } else if (intro.phase === 'transition') {
    intro.transition += dt;
    progress = smooth(intro.transition / (reducedMotion ? .25 : 4));
    intro.angle = intro.startAngle * (1-progress);
  }
  const radius = 35 - 14*progress;
  const idle = intro.phase === 'done' ? (intro.idle = (intro.idle || 0) + dt) : 0;
  const amount = reducedMotion ? 0 : smooth(idle / 3);
  const pose = {
    x: Math.sin(intro.angle)*radius + Math.sin(idle*.64)*.99*amount,
    y: 22-6.6*progress + Math.sin(idle*1.10)*.54*amount,
    z: Math.cos(intro.angle)*radius + Math.sin(idle*.76)*.72*amount,
    // Fill the cover with the arena, then return to the original close menu view.
    zoom: (.37 + .63*progress) * (1 + Math.sin(idle*.96)*.027*amount),
    complete: intro.phase === 'transition' && progress === 1,
  };
  intro.lastPose = pose;
  return pose;
}
