// @ts-nocheck
// public/js/display/vfx/VFXManager.js
import { clamp } from "../utils";

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

  // ===== NEW: magic circle (ULT đẹp hơn) =====
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

  // ===== core fix: align sword length (Y-axis) to motion direction =====
  _alignMeshYToDir(mesh, dirNorm){
    const q = this._tmp.q;
    q.setFromUnitVectors(this._tmp.yAxis, dirNorm);
    mesh.quaternion.copy(q);
  }

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

  spawnShield(ownerFighter, colorHex, type, ownerIndex){
    const THREE = window.THREE;
    let mesh;

    if (type === "WALL"){
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 10),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: colorHex,
          emissiveIntensity: 0.85,
          transparent:true,
          opacity:0.24,
          side: THREE.DoubleSide
        })
      );
      mesh.position.set(ownerFighter.group.position.x + (ownerIndex===0? 6 : -6), 7.6, 0);
      mesh.rotation.y = Math.PI/2;
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(6.2, 22, 22),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: colorHex,
          emissiveIntensity: 0.78,
          transparent:true,
          opacity:0.12
        })
      );
      mesh.position.set(ownerFighter.group.position.x, 7.2, 0);
    }

    this.scene.add(mesh);
    this.shields.push({
      mesh,
      until: performance.now() + (type==="WALL" ? 1200 : 1500),
      type,
      ownerIndex
    });
  }

  // ===== ULT swarm (nâng cấp vật liệu + thêm circle ở caller) =====
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

    // geometry giống "blade" hơn (taper)
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

    // tụ lực mạnh hơn
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
      pr.t += dt;

      const p = clamp(pr.t / pr.travel, 0, 1);
      const pos = this._tmp.v3b.lerpVectors(pr.start, pr.end, p);

      if (pr.arc) pos.y += Math.sin(p*Math.PI) * pr.arc;
      if (pr.wobble){
        pos.x += Math.sin((t+pr.t)*12) * 0.03 * pr.wobble;
        pos.y += Math.cos((t+pr.t)*10) * 0.03 * pr.wobble;
      }

      pr.mesh.position.copy(pos);

      const dir = this._tmp.v3a.copy(pr.end).sub(pr.start);
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

    // ===== shields follow fighters =====
    for(let i=this.shields.length-1;i>=0;i--){
      const s = this.shields[i];
      const remain = s.until - performance.now();
      const host = fighters[s.ownerIndex];

      if (s.type === "WALL"){
        s.mesh.position.set(host.group.position.x + (s.ownerIndex===0?6:-6), 7.6, 0);
      } else {
        s.mesh.position.set(host.group.position.x, 7.2, 0);
      }

      if (remain <= 0){
        this.scene.remove(s.mesh);
        this.shields.splice(i,1);
        continue;
      }
      const kk = clamp(remain/400, 0, 1);
      s.mesh.material.opacity = (s.type==="WALL" ? 0.24 : 0.12) * (0.65 + 0.35*kk);
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

          // tangent direction (orbit đẹp hơn)
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
          // giữ lơ lửng trước khi phóng
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

          // impact dày hơn
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
