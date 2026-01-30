// public/js/display/vfx/VFXManager.js
import { clamp } from "../utils.js";

function lerp(a, b, t){ return a + (b - a) * t; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

export class VFXManager {
  constructor(scene, glowTex, swordFactory){
    this.scene = scene;
    this.glowTex = glowTex;
    this.swordFactory = swordFactory;

    this.projectiles = [];
    this.slashes = [];
    this.bursts = [];
    this.shields = [];

    this.shockwaves = [];
    this.sparkBursts = [];

    this.ultSwarms = [];
    this.vortexes = [];
    this.magicCircles = [];

    /**
     * GIANT charge (STACKED RINGS)
     * ownerIndex -> state
     * state = {
     *   ownerFighter, colorHex,
     *   t, nextRingAt, ringEverySec, maxRings,
     *   baseHeight, heightStep,
     *   baseRadius, radiusStep,
     *   spin, countPerRing,
     *   rings: [ { grp, swords:[], t, height, radius, spinMul } ]
     * }
     */
    this.giantCharges = new Map();

    const THREE = window.THREE;
    this._tmp = {
      v3a: new THREE.Vector3(),
      v3b: new THREE.Vector3(),
      v3c: new THREE.Vector3(),
      yAxis: new THREE.Vector3(0,1,0),
      q: new THREE.Quaternion(),
      o3d: new THREE.Object3D(),
    };
  }

  // ===== visuals helpers =====
  spawnSlash(pos, colorHex, yRot=0){
    const THREE = window.THREE;
    const geo = new THREE.RingGeometry(3.5, 5.2, 44, 1, 0, Math.PI * 1.25);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent:true,
      opacity:0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite:false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.x = Math.PI/2;
    mesh.rotation.y = yRot;
    mesh.rotation.z = Math.random()*0.8;
    mesh.userData = { life: 0.20, t: 0 };
    this.scene.add(mesh);
    this.slashes.push(mesh);
  }

  spawnShockwave(pos, colorHex, start=2.0, end=18.0, life=0.28){
    const THREE = window.THREE;
    const geo = new THREE.RingGeometry(1.0, 1.6, 72);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent:true,
      opacity:0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite:false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y = Math.max(mesh.position.y, 0.2);
    mesh.rotation.x = -Math.PI/2;
    mesh.userData = { t: 0, life, start, end };
    mesh.scale.setScalar(start);
    this.scene.add(mesh);
    this.shockwaves.push(mesh);
  }

  spawnSparks(pos, colorHex, count=16, life=0.22, speed=14){
    const THREE = window.THREE;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for(let i=0;i<count;i++){
      positions[i*3+0] = 0;
      positions[i*3+1] = 0;
      positions[i*3+2] = 0;

      const a = Math.random()*Math.PI*2;
      const u = Math.random();
      const s = (0.35 + 0.65*u) * speed;

      velocities[i*3+0] = Math.cos(a) * s * (0.7 + Math.random()*0.6);
      velocities[i*3+1] = (0.7 + Math.random()*1.2) * s;
      velocities[i*3+2] = Math.sin(a) * s * (0.7 + Math.random()*0.6);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.9,
      map: this.glowTex,
      transparent:true,
      opacity:0.95,
      depthWrite:false,
      blending: THREE.AdditiveBlending,
      color: colorHex
    });

    const pts = new THREE.Points(geo, mat);
    pts.position.copy(pos);
    pts.userData = { t: 0, life, gravity: 28 };
    this.scene.add(pts);
    this.sparkBursts.push(pts);
  }

  spawnBurstAt(pos, colorHex, scale=1){
    const THREE = window.THREE;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent:true,
      opacity:0.92,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    }));
    s.scale.set(10*scale, 10*scale, 1);
    s.position.copy(pos);
    s.userData = { life: 0.24, t: 0 };
    this.scene.add(s);
    this.bursts.push(s);

    this.spawnShockwave(pos, colorHex, 1.2*scale, 14*scale, 0.26);
    this.spawnSparks(pos, colorHex, Math.round(14*scale), 0.22, 12 + 8*scale);
  }

  // ===== magic circle (ULT đẹp hơn) =====
  spawnMagicCircle(pos, colorHex, scale=1, life=0.80, rotSpeed=2.2){
    const THREE = window.THREE;
    const size = 26 * scale;

    const mat = new THREE.MeshBasicMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent:true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending,
      depthWrite:false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.position.copy(pos);
    mesh.position.y = Math.max(mesh.position.y, 0.55);
    mesh.rotation.x = -Math.PI/2;
    mesh.userData = { t: 0, life, rotSpeed, base: size };
    this.scene.add(mesh);
    this.magicCircles.push(mesh);
    return mesh;
  }

  // ===== core fix: align sword length (Y-axis) to direction =====
  _alignMeshYToDir(mesh, dirNorm){
    const q = this._tmp.q;
    q.setFromUnitVectors(this._tmp.yAxis, dirNorm);
    mesh.quaternion.copy(q);
  }

  // ===== delayed spawn wrapper (không dùng setTimeout cho từng kiếm) =====
  _spawnDelayedProjectileToTarget(from, to, colorHex, speed, wobble, arc, delaySec, onHit){
    this.projectiles.push({
      __delayed: true,
      __delay: delaySec,
      __start: from.clone(),
      __target: to.clone(),
      __color: colorHex,
      __speed: speed,
      __wobble: wobble,
      __arc: arc,
      __onHit: onHit
    });
  }

  // ===== optional bezier helpers (giữ lại, bạn đang có) =====
  _bezier2(p0, p1, p2, t, out){
    const u = 1 - t;
    out.set(
      u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
      u*u*p0.y + 2*u*t*p1.y + t*t*p2.y,
      u*u*p0.z + 2*u*t*p1.z + t*t*p2.z
    );
    return out;
  }

  spawnProjectileBezier(from, to, colorHex, speed, opts = {}){
    const THREE = window.THREE;

    const p = this.swordFactory.createSwordProjectile(colorHex);
    p.position.copy(from);
    this.scene.add(p);

    const dist = from.distanceTo(to);
    const travel = Math.max(0.10, dist / Math.max(1, speed));

    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const arc = (opts.arc ?? 6.5) * clamp(dist / 22, 0.65, 1.35);

    const side = opts.side ?? 0;
    const sideScale = opts.sideScale ?? 2.2;

    const dir = new THREE.Vector3().subVectors(to, from);
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    if (perp.lengthSq() > 1e-6) perp.normalize();

    const ctrl = mid.clone();
    ctrl.y += arc;
    ctrl.addScaledVector(perp, side * sideScale);

    const swirlAmp = opts.swirlAmp ?? 0.65;
    const swirlFreq = opts.swirlFreq ?? 10.0;

    this.projectiles.push({
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

  // ===== base projectile (thẳng / arc) =====
  spawnProjectileToTarget(from, to, colorHex, speed, wobble=0, arc=0, onHit=null){
    const THREE = window.THREE;
    const p = this.swordFactory.createSwordProjectile(colorHex);
    p.position.copy(from);
    this.scene.add(p);

    const dist = from.distanceTo(to);
    const travel = Math.max(0.10, dist / Math.max(1, speed));

    this.projectiles.push({
      mesh: p,
      t: 0,
      travel,
      start: from.clone(),
      end: to.clone(),
      wobble,
      arc,
      onHit
    });
  }

  // =========================================================
  // GIANT STACKED RINGS (CHARGE)
  // =========================================================

  // GIANT charge: tạo vòng chồng lên đầu mỗi 1s (tối đa 3 vòng)
  startGiantCharge(ownerFighter, colorHex, ownerIndex, opts = {}){
    if (typeof ownerIndex !== "number" || !ownerFighter) return;

    // refresh
    this.stopGiantCharge(ownerIndex);

    const st = {
      ownerFighter,
      colorHex,

      t: 0,
      nextRingAt: 1.0,                    // sau 1s thêm vòng #2
      ringEverySec: opts.ringEverySec ?? 1.0,
      maxRings: opts.maxRings ?? 3,

      // vị trí trên đầu + xếp cao dần
      baseHeight: opts.baseHeight ?? 12.0,
      heightStep: opts.heightStep ?? 3.2,

      // bán kính mỗi vòng (nhẹ)
      baseRadius: opts.baseRadius ?? 9.0,
      radiusStep: opts.radiusStep ?? 4.0,

      spin: opts.spin ?? 2.6,
      countPerRing: opts.countPerRing ?? 12,

      rings: []
    };

    this.giantCharges.set(ownerIndex, st);

    // tạo vòng đầu tiên ngay
    this._giantAddRing(ownerIndex);
  }

  stopGiantCharge(ownerIndex){
    const st = this.giantCharges.get(ownerIndex);
    if (!st) return;

    for (const r of st.rings){
      this.scene.remove(r.grp);

      // dispose nhẹ
      r.grp.traverse((o)=>{
        if (o.isMesh){
          o.geometry?.dispose?.();
          if (o.material){
            if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose?.());
            else o.material.dispose?.();
          }
        }
        if (o.isSprite){
          o.material?.dispose?.();
        }
      });
    }

    this.giantCharges.delete(ownerIndex);
  }

  _giantAddRing(ownerIndex){
    const THREE = window.THREE;
    const st = this.giantCharges.get(ownerIndex);
    if (!st) return;
    if (st.rings.length >= st.maxRings) return;

    const ringIndex = st.rings.length;
    const height = st.baseHeight + ringIndex * st.heightStep;
    const radius = st.baseRadius + ringIndex * st.radiusStep;

    const grp = new THREE.Group();
    grp.position.copy(st.ownerFighter.getCorePos(height));
    this.scene.add(grp);

    const swords = [];
    const count = st.countPerRing;

    for (let i=0; i<count; i++){
      const s = this.swordFactory.createSwordProjectile(st.colorHex);

      // nhẹ + gọn
    s.scale.setScalar(0.70);
  // X,Z giữ, Y dài hơn

      if (s.userData?.trail?.material) s.userData.trail.material.opacity = 0.16;
      if (s.userData?.glow?.material)  s.userData.glow.material.opacity  = 0.50;

      const a0 = (i / count) * Math.PI * 2;
      s.userData.__a0 = a0;
      s.userData.__ring = ringIndex;

      const x = Math.cos(a0) * radius;
      const z = Math.sin(a0) * (radius * 0.78);
      s.position.set(x, 0, z);

      const radial = new THREE.Vector3(x, 0.12, z).normalize();
      this._alignMeshYToDir(s, radial);
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
      spinMul: 1.0 + ringIndex * 0.18
    });
  }

  /**
   * FIRE GIANT: bắn hết kiếm từ stacked rings
   * - cadenceSec càng lớn => đoạn đánh càng dài
   * - arc=0 => bay thẳng (đẹp/sạch)
   * - bắn theo thứ tự: vòng CAO -> THẤP (xả tầng)
   */
  fireGiantFromStackedRings({
    ownerIndex,
    getTargetPos,
    speed = 160,
    arc = 0,
    cadenceSec = 0.10,
    onHit = null
  }){
    const st = this.giantCharges.get(ownerIndex);
    if (!st) return 0;

    const THREE = window.THREE;

    // gom kiếm visible theo vòng cao -> thấp
    const rings = st.rings.slice().reverse();
    const todo = [];
    for (const r of rings){
      for (const s of r.swords){
        if (s.visible) todo.push({ s, ring: r });
      }
    }

    if (todo.length === 0){
      this.stopGiantCharge(ownerIndex);
      return 0;
    }

    // bắn
    for (let i=0; i<todo.length; i++){
      const { s, ring } = todo[i];
      const from = new THREE.Vector3();
      s.getWorldPosition(from);

      const to = getTargetPos().clone();
      const delay = i * cadenceSec;

      this._spawnDelayedProjectileToTarget(from, to, st.colorHex, speed, 0, arc, delay, onHit);

      // rút kiếm khỏi vòng ngay
      s.visible = false;

      // mark vòng sẽ dọn khi hết
      ring.__dirty = true;
    }

    // sau cùng: dọn sạch charge (sau khi kiếm cuối bay ra)
    const totalSec = todo.length * cadenceSec + 0.25;
    this.projectiles.push({
      __delayedStopGiant: true,
      __delay: totalSec,
      __ownerIndex: ownerIndex
    });

    return todo.length;
  }

  // ===== giữ lại function cũ (compat) =====
  fireGiantFromRingCharge({
    ownerIndex,
    getTargetPos,
    speed = 120,
    arc = 0,
    cadenceSec = 0.12,
    maxShots = 14,
    onHit = null
  }){
    // nếu ai đó gọi nhầm, fallback: bắn theo stacked rings luôn
    const st = this.giantCharges.get(ownerIndex);
    if (st?.rings?.length){
      return this.fireGiantFromStackedRings({
        ownerIndex,
        getTargetPos,
        speed,
        arc,
        cadenceSec,
        onHit
      });
    }
    return 0;
  }

  // ===== Shield =====
  spawnShield(ownerFighter, colorHex, type, ownerIndex){
  const THREE = window.THREE;
  // NOTE: type is "WALL" or "SPHERE"
  // - SPHERE: nhiều kiếm dựng dọc quay quanh nhân vật
  // - WALL: tháp trấn yêu dựng đứng trước mặt

  const grp = new THREE.Group();

  // helper: set opacity for all materials under obj
  const setOpacityDeep = (obj, opacity)=>{
    obj.traverse((o)=>{
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
    const s = this.swordFactory.createSwordProjectile(colorHex);

    // nhẹ bớt trail/glow để không lòe quá
    if (s.userData?.trail?.material) s.userData.trail.material.opacity = 0.14;
    if (s.userData?.glow?.material)  s.userData.glow.material.opacity  = 0.45;

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
    this._alignMeshYToDir(s, this._tmp.v3a.set(0, 1, 0));
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
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.22,
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
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const edges = new THREE.LineSegments(eGeo, eMat);
    edges.position.copy(body.position);
    grp.add(edges);

    // rune ring near base
    const ringGeo = new THREE.RingGeometry(2.6, 3.3, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent: true,
      opacity: 0.35,
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

  this.scene.add(grp);
  this.shields.push({
    obj: grp,
    until: performance.now() + (type==="WALL" ? 1200 : 1500),
    type,
    ownerIndex,
    t: 0
  });
}

  // ===== ULT swarm =====
  playVankiemUlt({
    fromFighter,
    getTargetPos,
    colorHex,
    visualSwords = 72,
    hits = 10,
    orbitSec = 0.55,
    launchSec = 0.70,
    spread = 3.2,
    arc = 10.0,
    onHit = null
  }){
    const THREE = window.THREE;

    const geo = new THREE.CylinderGeometry(0.10, 0.22, 6.2, 7);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colorHex,
      emissiveIntensity: 1.45,
      transparent:true,
      opacity: 0.86,
      roughness: 0.1,
      metalness: 0.2
    });

    const mesh = new THREE.InstancedMesh(geo, mat, visualSwords);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    const hitIndices = new Set();
    while (hitIndices.size < Math.min(hits, visualSwords)){
      hitIndices.add(Math.floor(Math.random() * visualSwords));
    }

    const swords = [];
    for(let i=0;i<visualSwords;i++){
      const r = 8 + Math.random()*10;
      const h = 6 + Math.random()*12;
      const a0 = Math.random()*Math.PI*2;
      const spin = (0.9 + Math.random()*1.8) * (Math.random()<0.5?-1:1);
      const delay = (i / visualSwords) * 0.34 + (Math.random()*0.09);
      const willHit = hitIndices.has(i);

      swords.push({
        a0, r, h, spin,
        delay,
        willHit,
        started:false,
        done:false,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        lastPos: new THREE.Vector3(),
        hitDone:false,
        roll: Math.random()*Math.PI*2
      });
    }

    this.spawnBurstAt(fromFighter.getCorePos(11.0), colorHex, 1.6);
    this.spawnShockwave(fromFighter.getCorePos(0.6), colorHex, 1.8, 24, 0.38);

    this.ultSwarms.push({
      mesh,
      fromFighter,
      getTargetPos,
      colorHex,
      swords,
      t: 0,
      orbitSec,
      launchSec,
      spread,
      arc,
      onHit
    });
  }

  update(dt, elapsedTime, fighters){
    const THREE = window.THREE;
    const t = elapsedTime;

    // ===== projectiles =====
    for(let i=this.projectiles.length-1;i>=0;i--){
      const pr = this.projectiles[i];

      // A) delayed projectile wrapper
      if (pr && pr.__delayed){
        pr.__delay -= dt;
        if (pr.__delay <= 0){
          this.spawnProjectileToTarget(
            pr.__start, pr.__target,
            pr.__color, pr.__speed,
            pr.__wobble ?? 0, pr.__arc ?? 0,
            pr.__onHit ?? null
          );
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      // B) delayed stop giant wrapper
      if (pr && pr.__delayedStopGiant){
        pr.__delay -= dt;
        if (pr.__delay <= 0){
          this.stopGiantCharge(pr.__ownerIndex);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      pr.t += dt;

      const p = clamp(pr.t / pr.travel, 0, 1);
      const pe = 1 - Math.pow(1 - p, 3);

      let pos = this._tmp.v3b;

      if (pr.mode === "bezier" && pr.ctrl){
        this._bezier2(pr.start, pr.ctrl, pr.end, pe, pos);

        if (pr.swirlAmp){
          const s = Math.sin((pr.t * pr.swirlFreq) + pe * Math.PI * 2);
          pos.y += s * pr.swirlAmp * (1 - p) * 0.35;
        }
      } else {
        pos.lerpVectors(pr.start, pr.end, pe);
        if (pr.arc) pos.y += Math.sin(pe*Math.PI) * pr.arc;
        if (pr.wobble){
          pos.x += Math.sin((t+pr.t)*12) * 0.03 * pr.wobble;
          pos.y += Math.cos((t+pr.t)*10) * 0.03 * pr.wobble;
        }
      }

      pr.mesh.position.copy(pos);

      // hướng kiếm theo tiếp tuyến (bezier) hoặc theo end-start
      const dir = this._tmp.v3a;
      if (pr.mode === "bezier" && pr.ctrl){
        const u = 1 - pe;
        dir.set(
          2*u*(pr.ctrl.x - pr.start.x) + 2*pe*(pr.end.x - pr.ctrl.x),
          2*u*(pr.ctrl.y - pr.start.y) + 2*pe*(pr.end.y - pr.ctrl.y),
          2*u*(pr.ctrl.z - pr.start.z) + 2*pe*(pr.end.z - pr.ctrl.z)
        );
      } else {
        dir.copy(pr.end).sub(pr.start);
      }

      if (dir.lengthSq() > 1e-6){
        dir.normalize();
        this._alignMeshYToDir(pr.mesh, dir);
        pr.mesh.rotateY(dt * 10.2);
      }

      if (pr.mesh.userData?.glow){
        pr.mesh.userData.glow.opacity = 0.62 + 0.26*Math.sin((t+pr.t)*14);
      }
      if (pr.mesh.userData?.trail){
        pr.mesh.userData.trail.material.opacity = 0.20 + 0.16*(1-p);
      }

      if (p >= 1){
        this.spawnBurstAt(pr.end.clone(), 0xffffff, 0.45);
        if (typeof pr.onHit === "function") pr.onHit();
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i,1);
      }
    }

    // ===== slashes =====
    for(let i=this.slashes.length-1;i>=0;i--){
      const s = this.slashes[i];
      s.userData.t += dt;
      const k = 1 - (s.userData.t / s.userData.life);
      s.material.opacity = Math.max(0, k) * 0.78;
      s.scale.setScalar(1 + (1-k)*0.28);
      s.rotation.z += dt*2.8;
      if (s.userData.t >= s.userData.life){
        this.scene.remove(s);
        this.slashes.splice(i,1);
      }
    }

    // ===== bursts =====
    for(let i=this.bursts.length-1;i>=0;i--){
      const b = this.bursts[i];
      b.userData.t += dt;
      const k = 1 - (b.userData.t / b.userData.life);
      b.material.opacity = Math.max(0, k) * 0.95;
      b.scale.setScalar(b.scale.x * (1 + dt*1.7));
      if (b.userData.t >= b.userData.life){
        this.scene.remove(b);
        this.bursts.splice(i,1);
      }
    }

    // ===== shockwaves =====
    for(let i=this.shockwaves.length-1;i>=0;i--){
      const w = this.shockwaves[i];
      w.userData.t += dt;
      const p = clamp(w.userData.t / w.userData.life, 0, 1);
      const e = easeOutCubic(p);
      const s = lerp(w.userData.start, w.userData.end, e);
      w.scale.setScalar(s);
      w.material.opacity = (1-p) * 0.55;
      if (p >= 1){
        this.scene.remove(w);
        this.shockwaves.splice(i,1);
      }
    }

    // ===== sparks =====
    for(let i=this.sparkBursts.length-1;i>=0;i--){
      const pts = this.sparkBursts[i];
      pts.userData.t += dt;
      const p = clamp(pts.userData.t / pts.userData.life, 0, 1);

      const posAttr = pts.geometry.getAttribute("position");
      const velAttr = pts.geometry.getAttribute("velocity");

      const g = pts.userData.gravity;
      for(let k=0;k<posAttr.count;k++){
        const vx = velAttr.getX(k);
        let vy = velAttr.getY(k);
        const vz = velAttr.getZ(k);

        vy -= g * dt;
        velAttr.setY(k, vy);

        posAttr.setXYZ(
          k,
          posAttr.getX(k) + vx * dt,
          posAttr.getY(k) + vy * dt,
          posAttr.getZ(k) + vz * dt
        );
      }
      posAttr.needsUpdate = true;
      velAttr.needsUpdate = true;

      pts.material.opacity = (1-p) * 0.95;

      if (p >= 1){
        this.scene.remove(pts);
        this.sparkBursts.splice(i,1);
      }
    }

    // ===== magic circles =====
    for(let i=this.magicCircles.length-1;i>=0;i--){
      const m = this.magicCircles[i];
      m.userData.t += dt;
      const p = clamp(m.userData.t / m.userData.life, 0, 1);

      m.rotation.z += dt * m.userData.rotSpeed;
      m.material.opacity = (1 - p) * 0.42;

      const s = 1.0 + p * 0.35;
      m.scale.setScalar(s);

      if (p >= 1){
        this.scene.remove(m);
        this.magicCircles.splice(i,1);
      }
    }

    // ===== GIANT stacked rings follow + rotate + build each second =====
    if (this.giantCharges && this.giantCharges.size){
      for (const [ownerIndex, st] of this.giantCharges.entries()){
        st.t += dt;

        // mỗi 1s thêm 1 vòng (tối đa 3)
        if (st.rings.length < st.maxRings){
          while (st.t >= st.nextRingAt){
            this._giantAddRing(ownerIndex);
            st.nextRingAt += st.ringEverySec;
            if (st.rings.length >= st.maxRings) break;
          }
        }

        // rotate từng ring
        for (let ri=0; ri<st.rings.length; ri++){
          const r = st.rings[ri];
          r.t += dt;

          const base = st.ownerFighter?.getCorePos(r.height) ?? this._tmp.v3c.set(0, r.height, 0);
          r.grp.position.copy(base);

          const rot = r.t * (st.spin * r.spinMul);
          const count = r.swords.length;

          for (let i=0; i<count; i++){
            const s = r.swords[i];
            if (!s.visible) continue;

            const a = (s.userData.__a0 ?? 0) + rot;
            const x = Math.cos(a) * r.radius;
            const z = Math.sin(a) * (r.radius * 0.78);
            const y = Math.sin((r.t*3.0) + (s.userData.__a0 ?? 0)*2.0) * 0.22;

            s.position.set(x, y, z);

            const radial = this._tmp.v3a.set(x, 0.12, z).normalize();
            this._alignMeshYToDir(s, radial);
            s.rotateY(Math.PI/2 + r.t*0.7);

            if (s.userData?.glow?.material){
              s.userData.glow.material.opacity = 0.42 + 0.18*Math.sin((elapsedTime+r.t)*6.2 + i);
            }
          }
        }
      }
    }

    // ===== shields follow fighters =====
for(let i=this.shields.length-1;i>=0;i--){
  const s = this.shields[i];
  const remain = s.until - performance.now();
  const host = fighters[s.ownerIndex];

  const obj = s.obj || s.mesh;
  if (!obj || !host){
    if (obj) this.scene.remove(obj);
    this.shields.splice(i,1);
    continue;
  }

  s.t = (s.t ?? 0) + dt;

  // follow + animate
  if (s.type === "WALL"){
    const facing = host.facing || (s.ownerIndex===0?1:-1);
    obj.position.set(host.group.position.x + facing * 7.0, 0, 0);

    // rune spin nhẹ
    const w = obj.userData?.__wall;
    if (w?.rune) w.rune.rotation.z += dt * 1.6;

  } else {
  // ===== SPHERE: quay kiếm quanh nhân vật (SwordFactory swords) =====
  const sp = obj.userData?.__sphere;
  const height = sp?.height ?? 8.8;
  obj.position.set(host.group.position.x, height, 0);

  if (sp?.swords?.length){
    const rot = (sp.phase ?? 0) + s.t * (sp.spin ?? 2.6);
    const radius = sp.radius ?? 5.2;
    const bobAmp = sp.bobAmp ?? 0.35;

    for (let k = 0; k < sp.swords.length; k++){
      const sword = sp.swords[k];
      const a = (sword.userData.__a0 ?? 0) + rot;

      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * (radius * 0.78);
      const y = Math.sin((s.t*3.2) + k) * bobAmp;

      sword.position.set(x, y, z);

      // dựng dọc + cho kiếm tự xoay chút (nhìn “đang vận”)
      this._alignMeshYToDir(sword, this._tmp.v3a.set(0, 1, 0));
      sword.rotateY(Math.PI/2 + s.t * 1.8);

      // pulse glow nhẹ
      if (sword.userData?.glow?.material){
        sword.userData.glow.material.opacity = 0.35 + 0.18*Math.sin((elapsedTime+s.t)*6.0 + k);
      }
    }
  }
}
  // lifetime + fade
  if (remain <= 0){
    this.scene.remove(obj);
    this.shields.splice(i,1);
    continue;
  }

  const kk = clamp(remain/380, 0, 1);
  const fade = (0.55 + 0.45*kk);

  const setter = obj.userData?.__sphere?.setOpacityDeep || obj.userData?.__wall?.setOpacityDeep;
  if (typeof setter === "function") setter(obj, (s.type === "WALL" ? 0.22 : 0.78) * fade);
}


    // ===== ULT swarms =====
    for(let si=this.ultSwarms.length-1; si>=0; si--){
      const sw = this.ultSwarms[si];
      sw.t += dt;

      const fromPos = sw.fromFighter.getCorePos(11.0);
      const dummy = this._tmp.o3d;

      let allDone = true;

      for(let i=0;i<sw.swords.length;i++){
        const s = sw.swords[i];

        // ORBIT
        if (sw.t < sw.orbitSec){
          const tt = sw.t / sw.orbitSec;
          const e = easeOutCubic(tt);

          const ang = s.a0 + (sw.t * 7.2) * s.spin;
          const r = s.r * (0.35 + 0.65*e);
          const y = s.h * (0.35 + 0.65*e);

          const x = fromPos.x + Math.cos(ang) * r;
          const z = fromPos.z + Math.sin(ang) * (r * 0.75);
          const yy = fromPos.y + y + Math.sin((sw.t + s.a0)*6) * 0.5;

          s.lastPos.set(x, yy, z);

          dummy.position.set(x, yy, z);

          const dir = this._tmp.v3a.set(-Math.sin(ang), 0.18, Math.cos(ang)).normalize();
          dummy.quaternion.setFromUnitVectors(this._tmp.yAxis, dir);
          dummy.rotateY(s.roll + sw.t*2.8);

          dummy.scale.setScalar(1.05);
          dummy.updateMatrix();
          sw.mesh.setMatrixAt(i, dummy.matrix);

          allDone = false;
          continue;
        }

        // LAUNCH
        const lt = sw.t - sw.orbitSec - s.delay;
        if (lt < 0){
          const ang = s.a0 + (sw.orbitSec * 7.2) * s.spin + (lt*0.8);
          const x = fromPos.x + Math.cos(ang) * (s.r*0.9);
          const z = fromPos.z + Math.sin(ang) * (s.r*0.65);
          const yy = fromPos.y + s.h*0.9;

          s.lastPos.set(x, yy, z);

          dummy.position.set(x, yy, z);
          const dir = this._tmp.v3a.set(-Math.sin(ang), 0.18, Math.cos(ang)).normalize();
          dummy.quaternion.setFromUnitVectors(this._tmp.yAxis, dir);
          dummy.rotateY(s.roll);

          dummy.scale.setScalar(1.02);
          dummy.updateMatrix();
          sw.mesh.setMatrixAt(i, dummy.matrix);

          allDone = false;
          continue;
        }

        const p = clamp(lt / sw.launchSec, 0, 1);
        const e = easeOutCubic(p);

        if (!s.started){
          s.started = true;
          s.startPos.copy(s.lastPos);

          const target = sw.getTargetPos();
          s.endPos.copy(target);
          s.endPos.x += (Math.random()-0.5) * sw.spread;
          s.endPos.y += (Math.random()-0.5) * 1.6;
          s.endPos.z += (Math.random()-0.5) * 0.8;
        }

        const pos = this._tmp.v3b.lerpVectors(s.startPos, s.endPos, e);
        pos.y += Math.sin(p*Math.PI) * sw.arc;

        const dir = this._tmp.v3a.copy(s.endPos).sub(s.startPos);
        if (dir.lengthSq() < 1e-6) dir.set(0,1,0);
        dir.normalize();

        dummy.position.copy(pos);
        dummy.quaternion.setFromUnitVectors(this._tmp.yAxis, dir);
        dummy.rotateY(s.roll + sw.t*3.5);
        dummy.scale.setScalar(1.0 + (1-p)*0.35);
        dummy.updateMatrix();
        sw.mesh.setMatrixAt(i, dummy.matrix);

        if (p < 1){
          allDone = false;
        } else if (!s.done){
          s.done = true;

          this.spawnBurstAt(s.endPos.clone(), sw.colorHex, 1.05);
          this.spawnShockwave(s.endPos.clone().setY(0.6), sw.colorHex, 1.2, 18, 0.32);

          if (s.willHit && !s.hitDone){
            s.hitDone = true;
            if (typeof sw.onHit === "function") sw.onHit();
          }
        }
      }

      sw.mesh.instanceMatrix.needsUpdate = true;

      if (sw.t > sw.orbitSec + sw.launchSec + 0.55){
        allDone = true;
      }

      if (allDone){
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.ultSwarms.splice(si, 1);
      }
    }
  }
}
