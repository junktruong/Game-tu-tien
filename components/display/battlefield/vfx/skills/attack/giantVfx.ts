import { SKILLS } from "../../../config";

export function giantOnCast(ctx, event){
  const col = ctx.core.getColor(event.attacker);
  if (typeof ctx.vfx.fireGiantFromRingCharge === "function") {
    const fired = ctx.vfx.fireGiantFromRingCharge({
      ownerIndex: event.attacker,
      getTargetPos: () => ctx.fighters[event.defender].getCorePos(6.6),
      speed: SKILLS.GIANT.meta?.projectileSpeed ?? 90,
      arc: 1.6,
      cadenceSec: SKILLS.GIANT.meta?.cadenceSec ?? 0.12,
      onHit: () => {},
    });
    if (fired > 0) {
      return true;
    }
  }

  const from = ctx.fighters[event.attacker].getCorePos(6.2);
  const speed = SKILLS.GIANT.meta?.projectileSpeed ?? 150;
  const shots = SKILLS.GIANT.meta?.shots ?? 12;

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
