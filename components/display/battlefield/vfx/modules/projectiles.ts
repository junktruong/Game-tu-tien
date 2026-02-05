export function spawnProjectileBezier(vfx, from, to, colorHex, speed, opts = {}){
  const THREE = window.THREE;
  const p = vfx.swordFactory.createSwordProjectile(colorHex);
  p.position.copy(from);
  vfx.scene.add(p);

  const dist = from.distanceTo(to);
  const travel = Math.max(0.10, dist / Math.max(1, speed));

  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(to, from);
  if (dir.lengthSq() > 1e-6) dir.normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  if (perp.lengthSq() > 1e-6) perp.normalize();

  const arc = opts.arc ?? 0;
  const side = opts.side ?? (Math.random() < 0.5 ? -1 : 1);
  const sideScale = opts.sideScale ?? 2.4;

  const ctrl = mid.clone();
  ctrl.y += arc;
  ctrl.addScaledVector(perp, side * sideScale);

  const swirlAmp = opts.swirlAmp ?? 0.65;
  const swirlFreq = opts.swirlFreq ?? 10.0;

  vfx.projectiles.push({
    mesh: p,
    t: 0,
    travel,
    start: from.clone(),
    end: to.clone(),
    ctrl,
    mode: "bezier",
    swirlAmp,
    swirlFreq,
    onHit: opts.onHit ?? null,
  });
}

export function spawnProjectileToTarget(vfx, from, to, colorHex, speed, wobble = 0, arc = 0, onHit = null){
  const THREE = window.THREE;
  const p = vfx.swordFactory.createSwordProjectile(colorHex);
  p.position.copy(from);
  vfx.scene.add(p);

  const dist = from.distanceTo(to);
  const travel = Math.max(0.10, dist / Math.max(1, speed));

  vfx.projectiles.push({
    mesh: p,
    t: 0,
    travel,
    start: from.clone(),
    end: to.clone(),
    wobble,
    arc,
    onHit,
  });
}

export function spawnDelayedProjectileToTarget(vfx, start, target, color, speed, wobble = 0, arc = 0, delay = 0, onHit = null){
  vfx.projectiles.push({
    __delayed: true,
    __delay: Math.max(0, delay),
    __start: start.clone(),
    __target: target.clone(),
    __color: color,
    __speed: speed,
    __wobble: wobble,
    __arc: arc,
    __onHit: onHit,
  });
}

export function spawnFireDragon(vfx, {
  from,
  to,
  colorHex,
  speed = 120,
  arc = 9.0,
  segments = 12,
  segmentGap = 0.06,
  swayAmp = 1.6,
  swayFreq = 6.5,
  pierceAt = 0.78,
  pierceTighten = 0.35,
  pierceStretch = 0.55,
  pierceSquash = 0.28,
  onHit = null,
}){
  const THREE = window.THREE;

  const baseColor = new THREE.Color(colorHex);
  const fireColor = baseColor.clone().lerp(new THREE.Color(0xff6a00), 0.65);

  const grp = new THREE.Group();
  vfx.scene.add(grp);

  const headMat = new THREE.SpriteMaterial({
    map: vfx.glowTex,
    color: fireColor,
    transparent:true,
    opacity:0.6,
    depthWrite:false,
    blending: THREE.AdditiveBlending
  });
  const head = new THREE.Sprite(headMat);
    head.scale.set(11, 11, 1);
  grp.add(head);

  const body = [];
  for (let i=0;i<segments;i++){
    const mat = new THREE.SpriteMaterial({
      map: vfx.glowTex,
      color: fireColor,
      transparent:true,
      opacity: 0.4,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    });
    const seg = new THREE.Sprite(mat);
    const s = 8.0 - i * 0.35;
    seg.scale.set(s, s, 1);
    grp.add(seg);
    body.push(seg);
  }

  const dist = from.distanceTo(to);
  const travel = Math.max(0.12, dist / Math.max(1, speed));
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const ctrl = mid.clone();
  ctrl.y += arc;

  const dir = new THREE.Vector3().subVectors(to, from);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  if (perp.lengthSq() > 1e-6) perp.normalize();

  vfx.projectiles.push({
    mesh: grp,
    head,
    body,
    t: 0,
    travel,
    start: from.clone(),
    end: to.clone(),
    ctrl,
    perp,
    segmentGap,
    swayAmp,
    swayFreq,
    pierceAt,
    pierceTighten,
    pierceStretch,
    pierceSquash,
    headBaseScale: { x: head.scale.x, y: head.scale.y },
    impactColor: fireColor.getHex(),
    mode: "dragon",
    onHit,
  });
}
