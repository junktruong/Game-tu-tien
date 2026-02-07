import { SKILLS } from "../../../config";

export function spinOnCast(ctx: any, event: any) {
  const col = ctx.core.getColor(event.attacker);
  ctx.vfx.spawnBurstAt(ctx.fighters[event.attacker].getCorePos(9.6), col, 1.1);
  if (typeof ctx.vfx.spawnShockwave === "function") {
    const g = ctx.fighters[event.attacker].getCorePos(0.6);
    g.y = 0.6;
    ctx.vfx.spawnShockwave(g, col, 1.6, 20, 0.32);
  }
  if (typeof ctx.vfx.playVortexSwords === "function") {
    const startPos = ctx.fighters[event.attacker].getMuzzlePos();
    const endPos = ctx.fighters[event.defender].getCorePos(9.2);
    ctx.vfx.playVortexSwords({
      startPos,
      endPos,
      colorHex: col,
      durationSec: SKILLS.SPIN.meta?.durationSec ?? 0.85,
      count: Math.max(30, Math.floor((SKILLS.SPIN.meta?.swordPerTick ?? 14) * 3)),
      radius: SKILLS.SPIN.meta?.radius ?? 5.6,
      spinSpeed: (event.attacker === 0 ? 1 : -1) * (SKILLS.SPIN.meta?.spinSpeed ?? 10.5),
      arc: SKILLS.SPIN.meta?.arc ?? 1.0,
      wobble: SKILLS.SPIN.meta?.wobble ?? 0.9,
    });
  }
}

export function spinOnHit(ctx: any, event: any) {
  const col = ctx.core.getColor(event.attacker);
  const hitPos = ctx.fighters[event.defender].getCorePos(9.4);
  if (typeof ctx.vfx.spawnShockwave === "function") {
    const gg = hitPos.clone();
    gg.y = 0.6;
    ctx.vfx.spawnShockwave(gg, col, 1.2, 16, 0.26);
  }
}
