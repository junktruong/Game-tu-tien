import type { GameEvent } from "../../core/types";
import type { RenderContext, RenderHandler } from "../types";

export class HitRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_HIT") return false;
    if (event.skillId === "PARRY") return false;

    const col = ctx.core.getColor(event.attacker);
    const hitPos = ctx.fighters[event.defender].getCorePos(9.4);

    if (event.skillId === "GIANT") {
      const index = event.index ?? 0;
      const count = Math.max(1, event.count ?? 1);
      const impactPos = ctx.fighters[event.defender].getCorePos(6.7);
      impactPos.x += Math.sin(index * 1.73) * 0.35;
      impactPos.y += 0.45 + Math.sin(index * 0.61) * 0.5;
      impactPos.z += Math.cos(index * 1.19) * 0.35;

      ctx.fighters[event.defender].setHitFlash(event.heavy ? 185 : 105);
      ctx.fighters[event.defender].playHit(event.heavy, event.skillId);

      if (typeof ctx.vfx.spawnSparks === "function") {
        ctx.vfx.spawnSparks(impactPos.clone(), col, event.heavy ? 9 : 5, 0.12, 7);
      }
      if (event.heavy || index % 4 === 0 || index === count - 1) {
        ctx.vfx.spawnSlash(
          impactPos.clone(),
          col,
          (event.defender === 0 ? -1 : 1) * 0.24,
        );
      }
      return false;
    }

    if (event.skillId === "ULT") {
      ctx.fighters[event.defender].setHitFlash(event.heavy ? 220 : 150);
      ctx.fighters[event.defender].playHit(event.heavy, event.skillId);
      if (event.heavy) {
        const away = event.defender === 0 ? -1 : 1;
        ctx.vfx.spawnSlash(hitPos.clone().add(new window.THREE.Vector3(away * 0.6, 0, 0)), col, away * 0.35);
        if (typeof ctx.vfx.spawnSparks === "function") {
          ctx.vfx.spawnSparks(hitPos.clone(), col, 10, 0.16, 10);
        }
      }
      return false;
    }

    ctx.fighters[event.defender].setHitFlash(event.heavy ? 260 : 170);
    ctx.fighters[event.defender].playHit(event.heavy, event.skillId);
    ctx.vfx.spawnBurstAt(hitPos, col, event.heavy ? 1.25 : 0.95);
    const away = event.defender === 0 ? -1 : 1;
    ctx.vfx.spawnSlash(hitPos.clone().add(new window.THREE.Vector3(away * 0.8, 0, 0)), col, away * 0.35);

    return false;
  }
}
