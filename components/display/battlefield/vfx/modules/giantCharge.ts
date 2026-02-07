export function startGiantCharge(
  vfx: any,
  ownerFighter: any,
  colorHex: number,
  ownerIndex: number,
  opts: Record<string, number> = {},
) {
  if (typeof ownerIndex !== "number" || !ownerFighter) return;

  vfx.stopGiantCharge(ownerIndex);

  const st = {
    ownerFighter,
    colorHex,

    t: 0,
    nextRingAt: 1.0,
    ringEverySec: opts.ringEverySec ?? 1.0,
    maxRings: opts.maxRings ?? 3,

    baseHeight: opts.baseHeight ?? 8.0,
    heightStep: opts.heightStep ?? 3.2,

    baseRadius: opts.baseRadius ?? 9.0,
    radiusStep: opts.radiusStep ?? 4.0,

    spin: opts.spin ?? 2.6,
    countPerRing: opts.countPerRing ?? 12,
    tiltX: opts.tiltX ?? 0.12,

    rings: [],
  };

  vfx.giantCharges.set(ownerIndex, st);
  vfx._giantAddRing(ownerIndex);
}

export function stopGiantCharge(vfx: any, ownerIndex: number) {
  const st = vfx.giantCharges.get(ownerIndex);
  if (!st) return;

  for (const r of st.rings){
    vfx.scene.remove(r.grp);

    r.grp.traverse((o: any) => {
      if (o.isMesh){
        o.geometry?.dispose?.();
        if (o.material){
          if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose?.());
          else o.material.dispose?.();
        }
      }
      if (o.isSprite){
        o.material?.dispose?.();
      }
    });
  }

  vfx.giantCharges.delete(ownerIndex);
}

export function giantAddRing(vfx: any, ownerIndex: number) {
  const THREE = window.THREE;
  const st = vfx.giantCharges.get(ownerIndex);
  if (!st) return;
  if (st.rings.length >= st.maxRings) return;

  const ringIndex = st.rings.length;
  const height = st.baseHeight + ringIndex * st.heightStep;
  const radius = st.baseRadius + ringIndex * st.radiusStep;

  const grp = new THREE.Group();
  grp.position.copy(st.ownerFighter.getCorePos(height));
  grp.rotation.x = st.tiltX ?? 0;
  vfx.scene.add(grp);

  const swords = [];
  const count = st.countPerRing;

  for (let i=0; i<count; i++){
    const s = vfx.swordFactory.createSwordProjectile(st.colorHex);

    s.scale.setScalar(1.2 );

    if (s.userData?.trail?.material) s.userData.trail.material.opacity = 0.04;
    if (s.userData?.glow?.material)  s.userData.glow.material.opacity  = 0.08;

    const a0 = (i / count) * Math.PI * 2;
    s.userData.__a0 = a0;
    s.userData.__ring = ringIndex;

    const x = Math.cos(a0) * radius;
    const z = Math.sin(a0) * (radius * 0.78);
    s.position.set(x, 0, z);

    const radial = new THREE.Vector3(x, 0.12, z).normalize();
    vfx._alignMeshYToDir(s, radial);
    s.rotateY(Math.PI/2);

    grp.add(s);
    swords.push(s);
  }

  st.rings.push({
    grp,
    swords,
    t: 0,
    height,
    radius,
    spinMul: 1.0 + ringIndex * 0.18,
  });
}

export function fireGiantFromStackedRings(
  vfx: any,
  {
    ownerIndex,
    getTargetPos,
    speed = 160,
    arc = 0,
    cadenceSec = 0.1,
    onHit = null,
  }: {
    ownerIndex: number;
    getTargetPos: () => any;
    speed?: number;
    arc?: number;
    cadenceSec?: number;
    onHit?: ((...args: any[]) => void) | null;
  },
) {
  const st = vfx.giantCharges.get(ownerIndex);
  if (!st) return 0;

  const THREE = window.THREE;

  const rings = st.rings.slice().reverse();
  const todo = [];
  for (const r of rings){
    for (const s of r.swords){
      if (s.visible) todo.push({ s, ring: r });
    }
  }

  if (todo.length === 0){
    vfx.stopGiantCharge(ownerIndex);
    return 0;
  }

  for (let i=0; i<todo.length; i++){
    const { s, ring } = todo[i];
    const from = new THREE.Vector3();
    s.getWorldPosition(from);

    const to = getTargetPos().clone();
    const delay = i * cadenceSec;

    vfx.projectiles.push({
      __giantDelayed: true,
      __delay: Math.max(0, delay),
      __start: from.clone(),
      __target: to.clone(),
      __color: st.colorHex,
      __speed: speed,
      __wobble: 0,
      __arc: arc,
      __onHit: onHit,
      __sword: s,
      __ring: ring,
    });
  }

  const totalSec = todo.length * cadenceSec + 0.25;
  vfx.projectiles.push({
    __delayedStopGiant: true,
    __delay: totalSec,
    __ownerIndex: ownerIndex,
  });

  return todo.length;
}

export function fireGiantFromRingCharge(
  vfx: any,
  {
    ownerIndex,
    getTargetPos,
    speed = 120,
    arc = 0,
    cadenceSec = 0.12,
    maxShots = 14,
    onHit = null,
  }: {
    ownerIndex: number;
    getTargetPos: () => any;
    speed?: number;
    arc?: number;
    cadenceSec?: number;
    maxShots?: number;
    onHit?: ((...args: any[]) => void) | null;
  },
) {
  const st = vfx.giantCharges.get(ownerIndex);
  if (st?.rings?.length){
    return vfx.fireGiantFromStackedRings({
      ownerIndex,
      getTargetPos,
      speed,
      arc,
      cadenceSec,
      onHit,
    });
  }
  return 0;
}
