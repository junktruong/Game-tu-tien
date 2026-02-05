export function playVankiemUlt(vfx, {
  fromFighter,
  getTargetPos,
  colorHex,
  orbitSec = 0.55,
  launchSec = 0.70,
  arc = 10.0,
  bigScale = 3.2,
  gatherHeight = 11.0,
  bigChargeScale = 4.2,
  onHit = null
}){
  const THREE = window.THREE;
  const assets = vfx._ensureFanAssets ? vfx._ensureFanAssets(40) : null;
  if (!assets) return;

  const smallSwords = assets.smallSwords || [];
  const bigSword = assets.bigSword;

  const tintSword = (obj) => {
    if (!obj) return;
    obj.traverse((o)=>{
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats){
        if (m.color) m.color.setHex(0xffffff);
        if (m.emissive) m.emissive.setHex(colorHex);
        if (m.emissiveIntensity != null) m.emissiveIntensity = 1.05;
      }
    });
    if (obj.userData?.glow?.material) obj.userData.glow.material.color.setHex(colorHex);
    if (obj.userData?.trail?.material) obj.userData.trail.material.color.setHex(colorHex);
  };

  tintSword(bigSword);
  for (const s of smallSwords) tintSword(s);

  const center = fromFighter.getCorePos(gatherHeight);
  const swords = [];
  const count = smallSwords.length;
  for (let i = 0; i < count; i += 1) {
    const s = smallSwords[i];
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.2) * 2.2,
      (Math.random() - 0.5) * 2,
    ).normalize();
    const dist = 18 + Math.random() * 10;
    const start = center.clone().addScaledVector(dir, dist);
    const end = center.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.2,
      0.6 + Math.random() * 0.8,
      (Math.random() - 0.5) * 1.2
    ));
    const delay = Math.random() * 0.35;
    const arcDir = new THREE.Vector3(-dir.z, 0.3, dir.x).normalize();
    swords.push({
      sword: s,
      start,
      end,
      delay,
      arcDir,
      arcAmp: 1.2 + Math.random() * 1.8,
      spin: (0.8 + Math.random() * 1.6) * (Math.random() < 0.5 ? -1 : 1),
      done: false,
    });
    s.position.copy(start);
    s.visible = true;
  }

  bigSword.visible = false;
  bigSword.scale.setScalar(0.1);
  bigSword.position.copy(center);

  vfx.spawnBurstAt(fromFighter.getCorePos(11.0), colorHex, 1.2);
  vfx.spawnShockwave(fromFighter.getCorePos(0.6), colorHex, 1.6, 20, 0.34);

  vfx.fanSwarms.push({
    fromFighter,
    getTargetPos,
    colorHex,
    swords,
    t: 0,
    gatherSec: orbitSec,
    aimSec: 0.15,
    launchSec,
    arc,
    bigScale,
    gatherHeight,
    bigSword,
    bigChargeScale,
    onHit
  });
}
