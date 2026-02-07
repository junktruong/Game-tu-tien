import { SKILLS } from "../../../config";

export function fanOnCast(ctx, event){
  console.log("FAN play")
  const col = ctx.core.getColor(event.attacker);
  const gatherSec = SKILLS.FAN.meta?.orbitSec ?? 4.0;
  const shootSec = SKILLS.FAN.meta?.hitDelaySec ?? 0.6;
  const aimSec = 0.15;
  const holdSec = gatherSec + aimSec;
  const fighter = ctx.fighters?.[event.attacker];
  if (fighter) {
    if (fighter.setIdleHold) {
      fighter.setIdleHold("Meditate", holdSec);
    }
    if (fighter.playLoopClip) {
      fighter.playLoopClip("Meditate");
    }
    ctx.scheduler.schedule(Math.max(0, holdSec), () => {
      if (fighter.clearIdleHold) fighter.clearIdleHold();
      if (fighter.playClip) fighter.playClip("Throw Object", Math.max(0.2, shootSec));
    });
  }
  if (typeof ctx.vfx.playFanTextSword === "function") {
    ctx.vfx.playFanTextSword({
      ownerIndex: event.attacker,
      fromFighter: ctx.fighters[event.attacker],
      targetFighter: ctx.fighters[event.defender],
      colorHex: col,
      options: {
        dragonCount: 12,
        segmentsPerDragon: 30,
        segmentSize: 2.5,
        segmentGap: 1.5,
        letterOpacity: 0.6,
        gatherSec,
        shootSec,
        headHeight: 10.0,
        spreadRadius: 16.0,
        waveSpeed: 0.7,
        swordLength: 6.0,
        swordWidth: 5.0,
        swordThickness: 0.45,
        swordGlowOpacity: 0.12,
        swordTrailOpacity: 0.06,
        hitBurstScale: 1.25,
        pierceHoldSec: 0.32,
        pierceFadeSec: 0.32,
        pierceFrontRatio: 0.52,
        pierceOffsetY: -1.2,
        pierceTiltDown: 1.4,
        tipContactRatio: 1.0,
        pierceRayCount: 36,
        pierceRayLength: 19,
        pierceRayLife: 0.5,
        pierceRaySpeed: 22,
        pierceRayWidth: 1.0,
        pierceRayExplodeScale: 2.2,
        pierceRayExplodeYOffset: 1.8,
        pierceRayDownBias: 4.8,
        pierceImpactDelay: 0,
        pierceBurstScale: 0.9,
        pierceLiftHeight: 8.2,
        pierceLiftDur: 1.1,
        swordAppearAt: 0.3,
        swordTiltDown: 2.4,
        swordRollDeg: 20,
        swordBackOffset: -20,
        swordUpOffset: 5.0,
        swordShakeAmp: 0.1,
        swordShakeFreq: 12.0,
        swordShakeRot: 0.01,
      },
    });
    return true;
  }

  const orbitSec = SKILLS.FAN.meta?.orbitSec ?? 2.0;
  const orbitSteps = Math.max(10, Math.floor(orbitSec / 0.08));
  const head = ctx.fighters[event.attacker].getCorePos(11.0);

  for (let i = 0; i < orbitSteps; i += 1) {
    ctx.scheduler.schedule(i * (orbitSec / orbitSteps), () => {
      const a = (i / orbitSteps) * Math.PI * 2 * 2.0 * (event.attacker === 0 ? 1 : -1);
      const r = 8.5 - (i / orbitSteps) * 3.0;
      const p = head.clone().add(new window.THREE.Vector3(Math.cos(a) * r, Math.sin(a * 0.7) * 1.2, 0));
      ctx.vfx.spawnSlash(p, col, a);
      ctx.vfx.spawnBurstAt(p, col, 0.45);
    });
  }
  return true;
}

export function fanOnHit(ctx, event){
  const col = ctx.core.getColor(event.attacker);
  const hitPos = ctx.fighters[event.defender].getCorePos(9.4);
  const hp = hitPos.clone().add(new window.THREE.Vector3((event.defender === 0 ? -1 : 1) * 0.6, 0.0, 0));
  ctx.vfx.spawnSlash(hp, col, Math.random() * 0.8);
}
