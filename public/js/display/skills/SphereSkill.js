// public/js/display/skills/SphereSkill.js
import { BaseSkill } from "./BaseSkill.js";

export class SphereSkill extends BaseSkill {
  cast(ctx, attacker){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    if (!this._prep(ctx, attacker)) return;

    const col = combat.getColor(attacker);
    const durSec = this.def.meta?.durSec ?? 1.5;
    const parrySec = this.def.meta?.parrySec ?? 0.25;

    combat.setLastSkill(attacker, "Hộ Thân Kiếm Cầu");
    hud.setBanner(`🔮 Player ${attacker+1}: Hộ Thân Kiếm Cầu`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      const now = performance.now();
      combat.players[attacker].effect.sphereUntil = now + durSec * 1000;
      combat.players[attacker].effect.parryUntil  = now + parrySec * 1000;
      vfx.spawnShield(fighters[attacker], col, "SPHERE", attacker);
    });
  }
}
