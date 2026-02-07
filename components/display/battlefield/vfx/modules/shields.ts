export function spawnShield(
  vfx: any,
  ownerFighter: any,
  colorHex: number,
  type: string,
  ownerIndex: number,
) {
  const THREE = window.THREE;
  // NOTE: type is "WALL" or "SPHERE"
  // - SPHERE: nhiều kiếm dựng dọc quay quanh nhân vật
  // - WALL: tháp trấn yêu dựng đứng trước mặt

  const grp = new THREE.Group();

  // helper: set opacity for all materials under obj
  const setOpacityDeep = (obj: any, opacity: number) => {
    obj.traverse((o: any) => {
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats){
        if (m.transparent) m.opacity = opacity;
      }
    });
  };

  if (type === "SPHERE"){
    // ===== SPHERE: kiếm dựng dọc quay quanh nhân vật (DÙNG SwordFactory) =====
    const count  = 12;          // số kiếm
    const radius = 8.2;         // bán kính vòng quay
    const height = 5.8;         // tâm vòng quay (cao ngang thân)
    const spin   = 2.6;         // tốc quay rad/s
    const bobAmp = 0.35;        // nhún nhẹ

    grp.position.set(ownerFighter.group.position.x, height, 0);

    const swords = [];
    for (let i = 0; i < count; i++){
      const s = vfx.swordFactory.createSwordProjectile(colorHex);

      // nhẹ bớt trail/glow để không lòe quá
      if (s.userData?.trail?.material) s.userData.trail.material.opacity = 0.1;
      if (s.userData?.glow?.material)  s.userData.glow.material.opacity  = 0.28;

      // scale
      s.scale.setScalar(1.25);

      // lưu góc ban đầu
      const a0 = (i / count) * Math.PI * 2;
      s.userData.__a0 = a0;

      // đặt quanh vòng ngay từ đầu
      const x = Math.cos(a0) * radius;
      const z = Math.sin(a0) * (radius * 0.78);
      s.position.set(x, 0, z);

      // dựng dọc: trục Y của kiếm hướng lên
      // (SwordFactory của bạn đang align theo Y-axis là “chiều dài kiếm”)
      vfx._alignMeshYToDir(s, vfx._tmp.v3a.set(0, 1, 0));
      // xoay nhẹ cho đẹp
      s.rotateY(Math.PI/2);

      grp.add(s);
      swords.push(s);
    }

    grp.userData.__sphere = { swords, count, radius, height, spin, bobAmp, phase: Math.random()*Math.PI*2 };
  }
  else {
    // ===== Wall: "tháp trấn yêu" =====
    const w = 5.4;
    const h = 15.5;
    const d = 2.2;

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b10,
      emissive: colorHex,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.16,
      roughness: 0.6,
      metalness: 0.0
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, h/2, 0);
    grp.add(body);

    // edges glow
    const eGeo = new THREE.EdgesGeometry(bodyGeo);
    const eMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const edges = new THREE.LineSegments(eGeo, eMat);
    edges.position.copy(body.position);
    grp.add(edges);

    // rune ring near base
    const ringGeo = new THREE.RingGeometry(2.6, 3.3, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      map: vfx.glowTex,
      color: colorHex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const rune = new THREE.Mesh(ringGeo, ringMat);
    rune.rotation.x = -Math.PI/2;
    rune.position.set(0, 0.18, 0);
    grp.add(rune);

    grp.userData.__wall = { w,h,d, rune, setOpacityDeep };

    // initial placement (in front)
    const fx = ownerFighter.group.position.x + (ownerFighter.facing || (ownerIndex===0?1:-1)) * 7.0;
    grp.position.set(fx, 0, 0);
  }

  vfx.scene.add(grp);
  vfx.shields.push({
    obj: grp,
    until: performance.now() + (type==="WALL" ? 1200 : 1500),
    type,
    ownerIndex,
    t: 0
  });
}
