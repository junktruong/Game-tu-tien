import { SKILLS } from "../../../config";

export function shakaOnCast(ctx, event){
  const col = ctx.core.getColor(event.attacker);
  const meta = SKILLS.SHAKA.meta ?? {};

  const atk = ctx.fighters[event.attacker];
  const tgt = ctx.fighters[event.defender];
  const chargeSec1 = meta.ultChargeSec1 ?? 2.0;
  const chargeSec2 = meta.ultChargeSec2 ?? 2.0;
  const arc = meta.ultDragonArc ?? 9.5;
  const speed = meta.ultDragonSpeed ?? 120;
  const swayAmp = meta.ultDragonSwayAmp ?? 2.2;
  const swayFreq = meta.ultDragonSwayFreq ?? 8.0;
  const segments = meta.ultDragonSegments ?? 16;
  const segmentGap = meta.ultDragonSegmentGap ?? 0.055;
  const pierceAt = meta.ultDragonPierceAt ?? 0.78;
  const pierceTighten = meta.ultDragonPierceTighten ?? 0.35;
  const pierceStretch = meta.ultDragonPierceStretch ?? 0.55;
  const pierceSquash = meta.ultDragonPierceSquash ?? 0.28;

  if (typeof ctx.vfx.spawnMagicCircle === "function") {
    ctx.vfx.spawnMagicCircle(atk.getCorePos(0.6), col, 1.15, chargeSec1 + chargeSec2 + 0.6, 2.6);
    ctx.vfx.spawnMagicCircle(atk.getCorePos(11.2), col, 0.45, chargeSec1 + chargeSec2 + 0.4, 3.2);
  }

  const summonDragon = (idx: number) => {
    ctx.vfx.spawnBurstAt(atk.getCorePos(10.8), col, 1.8);
    if (typeof ctx.vfx.spawnShockwave === "function") {
      ctx.vfx.spawnShockwave(atk.getCorePos(0.6), col, 2.0, 26, 0.42);
      ctx.vfx.spawnShockwave(tgt.getCorePos(0.6), col, 1.6, 24, 0.42);
    }
    if (typeof ctx.vfx.spawnFireDragon === "function") {
      ctx.vfx.spawnFireDragon({
        from: atk.getCorePos(11.6),
        to: tgt.getCorePos(6.0),
        colorHex: col,
        speed,
        arc: arc + idx * 0.6,
        segments,
        segmentGap,
        swayAmp,
        swayFreq,
        pierceAt,
        pierceTighten,
        pierceStretch,
        pierceSquash,
        onHit: () => {},
      });
    }
  };

  ctx.scheduler.schedule(chargeSec1, () => summonDragon(0));
  ctx.scheduler.schedule(chargeSec1 + chargeSec2, () => summonDragon(1));
}
