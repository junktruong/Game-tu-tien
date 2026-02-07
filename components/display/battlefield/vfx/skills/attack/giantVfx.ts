import { SKILLS } from "../../../config";

export function giantOnCast(ctx: any, event: any) {
  const col = ctx.core.getColor(event.attacker);
  const fighter = ctx.fighters?.[event.attacker];
  const cadenceSec = SKILLS.GIANT.meta?.cadenceSec ?? 0.12;
  const fireDelay = Math.max(0.05, cadenceSec * 0.6);
  const animClip = "Sword_Regular_Combo";
  if (typeof ctx.vfx.fireGiantFromRingCharge === "function") {
    const fired = ctx.vfx.fireGiantFromRingCharge({
      ownerIndex: event.attacker,
      getTargetPos: () => ctx.fighters[event.defender].getCorePos(6.6),
      speed: SKILLS.GIANT.meta?.projectileSpeed ?? 90,
      arc: 1.6,
      cadenceSec,
      onHit: () => {},
    });
    if (fighter?.playClip && fired > 0) {
      const totalDuration = Math.max(cadenceSec, fired * cadenceSec);
      const slowDuration = Math.max(1.3, totalDuration * 1.5);
      ctx.scheduler.schedule(fireDelay, () => {
        if (fighter?.clearIdleHold) fighter.clearIdleHold();
        fighter.playClip(animClip, slowDuration);
      });
    }
    if (fired > 0) {
      return true;
    }
  }

  const from = ctx.fighters[event.attacker].getCorePos(6.2);
  const speed = SKILLS.GIANT.meta?.projectileSpeed ?? 150;
  const shots = SKILLS.GIANT.meta?.shots ?? 12;
  if (fighter?.playClip && shots > 0) {
    const totalDuration = Math.max(cadenceSec, shots * cadenceSec);
    const slowDuration = Math.max(1.3, totalDuration * 1.5);
    ctx.scheduler.schedule(fireDelay, () => {
      if (fighter?.clearIdleHold) fighter.clearIdleHold();
      fighter.playClip(animClip, slowDuration);
    });
  }

  for (let i = 0; i < shots; i += 1) {
    const spread = (i - (shots - 1) / 2) * 0.28;
    const to = ctx.fighters[event.defender].getCorePos(6.4).clone()
      .add(new window.THREE.Vector3(spread, 0.1 + Math.sin(i * 0.6) * 0.12, 0));
    const delay = i * (SKILLS.GIANT.meta?.cadenceSec ?? 0.12);
    if (typeof ctx.vfx._spawnDelayedProjectileToTarget === "function") {
      ctx.vfx._spawnDelayedProjectileToTarget(from, to, col, speed, 0.0, 2.2, delay, () => {});
    } else {
      ctx.vfx.spawnProjectileBezier(from, to, col, speed, {
        arc: 4.2,
        side: i % 2 === 0 ? -1 : 1,
        sideScale: 1.8,
        swirlAmp: 0.45,
        swirlFreq: 8.0,
        onHit: () => {},
      });
    }
  }
}
