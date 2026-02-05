// @ts-nocheck
// public/js/display/vfx/VFXManager.js
import { clamp } from "../utils";
import { spawnBurstAt, spawnLightRays, spawnMagicCircle, spawnShockwave, spawnSlash, spawnSparks } from "./modules/spawn";
import { spawnProjectileBezier, spawnProjectileToTarget, spawnDelayedProjectileToTarget, spawnFireDragon } from "./modules/projectiles";
import { startGiantCharge, stopGiantCharge, giantAddRing, fireGiantFromStackedRings, fireGiantFromRingCharge } from "./modules/giantCharge";
import { spawnShield } from "./modules/shields";
import { playVankiemUlt } from "./modules/ult";
import { createFanVNTextSwordEffect } from "./modules/fanTextSword";
import { updateVfx } from "./modules/update";

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
    this.rays = [];

    this.ultSwarms = [];
    this.vortexes = [];
    this.magicCircles = [];
    this.fanSwarms = [];
    this._fanAssets = null;
    this._fanTextEffect = null;
    this._fanTextEffects = new Map();

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

    this._pool = {
      slashes: [],
      bursts: [],
      shockwaves: [],
      sparks: new Map(),
      max: {
        slashes: 80,
        bursts: 80,
        shockwaves: 80,
        sparks: 24,
        rays: 120,
      }
    };

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
    return spawnSlash(this, pos, colorHex, yRot);
  }

  spawnShockwave(pos, colorHex, start=2.0, end=18.0, life=0.28){
    return spawnShockwave(this, pos, colorHex, start, end, life);
  }

  spawnSparks(pos, colorHex, count=16, life=0.22, speed=14){
    return spawnSparks(this, pos, colorHex, count, life, speed);
  }

  spawnBurstAt(pos, colorHex, scale=1){
    return spawnBurstAt(this, pos, colorHex, scale);
  }

  spawnLightRays(pos, colorHex, count=10, length=12, life=0.28, speed=18, width=0.5, explodeScale=1.6, explodeYOffset=0.8, downBias=0){
    return spawnLightRays(this, pos, colorHex, count, length, life, speed, width, explodeScale, explodeYOffset, downBias);
  }

  // ===== magic circle (ULT đẹp hơn) =====
  spawnMagicCircle(pos, colorHex, scale=1, life=0.80, rotSpeed=2.2){
    return spawnMagicCircle(this, pos, colorHex, scale, life, rotSpeed);
  }

  // ===== fire dragon projectile =====
  spawnFireDragon({
    from,
    to,
    colorHex,
    speed = 120,
    arc = 9.0,
    segments = 12,
    segmentGap = 0.06,
    swayAmp = 1.6,
    swayFreq = 6.5,
    onHit = null
  }){
    return spawnFireDragon(this, {
      from,
      to,
      colorHex,
      speed,
      arc,
      segments,
      segmentGap,
      swayAmp,
      swayFreq,
      onHit,
    });
  }

  // ===== core fix: align sword length (Y-axis) to direction =====
  _alignMeshYToDir(mesh, dirNorm){
    const q = this._tmp.q;
    q.setFromUnitVectors(this._tmp.yAxis, dirNorm);
    mesh.quaternion.copy(q);
  }

  // ===== delayed spawn wrapper (không dùng setTimeout cho từng kiếm) =====
  _spawnDelayedProjectileToTarget(from, to, colorHex, speed, wobble, arc, delaySec, onHit){
    return spawnDelayedProjectileToTarget(this, from, to, colorHex, speed, wobble, arc, delaySec, onHit);
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
    return spawnProjectileBezier(this, from, to, colorHex, speed, opts);
  }

  // ===== base projectile (thẳng / arc) =====
  spawnProjectileToTarget(from, to, colorHex, speed, wobble=0, arc=0, onHit=null){
    return spawnProjectileToTarget(this, from, to, colorHex, speed, wobble, arc, onHit);
  }

  // =========================================================
  // GIANT STACKED RINGS (CHARGE)
  // =========================================================

  // GIANT charge: tạo vòng chồng lên đầu mỗi 1s (tối đa 3 vòng)
  startGiantCharge(ownerFighter, colorHex, ownerIndex, opts = {}){
    return startGiantCharge(this, ownerFighter, colorHex, ownerIndex, opts);
  }

  stopGiantCharge(ownerIndex){
    return stopGiantCharge(this, ownerIndex);
  }

  _giantAddRing(ownerIndex){
    return giantAddRing(this, ownerIndex);
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
    return fireGiantFromStackedRings(this, { ownerIndex, getTargetPos, speed, arc, cadenceSec, onHit });
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
    return fireGiantFromRingCharge(this, { ownerIndex, getTargetPos, speed, arc, cadenceSec, maxShots, onHit });
  }

  // ===== Shield =====
  spawnShield(ownerFighter, colorHex, type, ownerIndex){
    return spawnShield(this, ownerFighter, colorHex, type, ownerIndex);
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
    singleLaunch = false,
    bigScale = 3.2,
    gatherRadiusStart = 12,
    gatherRadiusEnd = 6.5,
    gatherHeight = 11.0,
    bigChargeScale = 4.2,
    onHit = null
  }){
    return playVankiemUlt(this, {
      fromFighter,
      getTargetPos,
      colorHex,
      visualSwords,
      hits,
      orbitSec,
      launchSec,
      spread,
      arc,
      singleLaunch,
      bigScale,
      gatherRadiusStart,
      gatherRadiusEnd,
      gatherHeight,
      bigChargeScale,
      onHit,
    });
  }

  playFanTextSword({
    ownerIndex,
    fromFighter,
    targetFighter,
    getTargetPos,
    colorHex,
    options = {},
    onHit = null,
  }){
    const playerObj = fromFighter || fromFighter?.group;
    const targetObj = targetFighter || targetFighter?.group;
    if (typeof ownerIndex === "number") {
      const key = ownerIndex;
      let fx = this._fanTextEffects.get(key);
      if (!fx) {
        fx = createFanVNTextSwordEffect(this, playerObj, targetObj, options);
        this._fanTextEffects.set(key, fx);
      }
      fx.play({
        color: colorHex,
        playerObject: playerObj,
        targetObject: targetObj,
        targetGetter: getTargetPos || null,
        options,
        onHit,
      });
      return;
    }

    if (!this._fanTextEffect) {
      this._fanTextEffect = createFanVNTextSwordEffect(this, playerObj, targetObj, options);
    }
    this._fanTextEffect.play({
      color: colorHex,
      playerObject: playerObj,
      targetObject: targetObj,
      targetGetter: getTargetPos || null,
      options,
      onHit,
    });
  }

  _ensureFanAssets(count = 40){
    if (this._fanAssets) return this._fanAssets;
    const smallSwords = [];
    for (let i = 0; i < count; i += 1) {
      const s = this.swordFactory.createSwordProjectile(0xffffff);
      s.visible = false;
      s.scale.setScalar(0.75);
      this.scene.add(s);
      smallSwords.push(s);
    }
    const bigSword = this.swordFactory.createSwordProjectile(0xffffff);
    bigSword.visible = false;
    bigSword.scale.setScalar(0.1);
    this.scene.add(bigSword);
    this._fanAssets = { smallSwords, bigSword };
    return this._fanAssets;
  }

  update(dt, elapsedTime, fighters){
    if (this._fanTextEffect) {
      this._fanTextEffect.update(dt);
    }
    return updateVfx(this, dt, elapsedTime, fighters);
  }
}
