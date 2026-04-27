import { clamp } from "../../utils";
import { easeOutCubic, lerp } from "./helpers";

export function updateVfx(
  vfx: any,
  dt: number,
  elapsedTime: number,
  fighters: any[],
) {
  const THREE = window.THREE;
  const t = elapsedTime;

  // ===== fan text sword effects =====
  if (vfx._fanTextEffects && vfx._fanTextEffects.size) {
    for (const fx of vfx._fanTextEffects.values()) {
      if (fx?.update) fx.update(dt);
    }
  }

  // ===== projectiles =====
  for (let i = vfx.projectiles.length - 1; i >= 0; i--) {
    const pr = vfx.projectiles[i];

    // A) delayed GIANT projectile (hide sword when fired)
    if (pr && pr.__giantDelayed) {
      pr.__delay -= dt;
      if (pr.__delay <= 0) {
        vfx.spawnProjectileToTarget(
          pr.__start,
          pr.__target,
          pr.__color,
          pr.__speed,
          pr.__wobble ?? 0,
          pr.__arc ?? 0,
          pr.__onHit ?? null,
        );
        if (pr.__sword) {
          pr.__sword.visible = false;
        }
        if (pr.__ring) {
          pr.__ring.__dirty = true;
        }
        vfx.projectiles.splice(i, 1);
      }
      continue;
    }

    // B) delayed projectile wrapper
    if (pr && pr.__delayed) {
      pr.__delay -= dt;
      if (pr.__delay <= 0) {
        vfx.spawnProjectileToTarget(
          pr.__start,
          pr.__target,
          pr.__color,
          pr.__speed,
          pr.__wobble ?? 0,
          pr.__arc ?? 0,
          pr.__onHit ?? null,
        );
        vfx.projectiles.splice(i, 1);
      }
      continue;
    }

    // C) delayed stop giant wrapper
    if (pr && pr.__delayedStopGiant) {
      pr.__delay -= dt;
      if (pr.__delay <= 0) {
        vfx.stopGiantCharge(pr.__ownerIndex);
        vfx.projectiles.splice(i, 1);
      }
      continue;
    }

    // D) fire dragon projectile
    if (pr && pr.mode === "dragon") {
      pr.t += dt;

      const pRaw = clamp(pr.t / pr.travel, 0, 1);
      const pierceAt = clamp(pr.pierceAt ?? 0.78, 0.05, 0.95);
      const invPierce = Math.max(0.0001, 1 - pierceAt);
      const piercePhase = pRaw >= pierceAt;
      let pe = 0;
      if (pRaw < pierceAt) {
        const u = pRaw / Math.max(0.0001, pierceAt);
        const ease = 1 - Math.pow(1 - u, 2);
        pe = ease * pierceAt;
      } else {
        const u = (pRaw - pierceAt) / invPierce;
        const ease = u * u;
        pe = pierceAt + invPierce * ease;
      }
      const pos = vfx._tmp.v3b;

      vfx._bezier2(pr.start, pr.ctrl, pr.end, pe, pos);

      if (pr.perp?.lengthSq?.()) {
        const tighten = piercePhase ? (pr.pierceTighten ?? 0.35) : 1;
        const swayMul = (1 - pRaw) * tighten;
        const sway = Math.sin((t + pr.t) * pr.swayFreq) * pr.swayAmp * swayMul;
        pos.addScaledVector(pr.perp, sway);
        pos.y += Math.cos((t + pr.t) * (pr.swayFreq * 0.8)) * pr.swayAmp * 0.25 * swayMul;
      }

      if (pr.head) {
        pr.head.position.copy(pos);
        pr.head.material.opacity = 0.75 + 0.2 * Math.sin((t + pr.t) * 10);
        if (pr.headBaseScale) {
          if (piercePhase) {
            const u = clamp((pRaw - pierceAt) / invPierce, 0, 1);
            const stretch = 1 + u * (pr.pierceStretch ?? 0.55);
            const squash = 1 - u * (pr.pierceSquash ?? 0.28);
            pr.head.scale.set(
              pr.headBaseScale.x * squash,
              pr.headBaseScale.y * stretch,
              1,
            );
          } else {
            pr.head.scale.set(pr.headBaseScale.x, pr.headBaseScale.y, 1);
          }
        }
      }

      if (pr.body?.length) {
        for (let i = 0; i < pr.body.length; i++) {
          const seg = pr.body[i];
          const pSeg = clamp(pe - i * pr.segmentGap, 0, 1);
          const segPos = vfx._tmp.v3c;
          vfx._bezier2(pr.start, pr.ctrl, pr.end, pSeg, segPos);

          if (pr.perp?.lengthSq?.()) {
            const tighten = piercePhase ? (pr.pierceTighten ?? 0.35) : 1;
            const segSway =
              Math.sin((t + pr.t) * (pr.swayFreq + i * 0.2)) *
              pr.swayAmp *
              (1 - pSeg) *
              0.7 *
              tighten;
            segPos.addScaledVector(pr.perp, segSway);
            segPos.y +=
              Math.cos((t + pr.t) * (pr.swayFreq * 0.7)) *
              pr.swayAmp *
              0.18 *
              tighten;
          }

          seg.position.copy(segPos);
          seg.material.opacity =
            (1 - i / pr.body.length) * (0.7 + 0.3 * (1 - pSeg));
        }
      }

      if (pRaw >= 1) {
        const impactCol = pr.impactColor ?? 0xff7a2b;
        if (typeof vfx.spawnShockwave === "function") {
          vfx.spawnShockwave(pr.end.clone().setY(0.6), impactCol, 1.6, 18, 0.3);
        }
        if (typeof vfx.spawnSlash === "function") {
          vfx.spawnSlash(pr.end.clone(), impactCol, 0);
        }
        if (typeof vfx.spawnSparks === "function") {
          vfx.spawnSparks(pr.end.clone(), impactCol, 12, 0.18, 10);
        }
        if (typeof pr.onHit === "function") pr.onHit();
        vfx.scene.remove(pr.mesh);
        vfx.projectiles.splice(i, 1);
      }
      continue;
    }

    pr.t += dt;

    const p = clamp(pr.t / pr.travel, 0, 1);
    const pe = 1 - Math.pow(1 - p, 3);

    let pos = vfx._tmp.v3b;

    if (pr.mode === "bezier" && pr.ctrl) {
      vfx._bezier2(pr.start, pr.ctrl, pr.end, pe, pos);

      if (pr.swirlAmp) {
        const s = Math.sin(pr.t * pr.swirlFreq + pe * Math.PI * 2);
        pos.y += s * pr.swirlAmp * (1 - p) * 0.35;
      }
    } else {
      pos.lerpVectors(pr.start, pr.end, pe);
      if (pr.arc) pos.y += Math.sin(pe * Math.PI) * pr.arc;
      if (pr.wobble) {
        pos.x += Math.sin((t + pr.t) * 12) * 0.03 * pr.wobble;
        pos.y += Math.cos((t + pr.t) * 10) * 0.03 * pr.wobble;
      }
    }

    pr.mesh.position.copy(pos);

    // hướng kiếm theo tiếp tuyến (bezier) hoặc theo end-start
    const dir = vfx._tmp.v3a;
    if (pr.mode === "bezier" && pr.ctrl) {
      const u = 1 - pe;
      dir.set(
        2 * u * (pr.ctrl.x - pr.start.x) + 2 * pe * (pr.end.x - pr.ctrl.x),
        2 * u * (pr.ctrl.y - pr.start.y) + 2 * pe * (pr.end.y - pr.ctrl.y),
        2 * u * (pr.ctrl.z - pr.start.z) + 2 * pe * (pr.end.z - pr.ctrl.z),
      );
    } else {
      dir.copy(pr.end).sub(pr.start);
    }

    if (dir.lengthSq() > 1e-6) {
      dir.normalize();
      vfx._alignMeshYToDir(pr.mesh, dir);
      pr.mesh.rotateY(dt * 10.2);
    }

    if (pr.mesh.userData?.glow) {
      pr.mesh.userData.glow.opacity = 0.4 + 0.2 * Math.sin((t + pr.t) * 14);
    }
    if (pr.mesh.userData?.trail) {
      pr.mesh.userData.trail.material.opacity = 0.12 + 0.1 * (1 - p);
    }

    if (pr.burstAt != null && !pr.__burstDone && p >= pr.burstAt) {
      pr.__burstDone = true;
      if (!pr.noBurst) {
        const burstColor = pr.burstColor ?? 0xffffff;
        const burstScale = pr.burstScale ?? 0.45;
        const burstPos = pr.burstPos ?? pr.end;
        vfx.spawnBurstAt(burstPos.clone(), burstColor, burstScale);
      }
      if (typeof pr.onContact === "function") pr.onContact();
    }

    if (p >= 1) {
      if (pr.burstAt == null && !pr.noBurst) {
        const burstColor = pr.burstColor ?? 0xffffff;
        const burstScale = pr.burstScale ?? 0.45;
        const burstPos = pr.burstPos ?? pr.end;
        vfx.spawnBurstAt(burstPos.clone(), burstColor, burstScale);
      }
      if (typeof pr.onHit === "function") pr.onHit();
      if (pr.__reuse) {
        pr.mesh.visible = false;
      } else {
        vfx.scene.remove(pr.mesh);
      }
      vfx.projectiles.splice(i, 1);
    }
  }

  // ===== slashes =====
  for (let i = vfx.slashes.length - 1; i >= 0; i--) {
    const s = vfx.slashes[i];
    s.userData.t += dt;
    const k = 1 - s.userData.t / s.userData.life;
    s.material.opacity = Math.max(0, k) * 0.55;
    s.scale.setScalar(1 + (1 - k) * 0.28);
    s.rotation.z += dt * 2.8;
    if (s.userData.t >= s.userData.life) {
      vfx.scene.remove(s);
      s.visible = false;
      if (vfx._pool?.slashes?.length < (vfx._pool?.max?.slashes ?? 0)) {
        vfx._pool.slashes.push(s);
      } else {
        s.geometry?.dispose?.();
        s.material?.dispose?.();
      }
      vfx.slashes.splice(i, 1);
    }
  }

  // ===== bursts =====
  for (let i = vfx.bursts.length - 1; i >= 0; i--) {
    const b = vfx.bursts[i];
    b.userData.t += dt;
    const k = 1 - b.userData.t / b.userData.life;
    b.material.opacity = Math.max(0, k) * 0.6;
    b.scale.setScalar(b.scale.x * (1 + dt * 1.7));
    if (b.userData.t >= b.userData.life) {
      vfx.scene.remove(b);
      b.visible = false;
      if (vfx._pool?.bursts?.length < (vfx._pool?.max?.bursts ?? 0)) {
        vfx._pool.bursts.push(b);
      } else {
        b.material?.dispose?.();
      }
      vfx.bursts.splice(i, 1);
    }
  }

  // ===== shockwaves =====
  for (let i = vfx.shockwaves.length - 1; i >= 0; i--) {
    const w = vfx.shockwaves[i];
    w.userData.t += dt;
    const p = clamp(w.userData.t / w.userData.life, 0, 1);
    const e = easeOutCubic(p);
    const s = lerp(w.userData.start, w.userData.end, e);
    w.scale.setScalar(s);
    w.material.opacity = (1 - p) * 0.32;
    if (p >= 1) {
      vfx.scene.remove(w);
      w.visible = false;
      if (vfx._pool?.shockwaves?.length < (vfx._pool?.max?.shockwaves ?? 0)) {
        vfx._pool.shockwaves.push(w);
      } else {
        w.geometry?.dispose?.();
        w.material?.dispose?.();
      }
      vfx.shockwaves.splice(i, 1);
    }
  }

  // ===== sparks =====
  for (let i = vfx.sparkBursts.length - 1; i >= 0; i--) {
    const pts = vfx.sparkBursts[i];
    pts.userData.t += dt;
    const p = clamp(pts.userData.t / pts.userData.life, 0, 1);

    const posAttr = pts.geometry.getAttribute("position");
    const velAttr = pts.geometry.getAttribute("velocity");

    const g = pts.userData.gravity;
    for (let k = 0; k < posAttr.count; k++) {
      const vx = velAttr.getX(k);
      let vy = velAttr.getY(k);
      const vz = velAttr.getZ(k);

      vy -= g * dt;
      velAttr.setY(k, vy);

      posAttr.setXYZ(
        k,
        posAttr.getX(k) + vx * dt,
        posAttr.getY(k) + vy * dt,
        posAttr.getZ(k) + vz * dt,
      );
    }
    posAttr.needsUpdate = true;
    velAttr.needsUpdate = true;

    pts.material.opacity = (1 - p) * 0.6;

    if (p >= 1) {
      vfx.scene.remove(pts);
      pts.visible = false;
      const count = posAttr.count;
      const pool = vfx._pool?.sparks?.get(count);
      if (pool && pool.length < (vfx._pool?.max?.sparks ?? 0)) {
        pool.push(pts);
      } else {
        pts.geometry?.dispose?.();
        pts.material?.dispose?.();
      }
      vfx.sparkBursts.splice(i, 1);
    }
  }

  // ===== light rays =====
  if (vfx.rays?.length) {
    for (let i = vfx.rays.length - 1; i >= 0; i--) {
      const r = vfx.rays[i];
      r.userData.t += dt;
      const p = clamp(r.userData.t / r.userData.life, 0, 1);
      const k = 1 - p;
      r.material.opacity = 0.65 * k;
      const move = r.userData.speed * dt;
      if (r.userData.dir) {
        r.position.addScaledVector(r.userData.dir, move);
      }
      if (r.userData.downBias) {
        r.position.y -= r.userData.downBias * dt;
      }
      const s = 1 + p * 1.2;
      r.scale.setScalar(s);
      if (p >= 1) {
        const batchId = r.userData.batchId;
        const batch = vfx._rayBatches?.get(batchId);
        if (batch && !batch.burst) {
          batch.burst = true;
          vfx.spawnBurstAt(batch.origin.clone(), batch.colorHex ?? 0xffffff, batch.scale ?? 1.6);
        }
        vfx.scene.remove(r);
        r.visible = false;
        if (vfx._pool?.rays?.length < (vfx._pool?.max?.rays ?? 0)) {
          vfx._pool.rays.push(r);
        } else {
          r.geometry?.dispose?.();
          r.material?.dispose?.();
        }
        vfx.rays.splice(i, 1);
      }
    }
  }

  // ===== magic circles =====
  for (let i = vfx.magicCircles.length - 1; i >= 0; i--) {
    const m = vfx.magicCircles[i];
    m.userData.t += dt;
    const p = clamp(m.userData.t / m.userData.life, 0, 1);
    m.material.opacity = (1 - p) * 0.28;
    m.rotation.z += dt * m.userData.rotSpeed;
    const s = m.userData.base * (1 + p * 0.08);
    m.scale.set(s / m.userData.base, s / m.userData.base, 1);
    if (p >= 1) {
      vfx.scene.remove(m);
      vfx.magicCircles.splice(i, 1);
    }
  }

  // ===== shields =====
  for (let i = vfx.shields.length - 1; i >= 0; i--) {
    const sh = vfx.shields[i];
    sh.t += dt;

    const owner = fighters?.[sh.ownerIndex];
    const obj = sh.obj;
    if (obj?.userData?.__sphere) {
      const s = obj.userData.__sphere;
      s.phase += dt * s.spin;
      if (owner) obj.position.set(owner.group.position.x, s.height, 0);

      for (let k = 0; k < s.swords.length; k++) {
        const sword = s.swords[k];
        const a = sword.userData.__a0 + s.phase;
        const x = Math.cos(a) * s.radius;
        const z = Math.sin(a) * s.radius * 0.78;
        sword.position.set(x, Math.sin((t + sh.t) * 1.8 + k) * s.bobAmp, z);
        sword.rotation.y = a + Math.PI / 2;
      }
    }

    if (obj?.userData?.__wall && owner) {
      const fx = owner.group.position.x + (owner.facing || (sh.ownerIndex === 0 ? 1 : -1)) * 7.0;
      obj.position.set(fx, 0, 0);
    }

    const now = performance.now();
    const remain = sh.until - now;
    const fade = remain < 350 ? clamp(remain / 350, 0, 1) : 1;

    obj.traverse((o: any) => {
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m.transparent) continue;
        if (m.__baseOpacity === undefined) {
          m.__baseOpacity = m.opacity;
        }
        m.opacity = m.__baseOpacity * fade;
      }
    });

    if (now >= sh.until) {
      vfx.scene.remove(obj);
      vfx.shields.splice(i, 1);
    }
  }

  // ===== vortexes =====
  for (let i = vfx.vortexes.length - 1; i >= 0; i--) {
    const vx = vfx.vortexes[i];
    vx.t += dt;

    const p = clamp(vx.t / vx.life, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);

    // position
    const pos = vfx._tmp.v3a;
    pos.lerpVectors(vx.start, vx.end, e);

    // arc + wobble
    if (vx.arc) {
      pos.y += Math.sin(e * Math.PI) * vx.arc;
    }
    if (vx.wobble) {
      pos.x += Math.sin((t + vx.t) * 3.2) * 0.18 * vx.wobble;
      pos.y += Math.cos((t + vx.t) * 2.7) * 0.16 * vx.wobble;
    }

    // apply to group
    vx.group.position.copy(pos);

    // rotate each sword around
    const spin = vx.spinSpeed;
    for (let j = 0; j < vx.swords.length; j++) {
      const s = vx.swords[j];
      const a = s.userData.__a0 + vx.t * spin * s.userData.__dir;
      const x = Math.cos(a) * vx.radius;
      const z = Math.sin(a) * vx.radius * 0.78;
      s.position.set(x, 0, z);
      s.rotation.y = a + Math.PI / 2;
      s.rotation.x = Math.sin((t + vx.t) * 3 + j) * 0.08;
    }

    if (p >= 1) {
      vfx.scene.remove(vx.group);
      vfx.vortexes.splice(i, 1);
    }
  }

    // ===== fan swarms =====
    for (let i = vfx.fanSwarms.length - 1; i >= 0; i--) {
      const sw = vfx.fanSwarms[i];
      sw.t += dt;

      const center = sw.fromFighter.getCorePos(sw.gatherHeight ?? 11.0);
      const gatherSec = Math.max(0.2, sw.gatherSec ?? 2.0);
      const aimSec = sw.aimSec ?? 0.15;

      if (!sw._merged) {
        for (const entry of sw.swords) {
          const { sword, start, end, delay, arcDir, arcAmp, spin } = entry;
          const localT = sw.t - delay;
          if (localT <= 0) {
            sword.position.copy(start);
            sword.visible = true;
            continue;
          }
          const p = clamp(localT / gatherSec, 0, 1);
          const pe = 1 - Math.pow(1 - p, 3);
          const pos = vfx._tmp.v3a;
          pos.lerpVectors(start, end, pe);
          pos.addScaledVector(arcDir, Math.sin(pe * Math.PI) * arcAmp);
          sword.position.set(center.x + pos.x - 0, pos.y, center.z + pos.z - 0);

          const dir = vfx._tmp.v3b.copy(end).sub(start).normalize();
          if (dir.lengthSq() > 1e-6) {
            vfx._alignMeshYToDir(sword, dir);
            sword.rotateY((spin || 0) * dt);
          }

          if (p >= 1 && !entry.done) {
            entry.done = true;
            sword.visible = false;
          }
        }

        if (sw.t >= gatherSec) {
          sw._merged = true;
          if (sw.bigSword) {
            sw.bigSword.visible = true;
            sw.bigSword.position.copy(center);
          }
        }
      }

      if (sw._merged && !sw._launched) {
        const lockT = sw.t - gatherSec;
        if (sw.bigSword) {
          sw.bigSword.position.copy(center);
          const grow = clamp(lockT / aimSec, 0, 1);
          const scale = 0.1 + (sw.bigChargeScale ?? 4.2) * grow;
          sw.bigSword.scale.setScalar(scale);
          const target = sw.getTargetPos().clone();
          const dir = target.clone().sub(center).normalize();
          if (dir.lengthSq() > 1e-6) {
            vfx._alignMeshYToDir(sw.bigSword, dir);
            sw.bigSword.rotateY(Math.PI / 2);
          }
        }

        if (lockT >= aimSec) {
          sw._launched = true;
          const from = center.clone();
          const to = sw.getTargetPos().clone();
          const p = sw.bigSword;
          if (p) {
            p.visible = true;
            p.position.copy(from);
            const dist = from.distanceTo(to);
            const travel = Math.max(0.12, dist / 120);
            vfx.projectiles.push({
              mesh: p,
              t: 0,
              travel,
              start: from.clone(),
              end: to.clone(),
              wobble: 0.0,
              arc: sw.arc ?? 4.0,
              onHit: sw.onHit ?? null,
              __reuse: true,
            });
          }
        }
      }

      if (sw._launched && sw.t >= gatherSec + aimSec + (sw.launchSec ?? 0.5) + 0.6) {
        if (sw.bigSword) sw.bigSword.visible = false;
        vfx.fanSwarms.splice(i, 1);
      }
    }

    // ===== ult swarms =====
    for (let i = vfx.ultSwarms.length - 1; i >= 0; i--) {
      const sw = vfx.ultSwarms[i];
      sw.t += dt;

    const p = clamp(sw.t / sw.orbitSec, 0, 1);
    const orbitPhase = p;

    const mesh = sw.mesh;
    const total = sw.swords?.length ?? mesh?.count ?? 0;
    if (mesh && mesh.isInstancedMesh && total > 0) {
      const o3d = vfx._tmp.o3d;
      const center = sw.fromFighter.getCorePos(sw.gatherHeight ?? 11.0);
      for (let k = 0; k < total; k++) {
        const s = sw.swords?.[k];
        const a = (s?.a0 ?? 0) + orbitPhase * Math.PI * 2 * (s?.spin ?? 1);
        const startPos = s?.startPos ?? vfx._tmp.v3a.set(0, 10, 0);
        const endPos = s?.endPos ?? vfx._tmp.v3b.set(0, 11, 0);
        const pos = vfx._tmp.v3c;
        pos.lerpVectors(startPos, endPos, p);
        o3d.position.set(center.x + pos.x, pos.y, center.z + pos.z);
        o3d.rotation.set(0, 0, a + Math.PI / 2);
        o3d.updateMatrix();
        mesh.setMatrixAt(k, o3d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    if (sw.bigSword) {
      const center = sw.fromFighter.getCorePos(sw.gatherHeight ?? 11.0);
      sw.bigSword.position.copy(center);
      const grow = Math.min(1, p * 1.1);
      const scale = 0.1 + (sw.bigChargeScale ?? 4.2) * grow;
      sw.bigSword.scale.setScalar(scale);
    }

    if (sw.t >= sw.orbitSec && !sw._launched) {
      sw._launched = true;

      if (sw.singleLaunch) {
        const from = sw.fromFighter.getMuzzlePos().clone();
        const to = sw.getTargetPos().clone();
        const p = sw.bigSword || vfx.swordFactory.createSwordProjectile(sw.colorHex);
        p.scale.setScalar(sw.bigScale ?? 3.2);
        p.position.copy(from);
        if (!sw.bigSword) vfx.scene.add(p);
        const dist = from.distanceTo(to);
        const travel = Math.max(0.12, dist / 120);
        vfx.projectiles.push({
          mesh: p,
          t: 0,
          travel,
          start: from.clone(),
          end: to.clone(),
          wobble: 0.0,
          arc: sw.arc ?? 6.0,
          onHit: sw.onHit ?? null,
        });
      } else {
        const total = sw.hits;
        for (let k = 0; k < total; k++) {
          vfx._spawnDelayedProjectileToTarget(
            sw.fromFighter.getMuzzlePos().clone(),
            sw.getTargetPos().clone().add(new THREE.Vector3((Math.random() - 0.5) * sw.spread, 0, 0)),
            sw.colorHex,
            120,
            0.0,
            sw.arc,
            k * (sw.launchSec / total),
            sw.onHit,
          );
        }
      }
    }

    if (sw.t >= sw.orbitSec + sw.launchSec + 0.6) {
      if (sw.mesh) vfx.scene.remove(sw.mesh);
      if (sw.bigSword && sw.bigSword.parent) {
        vfx.scene.remove(sw.bigSword);
      }
      vfx.ultSwarms.splice(i, 1);
    }
  }

  // ===== giant charges =====
  for (const [ownerIndex, st] of vfx.giantCharges.entries()) {
    st.t += dt;

    if (!st.firing && st.t >= st.nextRingAt && st.rings.length < st.maxRings) {
      vfx._giantAddRing(ownerIndex);
      st.nextRingAt += st.ringEverySec;
    }

    // update rings
    for (let i = st.rings.length - 1; i >= 0; i--) {
      const ring = st.rings[i];
      ring.t += dt;

      if (ring.__dirty && ring.swords.every((s: any) => !s.visible)) {
        vfx.scene.remove(ring.grp);
        st.rings.splice(i, 1);
        continue;
      }

      // spin ring
      const spin = st.spin * ring.spinMul;
      ring.grp.rotation.y += spin * dt;

      // hover
      ring.grp.position.y = st.baseHeight + ring.height + Math.sin((t + ring.t) * 2.1) * 0.25;
    }
  }
}
