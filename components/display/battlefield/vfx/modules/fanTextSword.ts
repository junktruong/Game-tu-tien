export function createFanVNTextSwordEffect(vfx, playerObject, targetObject, options = {}) {
  const THREE = window.THREE;
  const scene = vfx?.scene;
  if (!scene) {
    return { play() {}, update() {}, stop() {}, dispose() {}, setActors() {}, setOptions() {} };
  }

  const cfg = {
    dragonCount: options.dragonCount ?? 2,
    segmentsPerDragon: options.segmentsPerDragon ?? 30,
    segmentSize: options.segmentSize ?? 3.0,
    segmentGap: options.segmentGap ?? 1.2,
    letterOpacity: options.letterOpacity ?? 0.65,
    gatherSec: options.gatherSec ?? 4.0,
    shootSec: options.shootSec ?? 0.6,
    headHeight: options.headHeight ?? 10.0,
    spreadRadius: options.spreadRadius ?? 16.0,
    waveSpeed: options.waveSpeed ?? 0.8,
    swordLength: options.swordLength ?? 11.0,
    swordWidth: options.swordWidth ?? 2.0,
    swordThickness: options.swordThickness ?? 0.45,
    swordGlowOpacity: options.swordGlowOpacity ?? 0.25,
    swordTrailOpacity: options.swordTrailOpacity ?? 0.12,
    hitBurstScale: options.hitBurstScale ?? 1.15,
    tipContactRatio: options.tipContactRatio ?? 0.9,
    pierceHoldSec: options.pierceHoldSec ?? 0.28,
    pierceFadeSec: options.pierceFadeSec ?? 0.32,
    pierceFrontRatio: options.pierceFrontRatio ?? 0.52,
    pierceOffsetY: options.pierceOffsetY ?? -1.1,
    pierceTiltDown: options.pierceTiltDown ?? 0.7,
    pierceRayCount: options.pierceRayCount ?? 12,
    pierceRayLength: options.pierceRayLength ?? 12,
    pierceRayLife: options.pierceRayLife ?? 0.28,
    pierceRaySpeed: options.pierceRaySpeed ?? 18,
    pierceRayWidth: options.pierceRayWidth ?? 0.6,
    pierceRayExplodeScale: options.pierceRayExplodeScale ?? 2.0,
    pierceRayExplodeYOffset: options.pierceRayExplodeYOffset ?? 1.2,
    pierceRayDownBias: options.pierceRayDownBias ?? 2.6,
    pierceImpactDelay: options.pierceImpactDelay ?? 0,
    pierceBurstScale: options.pierceBurstScale ?? 1.4,
    pierceLiftHeight: options.pierceLiftHeight ?? 5.0,
    pierceLiftDur: options.pierceLiftDur ?? 0.45,
    swordAppearAt: options.swordAppearAt ?? 0.35,
    swordTiltDown: options.swordTiltDown ?? 1.6,
    swordRollDeg: options.swordRollDeg ?? 18,
    swordBackOffset: options.swordBackOffset ?? 2.2,
    swordUpOffset: options.swordUpOffset ?? 0.8,
    swordAimSmooth: options.swordAimSmooth ?? 6.0,
    swordShakeAmp: options.swordShakeAmp ?? 0,
    swordShakeFreq: options.swordShakeFreq ?? 10.0,
    swordShakeRot: options.swordShakeRot ?? 0,
  };

  const tmp = {
    v3a: new THREE.Vector3(),
    v3b: new THREE.Vector3(),
    v3c: new THREE.Vector3(),
    v3d: new THREE.Vector3(),
    v3e: new THREE.Vector3(),
  };

  // --- TẠO TEXTURE CHỮ A (giảm glow để nhìn rõ ký tự) ---
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.font = "900 200px 'Courier New', monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "rgba(255, 255, 255, 0.18)";
  g.shadowBlur = 3;
  g.lineWidth = 6;
  g.strokeStyle = "rgba(255, 255, 255, 0.28)";
  g.strokeText("越", canvas.width / 2, canvas.height / 2 + 6);
  g.fillStyle = "rgba(255, 255, 255, 1.0)";
  g.fillText("越", canvas.width / 2, canvas.height / 2 + 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const baseMat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true,
    opacity: cfg.letterOpacity,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const group = new THREE.Group();
  scene.add(group);

  const dragons = [];

  function createSegment(index) {
    const mat = baseMat.clone();
    const sp = new THREE.Sprite(mat);
    sp.visible = false;
    sp.renderOrder = 1990;
    sp.scale.set(cfg.segmentSize, cfg.segmentSize, 1);
    group.add(sp);
    return { sprite: sp, index };
  }

  function ensureSegments(count) {
    for (const d of dragons) {
      for (let s = d.segments.length; s < count; s += 1) {
        d.segments.push(createSegment(s));
      }
      for (let s = 0; s < d.segments.length; s += 1) {
        d.segments[s].index = s;
      }
    }
  }

  function createDragon() {
    const segs = [];
    for (let s = 0; s < cfg.segmentsPerDragon; s += 1) {
      segs.push(createSegment(s));
    }
    dragons.push({
      segments: segs,
      phase: 0,
      baseOffset: new THREE.Vector3(),
      radiusScale: 1,
    });
  }

  function ensureDragonPool(count) {
    while (dragons.length < count) {
      createDragon();
    }
  }

  ensureDragonPool(cfg.dragonCount);

  let active = false;
  let phase = "idle";
  let t = 0;
  let player = playerObject;
  let target = targetObject;
  let getTargetPos = null;
  let colorHex = 0xffffff;
  let rallyPoint = new THREE.Vector3();
  let shootDir = new THREE.Vector3(1, 0, 0);
  let shootDist = 0;
  let hitCallback = null;

  let swordMesh = null;
  let swordInFlight = false;
  let swordAimDir = new THREE.Vector3(1, 0, 0);
  let swordAimReady = false;
  let pierceState = null;
  let impactState = null;

  function setOptions(next = {}) {
    Object.assign(cfg, next);
    if (!Number.isFinite(cfg.dragonCount) || cfg.dragonCount < 1) cfg.dragonCount = 1;
    if (!Number.isFinite(cfg.segmentsPerDragon) || cfg.segmentsPerDragon < 4) cfg.segmentsPerDragon = 4;
    ensureDragonPool(cfg.dragonCount);
    ensureSegments(cfg.segmentsPerDragon);
  }

  function aimSwordAt(targetPos, originPos) {
    if (!swordMesh) return;
    const origin = originPos || swordMesh.position || rallyPoint;
    const dir = tmp.v3a.copy(targetPos).sub(origin);
    if (cfg.swordTiltDown) dir.y -= cfg.swordTiltDown;
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    else dir.normalize();

    if (typeof vfx?._alignMeshYToDir === "function") {
      vfx._alignMeshYToDir(swordMesh, dir);
    } else {
      swordMesh.lookAt(rallyPoint.clone().add(dir));
    }

    if (cfg.swordRollDeg) {
      swordMesh.rotateY((cfg.swordRollDeg * Math.PI) / 180);
    }
  }

  function getSwordAnchor(out) {
    out.copy(rallyPoint);
    if (cfg.swordUpOffset) out.y += cfg.swordUpOffset;
    if (cfg.swordBackOffset) out.z -= cfg.swordBackOffset;
    return out;
  }

  function tintSword(obj, hex) {
    if (!obj) return;
    obj.traverse((o) => {
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.color) m.color.setHex(0xffffff);
        if (m.emissive) m.emissive.setHex(hex);
        if (m.emissiveIntensity != null) m.emissiveIntensity = 0.2;
      }
    });
    if (obj.userData?.glow?.material) {
      obj.userData.glow.material.color.setHex(hex);
      obj.userData.glow.material.opacity = cfg.swordGlowOpacity;
    }
    if (obj.userData?.trail?.material) {
      obj.userData.trail.material.color.setHex(hex);
      obj.userData.trail.material.opacity = cfg.swordTrailOpacity;
    }
  }

  function createSword() {
    if (!vfx?.swordFactory?.createSwordProjectile) return null;
    const s = vfx.swordFactory.createSwordProjectile(colorHex);
    s.visible = false;
    s.renderOrder = 2002;
    tintSword(s, colorHex);
    getSwordBaseLength(s);
    scene.add(s);
    return s;
  }

  function ensureSword() {
    if (!swordMesh || swordInFlight) {
      swordMesh = createSword();
      swordInFlight = false;
    }
    return swordMesh;
  }

  function setActors(nextPlayer, nextTarget, nextGetTargetPos, nextColor) {
    player = nextPlayer || player;
    target = nextTarget || target;
    getTargetPos = nextGetTargetPos || getTargetPos;
    if (typeof nextColor === "number") colorHex = nextColor;
    tintSword(swordMesh, colorHex);
    for (const d of dragons) {
      for (const seg of d.segments) seg.sprite.material.color.setHex(colorHex);
    }
  }

  function getRallyPoint(out) {
    if (player?.group?.position) out.copy(player.group.position);
    else if (player?.position) out.copy(player.position);
    else out.set(0, 0, 0);
    out.y += cfg.headHeight;
    return out;
  }

  function getTargetPoint(out) {
    if (typeof getTargetPos === "function") {
      out.copy(getTargetPos());
      return out;
    }
    if (target?.group?.position) {
      out.copy(target.group.position);
      out.y += 5.0;
      return out;
    }
    if (target?.position) {
      out.copy(target.position);
      return out;
    }
    out.set(0, cfg.headHeight, 0);
    return out;
  }

  function getTargetMid(out) {
    if (target?.getCorePos) {
      return out.copy(target.getCorePos(8.2));
    }
    if (target?.group?.position) {
      out.copy(target.group.position);
      out.y += 6.2;
      return out;
    }
    if (target?.position) {
      out.copy(target.position);
      return out;
    }
    out.set(0, cfg.headHeight * 0.6, 0);
    return out;
  }

  function getFacing() {
    if (typeof player?.facing === "number") {
      return player.facing >= 0 ? 1 : -1;
    }
    return 1;
  }

  function getSmoothedAimDir(origin, targetPos, dt) {
    const dir = tmp.v3a.copy(targetPos).sub(origin);
    if (cfg.swordTiltDown) dir.y -= cfg.swordTiltDown;
    if (dir.lengthSq() < 1e-6) {
      dir.set(getFacing(), 0, 0);
    } else {
      dir.normalize();
    }

    if (!swordAimReady) {
      swordAimDir.copy(dir);
      swordAimReady = true;
      return swordAimDir;
    }

    const smooth = Math.max(0.05, cfg.swordAimSmooth ?? 6.0);
    const alpha = 1 - Math.exp(-dt * smooth);
    swordAimDir.lerp(dir, alpha).normalize();
    return swordAimDir;
  }

  function applySwordScale(mult) {
    if (!swordMesh) return;
    swordMesh.scale.set(
      cfg.swordWidth * mult,
      cfg.swordLength * mult,
      cfg.swordThickness * mult
    );
  }

  function applySwordScaleTo(mesh, mult) {
    if (!mesh) return;
    mesh.scale.set(
      cfg.swordWidth * mult,
      cfg.swordLength * mult,
      cfg.swordThickness * mult
    );
  }

  function alignSwordToDir(mesh, dir) {
    if (!mesh) return;
    if (typeof vfx?._alignMeshYToDir === "function") {
      vfx._alignMeshYToDir(mesh, dir);
    } else {
      mesh.lookAt(mesh.position.clone().add(dir));
    }
    if (cfg.swordRollDeg) {
      mesh.rotateY((cfg.swordRollDeg * Math.PI) / 180);
    }
  }

  function getSwordBaseLength(mesh) {
    if (!mesh) return 0;
    if (!mesh.userData) mesh.userData = {};
    if (mesh.userData.__baseLen) return mesh.userData.__baseLen;
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const len = Math.max(0.001, box.max.y - box.min.y);
    mesh.userData.__baseLen = len;
    return len;
  }

  function getSwordLength(mesh) {
    if (!mesh) return 0;
    const baseLen = getSwordBaseLength(mesh);
    const scaleY = mesh.scale?.y ?? 1;
    return Math.max(0.001, baseLen * scaleY);
  }

  function setSwordOpacity(obj, value) {
    if (!obj) return;
    obj.traverse((o) => {
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.opacity != null) {
          m.transparent = true;
          m.opacity = value;
        }
      }
    });
    if (obj.userData?.glow?.material) {
      obj.userData.glow.material.opacity = cfg.swordGlowOpacity * value;
    }
    if (obj.userData?.trail?.material) {
      obj.userData.trail.material.opacity = cfg.swordTrailOpacity * value;
    }
  }

  function clearPierce() {
    if (!pierceState) return;
    if (pierceState.front?.parent) scene.remove(pierceState.front);
    if (pierceState.back?.parent) scene.remove(pierceState.back);
    pierceState = null;
  }

  function triggerImpact(mid) {
    if (typeof target?.playLift === "function") {
      target.playLift(cfg.pierceLiftHeight, cfg.pierceLiftDur);
    }
    if (typeof vfx?.spawnLightRays === "function") {
      vfx.spawnLightRays(
        mid,
        colorHex,
        cfg.pierceRayCount,
        cfg.pierceRayLength,
        cfg.pierceRayLife,
        cfg.pierceRaySpeed,
        cfg.pierceRayWidth,
        cfg.pierceRayExplodeScale,
        cfg.pierceRayExplodeYOffset,
        cfg.pierceRayDownBias,
      );
    }
    if (cfg.pierceBurstScale > 0.01) {
      vfx.spawnBurstAt(mid.clone(), colorHex, cfg.pierceBurstScale);
    }
  }

  function startPierce(impactPos, dir, targetObj) {
    clearPierce();
    const front = createSword();
    const back = createSword();
    if (!front || !back) return;

    applySwordScaleTo(front, 1);
    applySwordScaleTo(back, 1);

    const fullLen = getSwordLength(front);
    const frontRatio = Math.min(0.9, Math.max(0.1, cfg.pierceFrontRatio));
    const backRatio = Math.max(0.1, 1 - frontRatio);

    front.scale.y *= frontRatio;
    back.scale.y *= backRatio;

    tintSword(front, colorHex);
    tintSword(back, colorHex);

    const pierceDir = tmp.v3a.copy(dir);
    pierceDir.y -= cfg.pierceTiltDown;
    if (pierceDir.lengthSq() < 1e-6) pierceDir.set(1, 0, 0);
    else pierceDir.normalize();

    const baseOrder = targetObj?.mesh?.renderOrder ?? 0;
    front.traverse((o) => {
      if (o.isMesh || o.isSprite) o.renderOrder = baseOrder + 1;
    });
    back.traverse((o) => {
      if (o.isMesh || o.isSprite) o.renderOrder = baseOrder - 1;
    });

    front.position.copy(impactPos);
    alignSwordToDir(front, pierceDir);

    const backLen = fullLen * backRatio;
    back.position.copy(impactPos).addScaledVector(pierceDir, -backLen);
    alignSwordToDir(back, pierceDir);

    setSwordOpacity(front, 1);
    setSwordOpacity(back, 1);

    pierceState = {
      front,
      back,
      t: 0,
      hold: Math.max(0, cfg.pierceHoldSec),
      fade: Math.max(0.05, cfg.pierceFadeSec),
    };
  }

  function reset() {
    t = 0;
    phase = "gather";
    active = true;
    swordAimReady = false;
    getRallyPoint(rallyPoint);
    const activeCount = Math.min(cfg.dragonCount, dragons.length);
    const facing = getFacing();

    if (swordMesh) {
      swordMesh.visible = false;
    }

    for (let i = 0; i < dragons.length; i += 1) {
      const d = dragons[i];
      if (!d.baseOffset) d.baseOffset = new THREE.Vector3();
      if (d.radiusScale == null) d.radiusScale = 1;
      const activeDragon = i < activeCount;
      if (activeDragon) {
        const low = i % 3 === 0;
        const front = i % 2 === 0;
        const offsetX = (front ? facing : (Math.random() - 0.5)) * (3 + Math.random() * 4);
        const offsetY = low ? (-8 + Math.random() * 2) : (-1 + Math.random() * 2);
        const offsetZ = (Math.random() - 0.5) * 6;
        d.baseOffset.set(offsetX, offsetY, offsetZ);
        d.radiusScale = low ? 0.55 : 1.0;
        d.phase = (Math.PI * 2 * i) / Math.max(1, activeCount) + Math.random() * 0.6;
      }
      for (const seg of d.segments) {
        seg.sprite.visible = activeDragon;
        if (activeDragon) {
          seg.sprite.material.opacity = 0;
          seg.sprite.scale.set(cfg.segmentSize, cfg.segmentSize, 1);
        }
      }
    }
  }

  function launchSword() {
    const sword = ensureSword();
    if (!sword) {
      stop();
      return;
    }

    const start = getSwordAnchor(tmp.v3c).clone();
    const end = getTargetPoint(tmp.v3a).clone();
    end.y += cfg.pierceOffsetY;
    shootDir.copy(end).sub(start);
    shootDist = shootDir.length();
    if (shootDist < 1e-3) {
      shootDir.set(1, 0, 0);
      shootDist = 1;
    } else {
      shootDir.normalize();
    }

    sword.visible = true;
    sword.position.copy(start);
    aimSwordAt(end, start);
    applySwordScale(1);

    const tipLenRaw = getSwordLength(sword);
    const maxTipOffset = Math.max(0, shootDist - 0.05);
    const tipOffset = Math.min(
      Math.max(0, tipLenRaw * (cfg.tipContactRatio ?? 0.9)),
      maxTipOffset
    );
    const contactBase = end.clone().addScaledVector(shootDir, -tipOffset);
    const passThrough = Math.max(1.2, tipLenRaw * 0.6);
    const finalEnd = start.clone().addScaledVector(shootDir, shootDist + passThrough);
    const totalDist = Math.max(0.001, start.distanceTo(finalEnd));
    const contactDist = Math.max(0, start.distanceTo(contactBase));
    const burstAt = Math.min(0.98, Math.max(0.02, contactDist / totalDist));

    swordInFlight = true;
    vfx.projectiles.push({
      mesh: sword,
      t: 0,
      travel: Math.max(0.12, cfg.shootSec),
      start: start.clone(),
      end: finalEnd,
      wobble: 0,
      arc: 0,
      burstScale: cfg.hitBurstScale,
      burstColor: colorHex,
      burstPos: end.clone(),
      burstAt,
      onContact: () => {
        const impact = end.clone();
        startPierce(impact, shootDir, target);
        if (typeof hitCallback === "function") hitCallback();
        impactState = {
          t: 0,
          delay: Math.max(0, cfg.pierceImpactDelay),
          pos: getTargetMid(tmp.v3d).clone(),
        };
      },
      onHit: () => {
        swordInFlight = false;
        swordMesh = null;
      },
    });

    phase = "idle";
    active = false;
  }

  function play({ playerObject: p, targetObject: tgt, targetGetter, color, options: opts, onHit } = {}) {
    setActors(p, tgt, targetGetter, color);
    if (opts) setOptions(opts);
    hitCallback = typeof onHit === "function" ? onHit : null;
    reset();
  }

  function update(dt) {
    if (pierceState) {
      pierceState.t += dt;
      if (pierceState.t > pierceState.hold) {
        const fadeT = (pierceState.t - pierceState.hold) / pierceState.fade;
        const k = Math.max(0, 1 - Math.min(1, fadeT));
        setSwordOpacity(pierceState.front, k);
        setSwordOpacity(pierceState.back, k);
        if (fadeT >= 1) {
          clearPierce();
        }
      }
    }

    if (impactState) {
      impactState.t += dt;
      if (impactState.t >= impactState.delay) {
        triggerImpact(impactState.pos);
        impactState = null;
      }
    }

    if (!active) return;
    t += dt;
    getRallyPoint(rallyPoint);

    if (phase === "gather") {
      const progress = Math.min(1, t / Math.max(0.001, cfg.gatherSec));
      const globalOpacity = Math.min(1, t * 2.0) * cfg.letterOpacity;

      const appearAt = Math.min(0.95, Math.max(0.05, cfg.swordAppearAt ?? 0.35));
      const appearSpan = Math.max(0.05, 1 - appearAt);
      const grow = Math.max(0, (progress - appearAt) / appearSpan);
      const growEase = 1 - Math.pow(1 - Math.min(1, grow), 3);
      const collapseEase = 1 - Math.pow(1 - growEase, 2);
      const dragonFade = 1 - collapseEase;
      const dragonScale = 1 - collapseEase;
      const collapseAnchor = collapseEase > 0.001 ? getSwordAnchor(tmp.v3e) : null;
      if (grow > 0.01) {
        const sword = ensureSword();
        if (sword) {
          sword.visible = true;
          sword.position.copy(getSwordAnchor(tmp.v3d));
          const aimDir = getSmoothedAimDir(
            sword.position,
            getTargetPoint(tmp.v3b),
            dt
          );
          alignSwordToDir(sword, aimDir);
          if (cfg.swordShakeAmp > 0.001 || cfg.swordShakeRot > 0.001) {
            const ramp = 0.4 + 0.6 * growEase;
            const wobbleT = t * Math.max(0.1, cfg.swordShakeFreq);
            const shakeA = cfg.swordShakeAmp * ramp;
            const sx = Math.sin(wobbleT * 6.2 + 1.7) * shakeA;
            const sy = Math.cos(wobbleT * 5.1 + 0.6) * shakeA * 0.7;
            const sz = Math.sin(wobbleT * 4.4 + 2.3) * shakeA * 0.5;
            sword.position.x += sx;
            sword.position.y += sy;
            sword.position.z += sz;
            if (cfg.swordShakeRot > 0.001) {
              const rot = Math.sin(wobbleT * 7.3) * cfg.swordShakeRot * ramp;
              sword.rotateZ(rot);
            }
          }
          applySwordScale(0.15 + 0.25 * growEase);
          tintSword(sword, colorHex);
        }
      }

      const activeCount = Math.min(cfg.dragonCount, dragons.length);
      for (let di = 0; di < activeCount; di += 1) {
        const d = dragons[di];
        for (const seg of d.segments) {
          const idx = seg.index;
          const timeOffset = (t * cfg.waveSpeed) - (idx * 0.08 * cfg.segmentGap) + d.phase;
          const radius = cfg.spreadRadius * (d.radiusScale ?? 1);

          const x = Math.sin(timeOffset) * radius;
          const y = Math.cos(timeOffset * 2.1) * (radius * 0.4) + Math.cos(timeOffset * 5.0) * 2.0;
          const z = Math.sin(timeOffset * 1.4) * (radius * 1.2);

          tmp.v3a.set(x, y, z).add(rallyPoint).add(d.baseOffset ?? tmp.v3b.set(0, 0, 0));
          if (collapseAnchor) {
            seg.sprite.position.lerpVectors(tmp.v3a, collapseAnchor, collapseEase);
          } else {
            seg.sprite.position.copy(tmp.v3a);
          }

          const rotZ = Math.cos(timeOffset) * 0.5;
          seg.sprite.material.rotation = rotZ;

          const baseSize = Math.max(0.6, cfg.segmentSize * (1 - idx / (cfg.segmentsPerDragon * 1.5)));
          const size = Math.max(0.02, baseSize * dragonScale);
          seg.sprite.scale.set(size, size, 1);
          const opacity = globalOpacity * dragonFade;
          seg.sprite.material.opacity = opacity;
          seg.sprite.visible = opacity > 0.02;
        }
      }

      if (progress >= 1) {
        for (const d of dragons) {
          for (const seg of d.segments) seg.sprite.visible = false;
        }
        launchSword();
      }
      return;
    }
  }

  function stop() {
    active = false;
    phase = "idle";
    for (const d of dragons) {
      for (const seg of d.segments) seg.sprite.visible = false;
    }
    if (swordMesh && swordMesh.parent) {
      swordMesh.visible = false;
      if (!swordInFlight) scene.remove(swordMesh);
    }
    if (!swordInFlight) swordMesh = null;
  }

  function dispose() {
    for (const d of dragons) {
      for (const seg of d.segments) {
        seg.sprite.material.dispose?.();
        group.remove(seg.sprite);
      }
    }
    if (swordMesh && swordMesh.parent) scene.remove(swordMesh);
    scene.remove(group);
    tex.dispose?.();
  }

  return { play, update, stop, dispose, setActors, setOptions };
}
